enum SessionAgent: String, CaseIterable, Sendable {
    case antigravity, claude, codex, cursor, pi

    var label: String {
        switch self {
        case .antigravity: "Antigravity"
        case .claude: "Claude Code"
        case .codex: "Codex"
        case .cursor: "Cursor"
        case .pi: "Pi"
        }
    }
}
