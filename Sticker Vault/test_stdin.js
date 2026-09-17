const { execFile } = require("child_process");

async function executeSql(query) {
  return new Promise((resolve, reject) => {
    const child = execFile("/usr/bin/sqlite3", ["--json", "test_stdin2.db"], (error, stdout, stderr) => {
      if (error) {
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
        reject(parseError);
      }
    });
    
    if (child.stdin) {
      child.stdin.write(query);
      child.stdin.end();
    }
  });
}

(async () => {
  await executeSql("CREATE TABLE IF NOT EXISTS packs (id TEXT PRIMARY KEY);");
  console.log("Created table");
  const res = await executeSql("SELECT * FROM packs;");
  console.log("Select result:", res);
})();
