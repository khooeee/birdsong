import Foundation
import Synchronization

/// REST calls and event streams against the desktop app's remote server.
final class BirdsongClient: Sendable {
    private struct CreateSessionBody: Encodable {
        let agent: String
        let cwd: String
        let pin: Bool
        let createFolder: Bool
    }

    private struct ContinueBody: Encodable {
        let agent: String
        let pin: Bool
    }

    private struct ConfigBody: Encodable {
        let configId: String
        let value: String
    }

    private struct DeviceBody: Encodable {
        let token: String
        let sandbox: Bool
        let topic: String
    }

    let config: ServerConfig
    private let current = Mutex(HTTPConnection())

    init(config: ServerConfig) {
        self.config = config
    }

    /// What new requests go over; hand it to `retire` if it seems dead.
    var connection: HTTPConnection {
        current.withLock { $0 }
    }

    /// Sends new requests over a fresh connection. `tailscale serve` speaks HTTP/2, so otherwise they queue on
    /// one that died silently until it times out. Does nothing if `connection` was already replaced, so every
    /// stream on it can report it.
    func retire(_ connection: HTTPConnection) {
        current.withLock { if $0 === connection { $0 = HTTPConnection() } }
    }

    /// Fails unless the server answers and accepts the token.
    func checkConnection() async throws {
        _ = try await send(request(["sessions"]))
    }

    /// Throws a 409 `ServerError` when `cwd` doesn't exist on the Mac, unless `createFolder` is set.
    func createSession(agent: SessionAgent, cwd: String, pin: Bool, createFolder: Bool = false) async throws -> Session {
        var request = request(["sessions"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = CreateSessionBody(agent: agent.rawValue, cwd: cwd, pin: pin, createFolder: createFolder)
        request.httpBody = try JSONEncoder().encode(body)
        return try JSONDecoder().decode(Session.self, from: await send(request))
    }

    /// Session Folders the Mac suggests for new sessions, most recent first, including ones picked on the Mac.
    func recentFolders() async throws -> [String] {
        try JSONDecoder().decode([String].self, from: await send(request(["recent-folders"])))
    }

    /// Agents installed on the Mac; ones this build doesn't know are dropped.
    func availableAgents() async throws -> [SessionAgent] {
        let kinds = try JSONDecoder().decode([String].self, from: await send(request(["agents"])))
        return kinds.compactMap(SessionAgent.init(rawValue:))
    }

    /// Installed agents with usage to show, in display order.
    func usageAgents() async throws -> [UsageAgent] {
        try JSONDecoder().decode([UsageAgent].self, from: await send(request(["usage"])))
    }

    /// Runs the agent's own usage command on the Mac now; a failed read comes back with `error` set.
    func usage(agent: String) async throws -> AgentUsage {
        try JSONDecoder().decode(AgentUsage.self, from: await send(request(["usage", agent])))
    }

    /// A new session with `agent` in this one's folders, prompted to read its transcript and carry on.
    func continueSession(_ sessionId: String, with agent: SessionAgent, pin: Bool) async throws -> Session {
        var request = request(["sessions", sessionId, "continue"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(ContinueBody(agent: agent.rawValue, pin: pin))
        return try JSONDecoder().decode(Session.self, from: await send(request))
    }

    func setPinned(_ pinned: Bool, sessionId: String) async throws {
        _ = try await send(request(["sessions", sessionId, pinned ? "pin" : "unpin"], method: "POST"))
    }

    /// Shows or clears the unread dot, here and on the Mac.
    func setUnread(_ unread: Bool, sessionId: String) async throws {
        _ = try await send(request(["sessions", sessionId, unread ? "unread" : "read"], method: "POST"))
    }

    /// A copy of the session with the same agent, folders and history, pinned if the source is.
    func forkSession(_ sessionId: String) async throws -> Session {
        let data = try await send(request(["sessions", sessionId, "fork"], method: "POST"))
        return try JSONDecoder().decode(Session.self, from: data)
    }

    /// Replaces the title; the agent stops naming the session.
    func rename(sessionId: String, title: String) async throws {
        var request = request(["sessions", sessionId, "rename"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["title": title])
        _ = try await send(request)
    }

    /// Sends, or steers into the running turn where the agent supports it.
    func sendPrompt(_ text: String, sessionId: String) async throws {
        var request = request(["sessions", sessionId, "prompt"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["text": text])
        _ = try await send(request)
    }

    /// The model, effort and per-model choices; the Mac connects the session's agent first if needed.
    func configPickers(sessionId: String) async throws -> ConfigPickers {
        try JSONDecoder().decode(ConfigPickers.self, from: await send(request(["sessions", sessionId, "config"])))
    }

    /// Picks a model, effort or per-model setting and returns the updated choices.
    func setConfigOption(configId: String, value: String, sessionId: String) async throws -> ConfigPickers {
        var request = request(["sessions", sessionId, "config"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(ConfigBody(configId: configId, value: value))
        return try JSONDecoder().decode(ConfigPickers.self, from: await send(request))
    }

    /// Registers this phone for an alert when a turn finishes. `sandbox` is true for an Xcode install.
    func registerDevice(token: String, sandbox: Bool, topic: String) async throws {
        var request = request(["devices"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(DeviceBody(token: token, sandbox: sandbox, topic: topic))
        _ = try await send(request)
    }

    func cancel(sessionId: String) async throws {
        _ = try await send(request(["sessions", sessionId, "cancel"], method: "POST"))
    }

    /// `path` is `["events"]` for the rail, `["sessions", id, "events"]` for one transcript, or
    /// `["sessions", id, "turns", turnId, "events"]` for one turn in full. Fails unless an event arrives within
    /// `timeout`; the desktop always sends one on opening.
    func events(
        _ path: [String],
        over connection: HTTPConnection,
        firstWithin timeout: Duration
    ) -> AsyncThrowingStream<RemoteEvent, any Error> {
        let request = request(path)
        return AsyncThrowingStream { continuation in
            let deadline = Task {
                try await Task.sleep(for: timeout)
                let message = "Your Mac isn't answering."
                continuation.finish(throwing: URLError(.timedOut, userInfo: [NSLocalizedDescriptionKey: message]))
            }
            let task = Task {
                do {
                    let (bytes, response) = try await connection.bytes(for: request)
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    guard status == 200 else { throw ServerError(status: status, body: Data()) }
                    var parser = ServerSentEventParser()
                    for try await byte in bytes {
                        guard let (name, data) = parser.consume(byte),
                              let event = try RemoteEvent.decode(name: name, data: data)
                        else { continue }
                        deadline.cancel()
                        continuation.yield(event)
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in
                deadline.cancel()
                task.cancel()
            }
        }
    }

    private func request(_ path: [String], method: String = "GET") -> URLRequest {
        let url = path.reduce(config.baseURL) { $0.appending(component: $1) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(config.token)", forHTTPHeaderField: "Authorization")
        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await connection.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw ServerError(status: status, body: data) }
        return data
    }
}
