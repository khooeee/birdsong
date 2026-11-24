import UIKit

/// The desktop rail's green dot.
final class UnreadDotView: UIView {
    private static let diameter: CGFloat = 10

    init() {
        super.init(frame: CGRect(x: 0, y: 0, width: Self.diameter, height: Self.diameter))
        backgroundColor = UIColor(resource: .unread)
        layer.cornerRadius = Self.diameter / 2
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }
}
