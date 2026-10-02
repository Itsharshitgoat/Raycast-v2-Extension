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
    
    // WITHOUT PARENS
    try {
      var pngData1 = bitmapRep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.alloc.init);
      console.log("no parens: " + !!pngData1);
    } catch(e) { console.log("no parens FAIL: " + e); }
    
    // WITH PARENS
    try {
      var pngData2 = bitmapRep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.alloc.init());
      console.log("with parens: " + !!pngData2);
    } catch(e) { console.log("with parens FAIL: " + e); }
  }
} catch (e) {
  console.log("FAIL 3 " + e);
}
`;
fs.writeFileSync('/tmp/test-jxa-dict-script.js', script);
console.log(execSync('osascript -l JavaScript /tmp/test-jxa-dict-script.js').toString());
