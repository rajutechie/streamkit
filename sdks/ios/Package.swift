// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RajutechieStreamKit",
    platforms: [.iOS(.v15), .macOS(.v13)],
    products: [
        .library(
            name: "RajutechieStreamKit",
            targets: ["RajutechieStreamKit"]
        ),
    ],
    dependencies: [
        .package(url: "https://github.com/nicklockwood/SwiftFormat", from: "0.54.0"),
    ],
    targets: [
        .target(
            name: "RajutechieStreamKit",
            path: "Sources/RajutechieStreamKit"
        ),
        .testTarget(
            name: "RajutechieStreamKitTests",
            dependencies: ["RajutechieStreamKit"]
        ),
    ]
)

