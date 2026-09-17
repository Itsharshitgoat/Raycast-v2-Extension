const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(cp.execFile);
const DB_PATH = path.join(__dirname, 'test.db');

async function executeSql(query) {
  try {
    const { stdout } = await execFileAsync("sqlite3", [
      "--json",
      DB_PATH,
      query,
    ]);
    if (!stdout.trim()) return [];
    return JSON.parse(stdout);
  } catch (error) {
    console.error("SQL Error:", error.message, "\nQuery:", query);
    throw error;
  }
}

async function initDatabase() {
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
  `;
  
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, "");
  }
  
  await executeSql(schema);
  console.log("Database initialized successfully at", DB_PATH);
}

initDatabase().catch(console.error);
