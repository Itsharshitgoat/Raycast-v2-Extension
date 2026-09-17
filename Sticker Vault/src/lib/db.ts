import path from "path";
import crypto from "crypto";
import fs from "fs";
import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Path to the SQLite database file for the stickers extension.
 */
export const DB_PATH = path.join(environment.supportPath, "stickers.db");

/**
 * Escapes a string for use in an SQL query by replacing single quotes with two single quotes.
 * @param value The string to escape.
 * @returns The escaped string.
 */
export function sqlEscape(value: string | number): string {
  return String(value).replace(/'/g, "''");
}

/**
 * Executes an SQL query using the macOS sqlite3 CLI.
 * It does not use --readonly so it can create tables and insert data.
 */
async function executeSql<T = unknown>(query: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "/usr/bin/sqlite3",
      ["--json", DB_PATH],
      (error, stdout, stderr) => {
        if (error) {
          console.error(
            "SQL Error:",
            error.message,
            "\nQuery:",
            query,
            "\nStderr:",
            stderr
          );
          reject(error);
          return;
        }
        if (!stdout.trim()) {
          resolve([]);
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          console.error("JSON Parse Error for output:", stdout);
          reject(parseError);
        }
      }
    );

    if (child.stdin) {
      child.stdin.write(query);
      child.stdin.end();
    }
  });
}

