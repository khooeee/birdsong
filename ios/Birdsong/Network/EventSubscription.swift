import UIKit

/// Keeps one event stream open while started: reconnects with backoff and on return to the foreground.
@MainActor
final class EventSubscription {
    enum State: Equatable {
        /// `again` once the stream has been live.
        case connecting(again: Bool)
        case live
        /// Still retrying.
        case offline(String)

        /// What to show while not live.
        var notice: String? {
            switch self {
            case .connecting(let again): again ? "Reconnecting…" : "Connecting…"
            case .live: nil
            case .offline(let message): "Reconnecting: \(message)"
            }
        }
    }

    /// Generous next to the usual fraction of a second, and doubled per failure up to the longest for slow links.
    private static let firstEventTimeout = Duration.seconds(8)
    private static let longestFirstEventTimeout = Duration.seconds(32)

    var onEvent: ((RemoteEvent) -> Void)?
    var onState: ((State) -> Void)?

    private let client: BirdsongClient
    private let path: [String]
    private var task: Task<Void, Never>?
    private var foregroundObserver: (any NSObjectProtocol)?
    private var state: State?
    private var hasBeenLive = false
    /// What the latest attempt uses.
    private var connection: HTTPConnection?

    init(client: BirdsongClient, path: [String]) {
        self.client = client
        self.path = path
    }

    func start() {
        guard task == nil else { return }
        // A backgrounded app's socket may be dead; reconnect now rather than after the timeout.
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.reconnect() }
        }
        connect()
    }

    func stop() {
        task?.cancel()
        task = nil
        if let foregroundObserver { NotificationCenter.default.removeObserver(foregroundObserver) }
        foregroundObserver = nil
        connection = nil
    }

    private func reconnect() {
        if let connection { client.retire(connection) }
        connect()
    }

    private func connect() {
        task?.cancel()
        task = Task { [weak self] in await self?.run() }
    }

    private func run() async {
        var delay = Duration.seconds(1)
        var timeout = Self.firstEventTimeout
        set(.connecting(again: hasBeenLive))
        while !Task.isCancelled {
            let connection = client.connection
            self.connection = connection
            var failure = "Disconnected"
            do {
                for try await event in client.events(path, over: connection, firstWithin: timeout) {
                    delay = .seconds(1)
                    timeout = Self.firstEventTimeout
                    set(.live)
                    onEvent?(event)
                }
            } catch {
                failure = error.localizedDescription
            }
            if Task.isCancelled { return }
            client.retire(connection)
            set(.offline(failure))
            try? await Task.sleep(for: delay)
            delay = min(delay * 2, .seconds(15))
            timeout = min(timeout * 2, Self.longestFirstEventTimeout)
        }
    }

    private func set(_ next: State) {
        if next == .live { hasBeenLive = true }
        guard next != state else { return }
        state = next
        onState?(next)
    }
}
