import UIKit

/// Helpers for bottom-anchored feeds (transcript, turn details) that follow new rows as they arrive.
extension UICollectionView {
    /// Full-width plain list on the system background, without separators.
    static func plainFeedLayout() -> UICollectionViewLayout {
        var config = UICollectionLayoutListConfiguration(appearance: .plain)
        config.showsSeparators = false
        config.backgroundColor = .systemBackground
        return UICollectionViewCompositionalLayout.list(using: config)
    }

    /// Offset that shows the last row above the bottom inset, or the top when content is short.
    var endContentOffsetY: CGFloat {
        let inset = adjustedContentInset
        return max(-inset.top, contentSize.height - bounds.height + inset.bottom)
    }

    /// True when the bottom of the content is within 40 points of view.
    var isNearEnd: Bool {
        contentOffset.y + bounds.height - adjustedContentInset.bottom >= contentSize.height - 40
    }
}
