import Foundation

/// One URLSession and the sockets it pools. Invalidated once the last request using it lets go.
final class HTTPConnection: Sendable {
    private let session: URLSession

    init() {
        let configuration = URLSessionConfiguration.default
        // Event streams ping every 20s, so a minute of silence means the Mac is gone.
        configuration.timeoutIntervalForRequest = 60
        session = URLSession(configuration: configuration)
    }

    deinit {
        session.finishTasksAndInvalidate()
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }

    func bytes(for request: URLRequest) async throws -> (URLSession.AsyncBytes, URLResponse) {
        try await session.bytes(for: request)
    }
}
