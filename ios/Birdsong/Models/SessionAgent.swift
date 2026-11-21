enum SessionAgent: String, CaseIterable, Sendable {
    case claude, codex, cursor, pi

    var label: String {
        switch self {
        case .claude: "Claude Code"
        case .codex: "Codex"
        case .cursor: "Cursor"
        case .pi: "Pi"
        }
    }
}
