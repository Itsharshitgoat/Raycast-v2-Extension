const fs = require('fs');
const { execSync } = require('child_process');

const script = `
try {
  ObjC.import('AppKit');
  var pb = $.NSPasteboard.generalPasteboard;
  var options = $.NSDictionary.alloc.init;
  var classes = $.NSArray.arrayWithObject($.NSImage.class);
  var theImages = pb.readObjectsForClassesOptions(classes, options);
  if (!theImages || theImages.count == 0) {
    console.log("FAIL 1");
  } else {
    var theImage = theImages.objectAtIndex(0);
    var tiffData = theImage.TIFFRepresentation;
    var bitmapRep = $.NSBitmapImageRep.imageRepWithData(tiffData);
    var pngData = bitmapRep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.alloc.init);
    
    if (!pngData) {
        console.log("FAIL pngData is null");
    } else {
        var res = pngData.writeToFileAtomically("/tmp/test_jxa_full.png", true);
        console.log("SUCCESS " + res);
    }
  }
} catch (e) {
  console.log("FAIL 3 " + e);
}
`;
fs.writeFileSync('/tmp/test-jxa-full-script.js', script);
console.log(execSync('osascript -l JavaScript /tmp/test-jxa-full-script.js').toString());
