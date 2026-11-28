import Foundation

/// "resets in 2h 13m (Fri 3:00 PM)" for a meter's reset, or nil when there is none.
enum UsageResetText {
    private static let minute = 60.0
    private static let hour = 60 * minute
    private static let day = 24 * hour

    static func text(resetsAt: Double?, now: Date = .now) -> String? {
        guard let resetsAt else { return nil }
        let at = Date(timeIntervalSince1970: resetsAt / 1000)
        let left = at.timeIntervalSince(now)
        if left <= 0 { return "resets now" }
        var style = Date.FormatStyle().weekday(.abbreviated).hour().minute()
        if left > 6 * day { style = style.month(.abbreviated).day() }
        return "resets in \(duration(left)) (\(at.formatted(style)))"
    }

    private static func duration(_ seconds: TimeInterval) -> String {
        let days = Int(seconds / day)
        let hours = Int(seconds.truncatingRemainder(dividingBy: day) / hour)
        let minutes = Int((seconds.truncatingRemainder(dividingBy: hour) / minute).rounded(.up)) % 60
        if days > 0 { return hours > 0 ? "\(days)d \(hours)h" : "\(days)d" }
        if hours > 0 { return minutes > 0 ? "\(hours)h \(minutes)m" : "\(hours)h" }
        return "\(max(1, Int((seconds / minute).rounded(.up))))m"
    }
}
