import Foundation

public actor HTTPClient {
    private let baseURL: String
    private let apiKey: String
    private var token: String?
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    public init(baseURL: String, apiKey: String) {
        self.baseURL = baseURL.hasSuffix("/") ? String(baseURL.dropLast()) : baseURL
        self.apiKey = apiKey
        self.session = URLSession(configuration: .default)
    }

    public func setToken(_ token: String?) {
        self.token = token
    }

    public func get<T: Decodable>(_ path: String, params: [String: String] = [:]) async throws -> T {
        var urlString = "\(baseURL)\(path)"
        if !params.isEmpty {
            let query = params.map { "\($0.key)=\($0.value)" }.joined(separator: "&")
            urlString += "?\(query)"
        }
        return try await request(url: urlString, method: "GET")
    }

    public func post<T: Decodable>(_ path: String, body: Encodable? = nil) async throws -> T {
        return try await request(url: "\(baseURL)\(path)", method: "POST", body: body)
    }

    public func patch<T: Decodable>(_ path: String, body: Encodable? = nil) async throws -> T {
        return try await request(url: "\(baseURL)\(path)", method: "PATCH", body: body)
    }

    public func delete<T: Decodable>(_ path: String) async throws -> T {
        return try await request(url: "\(baseURL)\(path)", method: "DELETE")
    }

    private func request<T: Decodable>(url: String, method: String, body: Encodable? = nil) async throws -> T {
        guard let requestURL = URL(string: url) else {
            throw RajutechieStreamKitError.invalidURL(url)
        }

        var request = URLRequest(url: requestURL)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw RajutechieStreamKitError.unknown
        }

        guard 200..<300 ~= httpResponse.statusCode else {
            throw RajutechieStreamKitError.apiError(statusCode: httpResponse.statusCode, body: String(data: data, encoding: .utf8))
        }

        return try decoder.decode(T.self, from: data)
    }
}

public enum RajutechieStreamKitError: Error {
    case invalidURL(String)
    case apiError(statusCode: Int, body: String?)
    case networkError(Error)
    case unknown
}

private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void
    init(_ wrapped: Encodable) {
        self.encode = wrapped.encode
    }
    func encode(to encoder: Encoder) throws {
        try encode(encoder)
    }
}
