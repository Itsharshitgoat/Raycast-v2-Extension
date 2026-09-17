import { Clipboard, environment } from "@raycast/api";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import {
  insertSticker,
  addTagsToSticker,
  setKeywords,
  checkDuplicate,
  initDatabase,
  StickerRecord,
} from "./db";
import {
  saveImage,
  computeFileHash,
  detectFormat,
  getImageDimensions,
  getImagePath,
} from "./file-system";
import { analyzeStickerWithAI } from "./ai";

const execFileAsync = promisify(execFile);

export interface ImportOptions {
  packId?: string | null;
}

export interface ImportResult {
  stickerId: string;
  isDuplicate: boolean;
  existingSticker?: StickerRecord;
}

/**
 * Imports a sticker from the clipboard.
 * @param options Import options
 * @returns The import result
 */
export async function importFromClipboard(
  options: ImportOptions,
): Promise<ImportResult> {
  const content = await Clipboard.read();
  let buffer: Buffer;

  if (content.file) {
    const filePath = content.file.startsWith("file://")
      ? fileURLToPath(content.file)
      : content.file;
    buffer = await fs.promises.readFile(filePath);
  } else if (content.text && content.text.startsWith("http")) {
    return importFromUrl(content.text, options);
  } else {
    throw new Error("No image found on clipboard");
  }

  return processAndSave(buffer, "clipboard", options);
}

/**
 * Imports a sticker from a given URL using curl for reliable downloads.
 * @param url The URL of the image
 * @param options Import options
 * @returns The import result
 */
export async function importFromUrl(
  url: string,
  options: ImportOptions,
): Promise<ImportResult> {
  // Download to a temp file using curl (reliable, follows redirects, handles all URLs)
  const tmpPath = path.join(
    environment.supportPath,
    `dl_${crypto.randomUUID()}`,
  );

  try {
    await execFileAsync("/usr/bin/curl", [
      "-sL", // silent + follow redirects
      "-o",
      tmpPath, // output to temp file
      "--max-time",
      "30", // 30 second timeout
      "-H",
      "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      url,
    ]);

    const buffer = await fs.promises.readFile(tmpPath);

    if (buffer.length === 0) {
      throw new Error("Downloaded file is empty — the URL may be invalid");
    }

    // Verify it's actually an image by checking magic bytes
    const format = detectFormat(buffer);
    if (!format) {
      throw new Error(
        "URL does not point to a valid image (unsupported format)",
      );
    }

    return processAndSave(buffer, "url", options, url);
  } finally {
    // Always clean up temp file
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

/**
 * Imports a sticker from a local file.
 * @param filePath The local file path
 * @param options Import options
 * @returns The import result
 */
export async function importFromFile(
  filePath: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const buffer = await fs.promises.readFile(filePath);
  return processAndSave(buffer, "file", options);
}

/**
 * Processes an image buffer, checks for duplicates, and saves it.
 * @param buffer The image buffer
 * @param source The source of the image (e.g., 'clipboard', 'url', 'file')
 * @param options Import options
 * @param sourceUrl Optional source URL
 * @returns The import result
 */
export async function processAndSave(
  buffer: Buffer,
  source: string,
  options: ImportOptions,
  sourceUrl?: string,
): Promise<ImportResult> {
  const format = detectFormat(buffer);
  if (!format) {
    throw new Error("Unsupported image format");
  }

  await initDatabase();

  const fileHash = computeFileHash(buffer);
  const existing = await checkDuplicate(fileHash);
  if (existing) {
    return {
      stickerId: existing.id,
      isDuplicate: true,
      existingSticker: existing,
    };
  }

  const dimensions = getImageDimensions(buffer);
  const id = crypto.randomUUID();
  const filename = `${id}.${format}`;

  await saveImage(buffer, id, format);

  const imagePath = getImagePath(filename);
  const aiData = await analyzeStickerWithAI(imagePath);

  const stickerId = await insertSticker({
    name: aiData.name,
    filename,
    format,
    file_hash: fileHash,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    file_size: buffer.length,
    pack_id: options.packId ?? null,
    is_favorite: 0,
    source,
    source_url: sourceUrl ?? null,
  });

  const finalStickerId = stickerId ?? id;

  if (aiData.tags && aiData.tags.length > 0) {
    await addTagsToSticker(finalStickerId, aiData.tags);
  }

  if (aiData.keywords && aiData.keywords.length > 0) {
    await setKeywords(finalStickerId, aiData.keywords);
  }

  return { stickerId: finalStickerId, isDuplicate: false };
}

/**
 * Validates if an image buffer is supported.
 * @param buffer The image buffer to validate
 * @returns True if supported, false otherwise
 */
export function validateImageBuffer(buffer: Buffer): boolean {
  return detectFormat(buffer) !== null;
}
