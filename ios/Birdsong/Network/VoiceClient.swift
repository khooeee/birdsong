import Foundation

/// The desktop app's voice routes. The phone only asks the Mac to start (on a session), answer its offer, mark the
/// call open, and stop; the Mac drives the call itself, and the audio goes straight to Inworld.
final class VoiceClient: Sendable {
    private struct StartBody: Encodable {
        let sessionId: String
        let resume: Bool
        let reason: String?
    }

    private struct Start: Decodable {
        let iceServers: [VoiceIceServer]
    }

    private struct Answer: Decodable {
        let sdp: String
    }

    private let config: ServerConfig
    private let session: URLSession

    init(config: ServerConfig) {
        self.config = config
        let configuration = URLSessionConfiguration.default
        // Outside on 5G: wait out a dead spot rather than fail at once, but not past the Mac's minute.
        configuration.waitsForConnectivity = true
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 45
        session = URLSession(configuration: configuration)
    }

    /// ICE servers for a new call on a session. `resume` after a drop fails with 409 if voice was stopped or moved
    /// to another session meanwhile.
    func start(sessionId: String, resume: Bool, reason: String?) async throws -> [VoiceIceServer] {
        let data = try await post(["voice", "start"], body: StartBody(sessionId: sessionId, resume: resume, reason: reason))
        return try JSONDecoder().decode(Start.self, from: data).iceServers
    }

    /// The phone's SDP offer → Inworld's answer; the Mac attaches to the call before replying.
    func answer(offer: String) async throws -> String {
        let data = try await post(["voice", "answer"], body: ["sdp": offer])
        return try JSONDecoder().decode(Answer.self, from: data).sdp
    }

    /// The call's media is up, so the Mac can start speaking notices.
    func opened() async throws {
        _ = try await post(["voice", "open"], body: [String: String]())
    }

    func stop() async throws {
        _ = try await post(["voice", "stop"], body: [String: String]())
    }

    private func post(_ path: [String], body: some Encodable) async throws -> Data {
        let url = path.reduce(config.baseURL) { $0.appending(component: $1) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(config.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw ServerError(status: status, body: data) }
        return data
    }
}
