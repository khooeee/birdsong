import Foundation

/// One agent's usage and limits, read on the Mac on request; a failed read keeps the agent with `error`.
struct AgentUsage: Decodable, Sendable, Hashable {
    let agent: String
    let name: String
    let plan: String?
    let meters: [UsageMeter]
    /// Usage that is not a limit, or where the limits live instead.
    let notes: [String]
    /// Set instead of meters for agents whose usage lives on their website.
    let page: UsagePage?
    let error: String?

    init(agent: String, name: String, error: String) {
        self.agent = agent
        self.name = name
        plan = nil
        meters = []
        notes = []
        page = nil
        self.error = error
    }
}
