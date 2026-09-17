import Foundation
import Vision
import CoreGraphics
import ImageIO

guard CommandLine.arguments.count > 1 else {
    print("{\"error\": \"Usage: ./analyze <path-to-image>\"}")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
let fileURL = URL(fileURLWithPath: imagePath)

guard let source = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
      let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    print("{\"error\": \"Could not load image\"}")
    exit(1)
}

var tags: [String] = []
var textLines: [String] = []
var animalLabels: [String] = []
var faceCount = 0

// 1. Classification Request — lowered threshold to 10% and increased max to 30
let classifyRequest = VNClassifyImageRequest { (request, error) in
    guard let results = request.results as? [VNClassificationObservation] else { return }
    
    // Lower threshold catches more nuanced tags like emotions and specific animals
    let topResults = results.filter { $0.confidence > 0.1 }.prefix(30)
    tags = topResults.map { $0.identifier.replacingOccurrences(of: "_", with: " ") }
}

// 2. Text Recognition Request
let textRequest = VNRecognizeTextRequest { (request, error) in
    guard let results = request.results as? [VNRecognizedTextObservation] else { return }
    
    for observation in results {
        if let topCandidate = observation.topCandidates(1).first {
            textLines.append(topCandidate.string)
        }
    }
}
textRequest.recognitionLevel = .accurate

// 3. Animal Recognition — specifically identifies cats, dogs, etc.
let animalRequest = VNRecognizeAnimalsRequest { (request, error) in
    guard let results = request.results as? [VNRecognizedObjectObservation] else { return }
    
    for observation in results {
        for label in observation.labels {
            if label.confidence > 0.3 {
                animalLabels.append(label.identifier.lowercased())
            }
        }
    }
}

// 4. Face Detection — detects human/cartoon faces
let faceRequest = VNDetectFaceRectanglesRequest { (request, error) in
    guard let results = request.results as? [VNFaceObservation] else { return }
    faceCount = results.count
}

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

do {
    try handler.perform([classifyRequest, textRequest, animalRequest, faceRequest])
    
    // Merge animal labels into tags (deduplicated)
    var allTags = tags
    for animal in animalLabels {
        if !allTags.contains(animal) {
            allTags.insert(animal, at: 0)
        }
    }
    
    // Add face-related tags
    if faceCount > 0 {
        if !allTags.contains("face") { allTags.insert("face", at: 0) }
        if !allTags.contains("person") { allTags.insert("person", at: 0) }
        if faceCount > 1 {
            allTags.insert("group", at: 0)
        }
    }
    
    // Build JSON output
    let output: [String: Any] = [
        "tags": allTags,
        "text": textLines.joined(separator: " "),
        "animals": animalLabels,
        "faceCount": faceCount
    ]
    
    let jsonData = try JSONSerialization.data(withJSONObject: output, options: [])
    if let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    } else {
        print("{\"error\": \"Failed to encode JSON\"}")
    }
} catch {
    print("{\"error\": \"\(error.localizedDescription)\"}")
}

