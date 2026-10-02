// Renders the 1024x1024 app icon (opaque, no alpha) to the path given as argv[1].
// Usage: swift ios/scripts/make-icon.swift ios/WoolyWalking/Assets.xcassets/AppIcon.appiconset/AppIcon.png
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: space,
                    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!

let top = CGColor(colorSpace: space, components: [0xF4 / 255, 0x3F / 255, 0x5E / 255, 1])!
let bottom = CGColor(colorSpace: space, components: [0xBE / 255, 0x12 / 255, 0x3C / 255, 1])!
let gradient = CGGradient(colorsSpace: space, colors: [top, bottom] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(gradient, start: CGPoint(x: 0, y: size), end: CGPoint(x: 0, y: 0), options: [])

let cream = CGColor(colorSpace: space, components: [1, 1, 1, 1])!

// Large rounded "W".
let font = CTFontCreateWithName("ArialRoundedMTBold" as CFString, 560, nil)
let attrs: [CFString: Any] = [
    kCTFontAttributeName: font,
    kCTForegroundColorAttributeName: cream,
]
let line = CTLineCreateWithAttributedString(CFAttributedStringCreate(nil, "W" as CFString, attrs as CFDictionary))
let bounds = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
ctx.textPosition = CGPoint(x: (CGFloat(size) - bounds.width) / 2 - bounds.minX,
                           y: (CGFloat(size) - bounds.height) / 2 - bounds.minY + 70)
CTLineDraw(line, ctx)

// Row of three "steps" under the letter.
ctx.setFillColor(cream.copy(alpha: 0.85)!)
for i in 0..<3 {
    let r: CGFloat = 26
    let x = CGFloat(size) / 2 + CGFloat(i - 1) * 110
    ctx.fillEllipse(in: CGRect(x: x - r, y: 150, width: r * 2, height: r * 1.5))
}

let out = URL(fileURLWithPath: CommandLine.arguments[1])
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
precondition(CGImageDestinationFinalize(dest))
