const { execSync } = require('child_process');
const fs = require('fs');

try {
  const script = `
    set theFile to (POSIX file "/tmp/test_clip.png")
    try
      set imageData to the clipboard as «class PNGf»
      set f to open for access theFile with write permission
      set eof of f to 0
      write imageData to f
      close access f
      return "SUCCESS"
    on error
      return "FAIL"
    end try
  `;
  const res = execSync(`osascript -e '${script.replace(/\n/g, "' -e '")}'`).toString().trim();
  console.log(res);
} catch (e) {
  console.error(e);
}
