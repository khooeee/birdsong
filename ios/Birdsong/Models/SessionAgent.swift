enum SessionAgent: String, CaseIterable, Sendable {
    case antigravity, claude, codex, copilot, cursor, devin, opencode, pi

    var label: String {
        switch self {
        case .antigravity: "Antigravity"
        case .claude: "Claude Code"
        case .codex: "Codex"
        case .copilot: "Copilot"
        case .cursor: "Cursor"
        case .devin: "Devin"
        case .opencode: "OpenCode"
        case .pi: "Pi"
        }
    }
}
