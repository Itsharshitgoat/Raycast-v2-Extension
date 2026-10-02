const { execFileSync } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

async function testClipboard() {
  const tmpId = crypto.randomUUID();
  const tmpImage = path.join(os.tmpdir(), `test_${tmpId}.tiff`);
  const tmpPng = path.join(os.tmpdir(), `test_${tmpId}.png`);
  const scriptPath = path.join(os.tmpdir(), `script_${tmpId}.applescript`);
  
  const script = `
set theFile to (POSIX file "${tmpImage}")
try
  set imageData to the clipboard as TIFF picture
  set f to open for access theFile with write permission
  set eof of f to 0
  write imageData to f
  close access f
  return "SUCCESS"
on error
  return "FAIL"
end try
  `;
  
  fs.writeFileSync(scriptPath, script);

  try {
    const res = execFileSync('osascript', [scriptPath], { encoding: 'utf8' });
    if (res.trim() === "SUCCESS") {
      execFileSync('/usr/bin/sips', ['-s', 'format', 'png', tmpImage, '--out', tmpPng]);
      const buf = fs.readFileSync(tmpPng);
      console.log("PNG Magic:", buf.subarray(0, 4).toString('hex'));
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    fs.unlinkSync(scriptPath);
    if(fs.existsSync(tmpImage)) fs.unlinkSync(tmpImage);
    if(fs.existsSync(tmpPng)) fs.unlinkSync(tmpPng);
  }
}
testClipboard();
