import Foundation

/// Builds server-sent events from bytes; the desktop sends one `data:` line per event.
/// Lines end at `\n` only: `AsyncBytes.lines` also breaks at U+2028, U+2029 and U+0085, which JSON leaves
/// unescaped, so a message containing one would cut its event in half.
struct ServerSentEventParser {
    private var line: [UInt8] = []
    private var name = "message"

    /// The event this byte completes, if any.
    mutating func consume(_ byte: UInt8) -> (name: String, data: String)? {
        guard byte == UInt8(ascii: "\n") else {
            line.append(byte)
            return nil
        }
        let text = String(decoding: line, as: UTF8.self)
        line.removeAll(keepingCapacity: true)
        if text.hasPrefix("event:") {
            name = text.dropFirst(6).trimmingCharacters(in: .whitespaces)
        } else if text.hasPrefix("data:") {
            defer { name = "message" }
            return (name, String(text.dropFirst(5)))
        }
        return nil
    }
}
