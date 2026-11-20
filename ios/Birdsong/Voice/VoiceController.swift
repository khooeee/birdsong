import AVFAudio
import UIKit

/// Voice on the phone. Whoever starts voice holds the mic, so starting here takes it over from the Mac, whose agent
/// still drives the call. This keeps the phone's peer connected: after a drop (network change, dead spot) it resumes
/// with a new call, keeping the old peer's audio running until the new one opens so the app stays alive in the
/// background.
@MainActor
final class VoiceController {
    enum State: Equatable {
        case off, connecting, live(VoiceActivity)
    }

    static let didChange = Notification.Name("VoiceController.didChange")
    /// Calls in a row that end or never open before voice gives up.
    private static let maxFailures = 5

    private(set) var state: State = .off {
        didSet {
            if state != oldValue { NotificationCenter.default.post(name: Self.didChange, object: self) }
        }
    }
    /// Why voice last stopped by itself; cleared on the next start.
    private(set) var error: String?

    private let client: VoiceClient
    private var peer: VoicePeer?
    /// Ended peers, closed once the next one opens.
    private var retired: [VoicePeer] = []
    private var task: Task<Void, Never>?
    /// Opened at least once since start, so drops resume instead of failing.
    private var opened = false
    private var failures = 0
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    init(client: VoiceClient) {
        self.client = client
    }

    func toggle() {
        if state == .off { start() } else { stop() }
    }

    func start() {
        guard state == .off else { return }
        error = nil
        opened = false
        failures = 0
        connect(resume: false, reason: nil)
    }

    func stop() {
        guard state != .off else { return }
        finish(error: nil)
        let client = client
        Task { try? await client.stop() }
    }

    private func connect(resume: Bool, reason: String?, after delay: Duration = .zero) {
        task?.cancel()
        state = .connecting
        task = Task { [weak self] in
            try? await Task.sleep(for: delay)
            guard !Task.isCancelled else { return }
            await self?.attempt(resume: resume, reason: reason)
        }
    }

    private func attempt(resume: Bool, reason: String?) async {
        do {
            if !resume, !(await AVAudioApplication.requestRecordPermission()) {
                return finish(error: "Microphone access is off. Allow Birdsong in Settings → Privacy & Security → Microphone.")
            }
            let iceServers = try await client.start(resume: resume, reason: reason)
            try Task.checkCancellation()
            let peer = try VoicePeer(iceServers: iceServers)
            adopt(peer)
            let offer = try await peer.offer()
            try Task.checkCancellation()
            let answer = try await client.answer(offer: offer)
            try Task.checkCancellation()
            try await peer.accept(answer: answer)
        } catch is CancellationError {
            // Stopped, or superseded by a newer attempt.
        } catch let error as ServerError where error.status == 409 {
            // Voice was stopped meanwhile: on the Mac, by its idle timer, or by the agent.
            finish(error: resume ? nil : error.message)
        } catch {
            if !Task.isCancelled { failed(error.localizedDescription) }
        }
    }

    private func adopt(_ next: VoicePeer) {
        if let peer { retired.append(peer) }
        peer = next
        next.onOpen = { [weak self] peer in self?.peerOpened(peer) }
        next.onEnded = { [weak self] peer, reason in
            guard let self, peer === self.peer, state != .off else { return }
            failed(reason)
        }
        next.onEvent = { [weak self] peer, type in
            guard let self, peer === self.peer, case .live = state, let activity = VoiceActivity(eventType: type) else { return }
            state = .live(activity)
        }
    }

    private func peerOpened(_ peer: VoicePeer) {
        guard peer === self.peer, state != .off else { return }
        opened = true
        failures = 0
        state = .live(.idle)
        closeRetired()
        endBackgroundTask()
        let client = client
        Task {
            // Until the Mac hears this it holds back notices, so try a few times.
            for _ in 0..<3 {
                if (try? await client.opened()) != nil { return }
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    private func failed(_ reason: String) {
        failures += 1
        guard opened, failures <= Self.maxFailures else { return finish(error: reason) }
        beginBackgroundTask()
        // At once the first time (usually a network switch), then back off.
        let delay: Duration = failures == 1 ? .zero : .seconds(1 << (failures - 2))
        connect(resume: true, reason: reason, after: delay)
    }

    private func finish(error: String?) {
        task?.cancel()
        task = nil
        peer?.close()
        peer = nil
        closeRetired()
        endBackgroundTask()
        self.error = error
        state = .off
    }

    private func closeRetired() {
        retired.forEach { $0.close() }
        retired.removeAll()
    }

    /// Time to reconnect if the old peer's audio stopped and iOS would otherwise suspend the app.
    private func beginBackgroundTask() {
        guard backgroundTask == .invalid else { return }
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "Voice reconnect") { [weak self] in
            MainActor.assumeIsolated { self?.endBackgroundTask() }
        }
    }

    private func endBackgroundTask() {
        guard backgroundTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(backgroundTask)
        backgroundTask = .invalid
    }
}
