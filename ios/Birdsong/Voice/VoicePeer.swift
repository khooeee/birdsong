import Foundation
@preconcurrency import WebRTC

/// The phone's side of a voice call: mic up, agent audio down (WebRTC plays it). The Mac drives the call over its
/// own sideband; the `oai-events` channel here only shows what the agent is doing and when the call ends.
@MainActor
final class VoicePeer: NSObject {
    struct Failure: LocalizedError {
        let errorDescription: String?
    }

    var onOpen: ((VoicePeer) -> Void)?
    /// Once per peer: the call closed, failed, never connected, or dropped for too long.
    var onEnded: ((VoicePeer, String) -> Void)?
    /// Each realtime event type the agent sends (streaming deltas skipped).
    var onEvent: ((VoicePeer, String) -> Void)?

    private static let factory: RTCPeerConnectionFactory = {
        RTCInitializeSSL()
        VoiceAudioSession.configure()
        return RTCPeerConnectionFactory()
    }()
    /// No packets this long usually means the network changed; a new call beats waiting for ICE to fail.
    private static let dropGrace: Duration = .seconds(4)
    private static let connectTimeout: Duration = .seconds(15)

    private var connection: RTCPeerConnection?
    private var channel: RTCDataChannel?
    /// With TURN servers, wait for a relay candidate: on cellular it is often the only path that works.
    private let expectsRelay: Bool
    private var hasRelay = false
    private var gathered = false
    private var gatherWaiter: CheckedContinuation<Void, Never>?
    private var gatherSettle: Task<Void, Never>?
    private var gatherCap: Task<Void, Never>?
    private var connectTimer: Task<Void, Never>?
    private var dropTimer: Task<Void, Never>?
    private var finished = false

    init(iceServers: [VoiceIceServer]) throws {
        expectsRelay = iceServers.contains { $0.urls.contains { $0.hasPrefix("turn") } }
        super.init()
        let config = RTCConfiguration()
        config.iceServers = iceServers.map {
            RTCIceServer(urlStrings: $0.urls, username: $0.username, credential: $0.credential)
        }
        config.sdpSemantics = .unifiedPlan
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        guard let connection = Self.factory.peerConnection(with: config, constraints: constraints, delegate: self) else {
            throw Failure(errorDescription: "Could not start the voice connection.")
        }
        let mic = Self.factory.audioTrack(with: Self.factory.audioSource(with: constraints), trackId: "mic")
        _ = connection.add(mic, streamIds: ["mic"])
        let channelConfig = RTCDataChannelConfiguration()
        channelConfig.isOrdered = true
        channel = connection.dataChannel(forLabel: "oai-events", configuration: channelConfig)
        channel?.delegate = self
        self.connection = connection
    }

    /// The offer with its ICE candidates: Inworld takes a single exchange, no trickle.
    func offer() async throws -> String {
        guard let connection else { throw Failure(errorDescription: "The voice connection closed.") }
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        let offer = try await connection.offer(for: constraints)
        try await connection.setLocalDescription(offer)
        await gatheringDone()
        guard let sdp = connection.localDescription?.sdp else { throw Failure(errorDescription: "No voice offer.") }
        return sdp
    }

    func accept(answer: String) async throws {
        try await connection?.setRemoteDescription(RTCSessionDescription(type: .answer, sdp: answer))
        connectTimer = after(Self.connectTimeout) { $0.end("The call didn't connect.") }
    }

    func close() {
        finished = true
        for timer in [connectTimer, dropTimer] { timer?.cancel() }
        finishGathering()
        channel?.close()
        connection?.close()
        channel = nil
        connection = nil
    }

    // MARK: - Events, on the main actor

    /// Inworld's sample: 500 ms after the last candidate, or 3 s at most.
    private func gatheringDone() async {
        guard !gathered else { return }
        await withCheckedContinuation { continuation in
            gatherWaiter = continuation
            gatherCap = after(.seconds(3)) { $0.finishGathering() }
        }
    }

    private func candidateFound(_ sdp: String) {
        if sdp.contains(" typ relay") { hasRelay = true }
        guard hasRelay || !expectsRelay else { return }
        gatherSettle?.cancel()
        gatherSettle = after(.milliseconds(500)) { $0.finishGathering() }
    }

    private func finishGathering() {
        gathered = true
        gatherSettle?.cancel()
        gatherCap?.cancel()
        gatherWaiter?.resume()
        gatherWaiter = nil
    }

    private func connectionChanged(_ state: RTCPeerConnectionState) {
        switch state {
        case .connected:
            dropTimer?.cancel()
            dropTimer = nil
        case .disconnected:
            if dropTimer == nil { dropTimer = after(Self.dropGrace) { $0.end("The connection dropped.") } }
        case .failed:
            end("The connection failed.")
        default:
            break
        }
    }

    private func channelChanged(_ state: RTCDataChannelState) {
        guard !finished else { return }
        if state == .open {
            connectTimer?.cancel()
            onOpen?(self)
        } else if state == .closed {
            end("The call ended.")
        }
    }

    private func received(_ type: String) {
        if !finished { onEvent?(self, type) }
    }

    private func end(_ reason: String) {
        guard !finished else { return }
        finished = true
        for timer in [connectTimer, dropTimer] { timer?.cancel() }
        onEnded?(self, reason)
    }

    private func after(_ delay: Duration, _ action: @escaping @MainActor (VoicePeer) -> Void) -> Task<Void, Never> {
        Task { [weak self] in
            try? await Task.sleep(for: delay)
            guard let self, !Task.isCancelled else { return }
            action(self)
        }
    }

    nonisolated private static func eventType(_ data: Data) -> String? {
        let event = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let type = event?["type"] as? String, !type.hasSuffix(".delta") else { return nil }
        return type
    }
}

// WebRTC calls these on its signaling thread; hop to the main actor with plain values.
extension VoicePeer: RTCPeerConnectionDelegate {
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    nonisolated func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}

    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {
        guard newState == .complete else { return }
        Task { @MainActor [weak self] in self?.finishGathering() }
    }

    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        let sdp = candidate.sdp
        Task { @MainActor [weak self] in self?.candidateFound(sdp) }
    }

    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCPeerConnectionState) {
        Task { @MainActor [weak self] in self?.connectionChanged(newState) }
    }
}

extension VoicePeer: RTCDataChannelDelegate {
    nonisolated func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        let state = dataChannel.readyState
        Task { @MainActor [weak self] in self?.channelChanged(state) }
    }

    nonisolated func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard let type = Self.eventType(buffer.data) else { return }
        Task { @MainActor [weak self] in self?.received(type) }
    }
}
