const fs = require('fs');
const { execSync } = require('child_process');
const script = `
try {
  ObjC.import('AppKit');
  var options = $.NSDictionary.alloc.init;
  console.log(typeof options);
  console.log(options.isKindOfClass ? "is dict" : "not dict");
} catch (e) {
  console.log("FAIL");
}
`;
fs.writeFileSync('/tmp/test-jxa-init-script.js', script);
console.log(execSync('osascript -l JavaScript /tmp/test-jxa-init-script.js').toString());
