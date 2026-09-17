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

  // 1. Try local Ollama if configured
  const ollamaResult = await analyzeWithOllama(imagePath);
  if (ollamaResult) {
    // Merge OCR text into Ollama's result
    if (visionData.text) {
      ollamaResult.tags.push(
        ...ocrWords.filter((w) => !ollamaResult.tags.includes(w)),
      );
    }
    return ollamaResult;
  }

  // 2. Prompt Raycast AI
  const prompt = `
You are a highly capable assistant that auto-tags meme and reaction stickers for search.
I ran an Apple Vision model on a sticker image.

Here are the visual concepts detected: [${visionData.tags.join(", ")}]
Here is the text extracted via OCR: "${visionData.text}"

Based on this information, generate:
1. A short, catchy name for the sticker (max 3 words). If there's prominent text, use it as the name. Otherwise, describe the vibe/subject.
2. 15 to 20 search tags. Be EXHAUSTIVE. Cover ALL of these dimensions:
   - What objects/animals/people are in the image (e.g. cat, dog, person, hat, glasses, sunglasses)
   - Emotions and expressions (e.g. angry, happy, sad, cool, shocked, confused, smug)
   - Actions (e.g. laughing, crying, dancing, sleeping, staring, pointing, holding)
   - Style (e.g. cartoon, anime, pixel, realistic, meme, sticker, drawing)
   - Colors (e.g. red, blue, yellow, colorful, dark)
   - Context and vibe (e.g. reaction, funny, sarcastic, wholesome, savage, relatable)
   - Accessories or props (e.g. glasses, sunglasses, hat, crown, coffee, phone)
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

async function analyzeWithOllama(
  imagePath: string,
): Promise<AIStickerMetadata | null> {
  const prefs = getPreferenceValues<{
    useOllama?: boolean;
    ollamaModel?: string;
  }>();
  if (!prefs.useOllama || !prefs.ollamaModel) return null;

  try {
    const base64Image = await fs.promises.readFile(imagePath, {
      encoding: "base64",
    });

    const prompt = `You are a highly capable assistant that auto-tags meme and reaction stickers for search.
Analyze this image and generate:
1. A short, catchy name for the sticker (max 3 words). If there's prominent text, use it as the name. Otherwise, describe the vibe/subject.
2. 15 to 20 search tags. Be EXHAUSTIVE. Cover ALL of these dimensions:
   - What objects/animals/people are in the image (e.g. cat, dog, person, hat, glasses, sunglasses)
   - Emotions and expressions (e.g. angry, happy, sad, cool, shocked, confused, smug)
   - Actions (e.g. laughing, crying, dancing, sleeping, staring, pointing, holding)
   - Style (e.g. cartoon, anime, pixel, realistic, meme, sticker, drawing)
   - Colors (e.g. red, blue, yellow, colorful, dark)
   - Context and vibe (e.g. reaction, funny, sarcastic, wholesome, savage, relatable)
   - Accessories or props (e.g. glasses, sunglasses, hat, crown, coffee, phone)
3. 5 to 8 relevant emojis (as strings).

Return EXACTLY a valid JSON object with this schema:
{
  "name": "string",
  "tags": ["string"],
  "keywords": ["string"]
}
Do not return any markdown formatting, only the JSON.`;

    const payload = JSON.stringify({
      model: prefs.ollamaModel,
      prompt: prompt,
      stream: false,
      images: [base64Image],
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
    const cleanedJson = jsonResponse.response
      .replace(/^```json/m, "")
      .replace(/^```/m, "")
      .trim();
    const result = JSON.parse(cleanedJson) as AIStickerMetadata;

    if (!result.name) result.name = "Unknown Sticker";
    if (!Array.isArray(result.tags)) result.tags = ["sticker"];
    if (!Array.isArray(result.keywords)) result.keywords = [];

    return result;
  } catch (error) {
    console.error("Ollama vision analysis failed:", error);
    return null;
  }
}
