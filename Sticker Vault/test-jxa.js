const fs = require('fs');
const { execSync } = require('child_process');
const tmpPng = '/tmp/test_jxa.png';
const script = `
try {
  ObjC.import('AppKit');
  var pb = $.NSPasteboard.generalPasteboard;
  var options = $.NSDictionary.alloc.init;
  var classes = $.NSArray.arrayWithObject($.NSImage.class);
  var theImages = pb.readObjectsForClassesOptions(classes, options);
  if (!theImages || theImages.count == 0) {
    console.log("FAIL");
  } else {
    var theImage = theImages.objectAtIndex(0);
    var tiffData = theImage.TIFFRepresentation;
    var bitmapRep = $.NSBitmapImageRep.imageRepWithData(tiffData);
    var pngData = bitmapRep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.alloc.init);
    pngData.writeToFileAtomically("${tmpPng}", true);
    console.log("SUCCESS");
  }
} catch (e) {
  console.log("FAIL");
}
`;
fs.writeFileSync('/tmp/test-jxa-script.js', script);
console.log(execSync('osascript -l JavaScript /tmp/test-jxa-script.js').toString());