export interface StickerRecord {
  id: string;
  name: string;
  filename: string;
  format: string;
  file_hash: string;
  width: number | null;
  height: number | null;
  file_size: number | null;
  pack_id: string | null;
  is_favorite: number; // 0 or 1
  use_count: number;
  source: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PackRecord {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface TagRecord {
  id: string;
  name: string;
}

/**
 * Initializes the database by creating tables and indexes if they do not exist.
 */
export async function initDatabase(): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS packs (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        icon       TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stickers (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        filename      TEXT NOT NULL UNIQUE,
        format        TEXT NOT NULL,
        file_hash     TEXT NOT NULL,
        width         INTEGER,
        height        INTEGER,
        file_size     INTEGER,
        pack_id       TEXT,
        is_favorite   INTEGER DEFAULT 0,
        use_count     INTEGER DEFAULT 0,
        source        TEXT DEFAULT 'clipboard',
        source_url    TEXT,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL,
        FOREIGN KEY (pack_id) REFERENCES packs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS sticker_tags (
        sticker_id TEXT NOT NULL,
        tag_id     TEXT NOT NULL,
        PRIMARY KEY (sticker_id, tag_id),
        FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sticker_keywords (
        sticker_id TEXT NOT NULL,
        keyword    TEXT NOT NULL,
        PRIMARY KEY (sticker_id, keyword),
        FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_stickers_pack_id ON stickers(pack_id);
    CREATE INDEX IF NOT EXISTS idx_stickers_is_favorite ON stickers(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_stickers_file_hash ON stickers(file_hash);
    CREATE INDEX IF NOT EXISTS idx_stickers_use_count ON stickers(use_count DESC);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `;

  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, "");
  }

  await executeSql(schema);
}

// Helper to handle optional values
function formatSqlValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "number") return val.toString();
  return `'${sqlEscape(val)}'`;
}

/**
 * Inserts a new sticker into the database.
 * @param data The sticker data.
 * @returns The ID of the inserted sticker.
 */
export async function insertSticker(
  data: Omit<StickerRecord, "id" | "use_count" | "created_at" | "updated_at">,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const query = `
    INSERT INTO stickers (
      id, name, filename, format, file_hash, width, height, file_size, 
      pack_id, is_favorite, use_count, source, source_url, created_at, updated_at
    ) VALUES (
      '${id}', 
      ${formatSqlValue(data.name)}, 
      ${formatSqlValue(data.filename)}, 
      ${formatSqlValue(data.format)}, 
      ${formatSqlValue(data.file_hash)}, 
      ${formatSqlValue(data.width)}, 
      ${formatSqlValue(data.height)}, 
      ${formatSqlValue(data.file_size)}, 
      ${formatSqlValue(data.pack_id)}, 
      ${data.is_favorite}, 
      0, 
      ${formatSqlValue(data.source)}, 
      ${formatSqlValue(data.source_url)}, 
      '${now}', 
      '${now}'
    );
  `;
  await executeSql(query);
  return id;
}

/**
 * Retrieves all stickers from the database.
 * @returns A list of all stickers.
 */
export async function getAllStickers(): Promise<StickerRecord[]> {
  return await executeSql<StickerRecord>(
    "SELECT * FROM stickers ORDER BY created_at DESC;",
  );
}

/**
 * Retrieves a single sticker by its ID.
 * @param id The ID of the sticker.
 * @returns The sticker record, or null if not found.
 */
export async function getStickerById(
  id: string,
): Promise<StickerRecord | null> {
  const data = await executeSql<StickerRecord>(
    `SELECT * FROM stickers WHERE id = '${sqlEscape(id)}' LIMIT 1;`,
  );
  return data.length > 0 ? data[0] : null;
}

/**
 * Updates an existing sticker.
 * @param id The sticker ID.
 * @param updates The fields to update.
 */
export async function updateSticker(
  id: string,
  updates: Partial<Pick<StickerRecord, "name" | "pack_id" | "is_favorite">>,
): Promise<void> {
  const sets: string[] = [];
  if (updates.name !== undefined)
    sets.push(`name = ${formatSqlValue(updates.name)}`);
  if (updates.pack_id !== undefined)
    sets.push(`pack_id = ${formatSqlValue(updates.pack_id)}`);
  if (updates.is_favorite !== undefined)
    sets.push(`is_favorite = ${updates.is_favorite}`);

  if (sets.length === 0) return;

  const now = new Date().toISOString();
  sets.push(`updated_at = '${now}'`);

  const query = `UPDATE stickers SET ${sets.join(", ")} WHERE id = '${sqlEscape(id)}';`;
  await executeSql(query);
}

/**
 * Deletes a sticker by ID.
 * @param id The sticker ID.
 */
export async function deleteStickerById(id: string): Promise<void> {
  await executeSql(`DELETE FROM stickers WHERE id = '${sqlEscape(id)}';`);
}

/**
 * Increments the use_count for a sticker and updates its updated_at timestamp.
 * @param id The sticker ID.
 */
export async function incrementUseCount(id: string): Promise<void> {
  const now = new Date().toISOString();
  await executeSql(
    `UPDATE stickers SET use_count = use_count + 1, updated_at = '${now}' WHERE id = '${sqlEscape(id)}';`,
  );
}

/**
 * Checks if a sticker with the given file hash already exists.
 * @param fileHash The hash to check.
 * @returns The duplicate sticker record, or null if none exists.
 */
export async function checkDuplicate(
  fileHash: string,
): Promise<StickerRecord | null> {
  const data = await executeSql<StickerRecord>(
    `SELECT * FROM stickers WHERE file_hash = '${sqlEscape(fileHash)}' LIMIT 1;`,
  );
  return data.length > 0 ? data[0] : null;
}

/**
 * Creates a new pack.
 * @param name The pack name.
 * @param icon Optional pack icon.
 * @returns The ID of the newly created pack.
 */
export async function createPack(
  name: string,
  icon?: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const query = `
    INSERT INTO packs (id, name, icon, sort_order, created_at)
    VALUES ('${id}', ${formatSqlValue(name)}, ${formatSqlValue(icon ?? null)}, 0, '${now}');
  `;
  await executeSql(query);
  return id;
}

/**
 * Retrieves all packs.
 * @returns A list of all packs.
 */
export async function getAllPacks(): Promise<PackRecord[]> {
  return await executeSql<PackRecord>(
    "SELECT * FROM packs ORDER BY sort_order ASC, created_at DESC;",
  );
}

/**
 * Deletes a pack by ID.
 * @param id The pack ID.
 */
export async function deletePack(id: string): Promise<void> {
  await executeSql(`DELETE FROM packs WHERE id = '${sqlEscape(id)}';`);
}

/**
 * Adds tags to a sticker, creating any tags that do not exist.
 * @param stickerId The sticker ID.
 * @param tagNames Array of tag names to add.
 */
export async function addTagsToSticker(
  stickerId: string,
  tagNames: string[],
): Promise<void> {
  if (tagNames.length === 0) return;

  for (const name of tagNames) {
    // Upsert the tag
    const tagId = crypto.randomUUID();
    await executeSql(
      `INSERT OR IGNORE INTO tags (id, name) VALUES ('${tagId}', ${formatSqlValue(name)});`,
    );

    // Get the tag's ID (whether it was just inserted or already existed)
    const tagData = await executeSql<{ id: string }>(
      `SELECT id FROM tags WHERE name = ${formatSqlValue(name)} LIMIT 1;`,
    );

    if (tagData.length > 0) {
      const actualTagId = tagData[0].id;
      await executeSql(
        `INSERT OR IGNORE INTO sticker_tags (sticker_id, tag_id) VALUES ('${sqlEscape(stickerId)}', '${actualTagId}');`,
      );
    }
  }
}

/**
 * Removes a tag link from a sticker.
 * @param stickerId The sticker ID.
 * @param tagId The tag ID.
 */
export async function removeTagFromSticker(
  stickerId: string,
  tagId: string,
): Promise<void> {
  await executeSql(
    `DELETE FROM sticker_tags WHERE sticker_id = '${sqlEscape(stickerId)}' AND tag_id = '${sqlEscape(tagId)}';`,
  );
}

/**
 * Retrieves all tags associated with a specific sticker.
 * @param stickerId The sticker ID.
 * @returns Array of tags for the sticker.
 */
export async function getTagsForSticker(
  stickerId: string,
): Promise<TagRecord[]> {
  const query = `
    SELECT t.* FROM tags t
    JOIN sticker_tags st ON t.id = st.tag_id
    WHERE st.sticker_id = '${sqlEscape(stickerId)}';
  `;
  return await executeSql<TagRecord>(query);
}

/**
 * Retrieves all tags.
 * @returns A list of all tags.
 */
export async function getAllTags(): Promise<TagRecord[]> {
  return await executeSql<TagRecord>("SELECT * FROM tags ORDER BY name ASC;");
}

/**
 * Sets keywords for a sticker, replacing any existing keywords.
 * @param stickerId The sticker ID.
 * @param keywords Array of keywords.
 */
export async function setKeywords(
  stickerId: string,
  keywords: string[],
): Promise<void> {
  await executeSql(
    `DELETE FROM sticker_keywords WHERE sticker_id = '${sqlEscape(stickerId)}';`,
  );

  for (const kw of keywords) {
    await executeSql(
      `INSERT INTO sticker_keywords (sticker_id, keyword) VALUES ('${sqlEscape(stickerId)}', ${formatSqlValue(kw)});`,
    );
  }
}

/**
 * Retrieves all keywords for a specific sticker.
 * @param stickerId The sticker ID.
 * @returns Array of keywords.
 */
export async function getKeywordsForSticker(
  stickerId: string,
): Promise<string[]> {
  const data = await executeSql<{ keyword: string }>(
    `SELECT keyword FROM sticker_keywords WHERE sticker_id = '${sqlEscape(stickerId)}';`,
  );
  return data.map((row) => row.keyword);
}
