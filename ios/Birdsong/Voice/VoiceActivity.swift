/// What the voice agent is doing, from the call's events (as the desktop's mic button shows it).
enum VoiceActivity: Equatable {
    case idle, thinking, speaking

    /// The activity an event moves to; nil when the event doesn't change it.
    init?(eventType: String) {
        switch eventType {
        case "input_audio_buffer.committed", "response.created":
            self = .thinking
        case "response.content_part.added", "output_audio_buffer.started":
            self = .speaking
        case "output_audio_buffer.stopped", "response.done":
            self = .idle
        default:
            return nil
        }
    }
}
