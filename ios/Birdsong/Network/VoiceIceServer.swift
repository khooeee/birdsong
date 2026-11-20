import Foundation

/// A STUN/TURN server for the voice call, as Inworld hands it to the desktop app; `urls` may be one string or many.
struct VoiceIceServer: Decodable, Sendable {
    let urls: [String]
    let username: String?
    let credential: String?

    private enum CodingKeys: String, CodingKey {
        case urls, username, credential
    }

    init(from decoder: any Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let many = try? container.decode([String].self, forKey: .urls) {
            urls = many
        } else {
            urls = [try container.decode(String.self, forKey: .urls)]
        }
        username = try container.decodeIfPresent(String.self, forKey: .username)
        credential = try container.decodeIfPresent(String.self, forKey: .credential)
    }
}
