import AppKit

let pasteboard = NSPasteboard.general
if let image = pasteboard.readObjects(forClasses: [NSImage.self], options: nil)?.first as? NSImage {
    if let tiffData = image.tiffRepresentation,
       let bitmapImage = NSBitmapImageRep(data: tiffData),
       let pngData = bitmapImage.representation(using: .png, properties: [:]) {
        if CommandLine.arguments.count > 1 {
            let path = CommandLine.arguments[1]
            do {
                try pngData.write(to: URL(fileURLWithPath: path))
                print("SUCCESS")
                exit(0)
            } catch {
                print("FAIL \(error)")
                exit(1)
            }
        }
    }
}
print("FAIL")
exit(1)
