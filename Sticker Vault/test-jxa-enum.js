const fs = require('fs');
const { execSync } = require('child_process');
const script = `
try {
  ObjC.import('AppKit');
  console.log($.NSBitmapImageFileTypePNG);
  console.log(typeof $.NSBitmapImageFileTypePNG);
} catch (e) {
  console.log("FAIL", e);
}
`;
fs.writeFileSync('/tmp/test-jxa-enum-script.js', script);
console.log(execSync('osascript -l JavaScript /tmp/test-jxa-enum-script.js').toString());
