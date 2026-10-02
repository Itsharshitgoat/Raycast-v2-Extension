import { environment, AI, getPreferenceValues } from "@raycast/api";
import { execFile, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export interface AIStickerMetadata {
  name: string;
  tags: string[];
  keywords: string[];
}

/**
 * Compiles the analyze.swift script into a binary in the support directory (if not already compiled).
 */
async function getAnalyzerBinary(): Promise<string> {
  const binaryPath = path.join(environment.supportPath, "analyze_vision");
  const swiftSourcePath = path.join(environment.assetsPath, "analyze.swift");
  const moduleCachePath = path.join(environment.supportPath, "ModuleCache");

  // Check if binary already exists and is up-to-date
  try {
    const [binaryStat, sourceStat] = await Promise.all([
      fs.promises.stat(binaryPath),
      fs.promises.stat(swiftSourcePath),
    ]);
    // Recompile if source is newer than binary
    if (sourceStat.mtimeMs <= binaryStat.mtimeMs) {
      return binaryPath;
    }
  } catch {
    // Binary doesn't exist, will compile below
  }

  await fs.promises.mkdir(moduleCachePath, { recursive: true });
  await execAsync(
    `swiftc -module-cache-path "${moduleCachePath}" "${swiftSourcePath}" -o "${binaryPath}"`,
  );
  return binaryPath;
}

/**
 * Runs the Apple Vision framework on the image to extract tags and text.
 */
async function extractVisionData(
  imagePath: string,
): Promise<{ tags: string[]; text: string }> {
  try {
    const binaryPath = await getAnalyzerBinary();
    const { stdout } = await execFileAsync(binaryPath, [imagePath]);
    const result = JSON.parse(stdout);

    if (result.error) {
      throw new Error(result.error);
    }

    return {
      tags: result.tags || [],
      text: result.text || "",
    };
  } catch (error) {
    console.error("Vision Analysis failed:", error);
    // Return empty data rather than failing completely
    return { tags: [], text: "" };
  }
}

/**
 * Analyzes a sticker using Apple Vision and Raycast AI to auto-generate metadata.
 * @param imagePath Absolute path to the saved image file
 * @returns AI-generated name, tags, and keywords
 */
export async function analyzeStickerWithAI(
  imagePath: string,
): Promise<AIStickerMetadata> {
  // Always run Apple Vision to get OCR text — this is fast and local
  const visionData = await extractVisionData(imagePath);

  // Extract individual words from OCR text for search
  const ocrWords = visionData.text
    ? visionData.text
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
        .filter((w) => w.length > 1)
    : [];

  // 1. Try local Ollama (prioritized as requested)
  const ollamaResult = await analyzeWithOllama(visionData);
  if (ollamaResult) {
    return ollamaResult;
  }

  // 2. Prompt Raycast AI (Fallback)
  const prompt = `
You are a highly creative and humorous assistant that auto-tags meme and reaction stickers for search.
I ran an Apple Vision model on a sticker image.

Here are the visual concepts detected: [${visionData.tags.join(", ")}]
Here is the text extracted via OCR: "${visionData.text}"

Based on this information, generate:
1. A short, catchy, and funny name for the sticker (max 3-5 words). You can creatively use Hinglish (Hindi + English) or English for the name to make it relatable and easy to find (e.g., "bhai kya kar raha hai", "samajh nahi aaya", "bruh moment").
2. 15 to 20 search tags. Think outside the box! Provide multiple varieties of creative and funny tags. Cover ALL of these dimensions:
   - Literal objects/people (e.g. cat, dog, person, hat, glasses)
   - Funny interpretations and emotions (e.g. ded, crying inside, savage, confused unga bunga)
   - Actions and vibe (e.g. judging you, laughing out loud, weird flex)
   - Hinglish/Desi slang context if applicable (e.g. desi, jugaad, mast, bakwas)
   - Context and use-case (e.g. reaction, sarcasm, wholesome, roasted)
3. 5 to 8 relevant emojis (as strings).

Return EXACTLY a valid JSON object with this schema:
{
  "name": "string",
  "tags": ["string"],
  "keywords": ["string"]
}
Do not return any markdown formatting, only the JSON.`;

  try {
    // Requires Raycast Pro
    const aiResponse = await AI.ask(prompt, { creativity: 1.0 });

    // Clean up potential markdown blocks (e.g. ```json ... ```)
    const cleanedJson = aiResponse
      .replace(/^```json/m, "")
      .replace(/^```/m, "")
      .trim();
    const result = JSON.parse(cleanedJson) as AIStickerMetadata;

    // Validate output
    if (!result.name) result.name = "Unknown Sticker";
    if (!Array.isArray(result.tags)) result.tags = ["sticker"];
    if (!Array.isArray(result.keywords)) result.keywords = [];

    // Merge OCR text into tags
    result.tags.push(...ocrWords.filter((w) => !result.tags.includes(w)));

    return result;
  } catch (error) {
    console.error("Raycast AI failed:", error);
    // Fallback if AI fails or user doesn't have Raycast Pro
    let fallbackName = "New Sticker";
    if (visionData.text) {
      fallbackName = visionData.text.slice(0, 30);
    } else if (visionData.tags.length > 0) {
      fallbackName = visionData.tags[0];
      fallbackName =
        fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    }

    return {
      name: fallbackName,
      tags: [
        ...visionData.tags.slice(0, 20),
        ...ocrWords.filter((w) => !visionData.tags.includes(w)),
      ],
      keywords: [],
    };
  }
}

async function analyzeWithOllama(visionData: {
  tags: string[];
  text: string;
}): Promise<AIStickerMetadata | null> {
  const prefs = getPreferenceValues<{
    useOllama?: boolean;
    ollamaModel?: string;
  }>();

  // We try Ollama if useOllama is true, or if they have a model set to the requested one
  const model = prefs.ollamaModel || "gemma4:31b-cloud";

  try {
    const systemPrompt = `You are a highly creative and humorous data-extraction assistant. Your sole purpose is to output valid JSON. 
You will receive visual concepts and OCR text from an image. You must interpret the context of the image deeply. Think about the vibe, emotions (e.g., funny, savage, weird), and any underlying meme/reaction context based on the data provided.

You must return exactly a valid JSON object with the following structure, and absolutely nothing else:
{
  "name": "A catchy, funny name using Hinglish or English (e.g., 'kya kar raha hai', 'bruh')",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "keywords": ["emoji1", "emoji2", "emoji3"]
}

Rules:
- NEVER output conversational text like "Here is the JSON" or "Sure!".
- ONLY output the raw JSON object.
- "tags" must be an array of strings containing exactly the tags you generate. You MUST include multiple varieties of creative and funny tags, including Hinglish/Desi slang (if applicable), interpretations (e.g., 'ded', 'crying inside'), and literal objects. Be exhaustive (15-20 tags) and think outside the box!
- "keywords" must be an array of emoji strings matching the emotion/vibe.`;

    const prompt = `Visual concepts detected: [${visionData.tags.join(", ")}]
Text extracted via OCR: "${visionData.text}"

Generate the JSON object for this sticker.`;

    const payload = JSON.stringify({
      model: model,
      system: systemPrompt,
      prompt: prompt,
      stream: false,
      format: "json",
    });

    // Write payload to a temp file to avoid shell escaping issues
    const tmpPayloadPath = path.join(
      environment.supportPath,
      "ollama_payload.json",
    );
    await fs.promises.writeFile(tmpPayloadPath, payload);

    const { stdout } = await execAsync(
      `curl -s -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d @"${tmpPayloadPath}"`,
      { maxBuffer: 10 * 1024 * 1024, timeout: 120000 },
    );

    // Clean up temp file
    fs.promises.unlink(tmpPayloadPath).catch(() => {});

    const jsonResponse = JSON.parse(stdout) as { response: string };

    if (!jsonResponse || !jsonResponse.response) {
      throw new Error("Invalid response from Ollama");
    }

    let cleanedJson = jsonResponse.response.trim();
    const match = cleanedJson.match(/\{[\s\S]*\}/);
    if (match) {
      cleanedJson = match[0];
    }

    const parsed = JSON.parse(cleanedJson) as any;

    const result: AIStickerMetadata = {
      name:
        parsed.name && typeof parsed.name === "string"
          ? parsed.name
          : "Unknown Sticker",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
        : typeof parsed.tags === "string"
          ? parsed.tags.split(",").map((t: string) => t.trim())
          : ["sticker"],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };

    return result;
  } catch (error) {
    console.error("Ollama analysis failed:", error);
    return null;
  }
}
