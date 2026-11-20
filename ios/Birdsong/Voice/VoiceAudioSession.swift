@preconcurrency import WebRTC

/// How WebRTC sets up the audio session for voice: a hands-free call on the speaker, or AirPods when connected.
enum VoiceAudioSession {
    /// Call before the first peer connection.
    static func configure() {
        let config = RTCAudioSessionConfiguration.webRTC()
        config.category = AVAudioSession.Category.playAndRecord.rawValue
        // Voice chat turns on Apple's echo cancellation, so the agent doesn't hear itself on the speaker.
        config.mode = AVAudioSession.Mode.voiceChat.rawValue
        config.categoryOptions = [.defaultToSpeaker, .allowBluetoothHFP]
        RTCAudioSessionConfiguration.setWebRTC(config)
    }
}
