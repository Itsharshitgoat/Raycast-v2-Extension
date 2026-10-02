const script = `
ObjC.import('AppKit');
var pb = $.NSPasteboard.generalPasteboard;
var types = pb.types;
var count = types.count;
var typesArr = [];
for (var i = 0; i < count; i++) {
  typesArr.push(ObjC.unwrap(types.objectAtIndex(i)));
}
console.log(typesArr.join(", "));
`;
require('fs').writeFileSync('/tmp/test-types-script.js', script);
console.log(require('child_process').execSync('osascript -l JavaScript /tmp/test-types-script.js').toString());
