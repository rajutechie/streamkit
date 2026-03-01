import Foundation

public struct RetryPolicy {
    public let maxRetries: Int
    public let baseDelay: TimeInterval
    public let maxDelay: TimeInterval
    public let jitter: Bool

    public init(maxRetries: Int = 3, baseDelay: TimeInterval = 1.0, maxDelay: TimeInterval = 30.0, jitter: Bool = true) {
        self.maxRetries = maxRetries
        self.baseDelay = baseDelay
        self.maxDelay = maxDelay
        self.jitter = jitter
    }

    public func execute<T>(_ operation: () async throws -> T) async throws -> T {
        var lastError: Error?

        for attempt in 0...maxRetries {
            do {
                return try await operation()
            } catch {
                lastError = error
                if attempt >= maxRetries { break }

                let exponential = baseDelay * pow(2.0, Double(attempt))
                let capped = min(exponential, maxDelay)
                let delay = jitter ? capped * (0.5 + Double.random(in: 0...0.5)) : capped
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
        }

        throw lastError ?? RajutechieStreamKitError.unknown
    }
}
