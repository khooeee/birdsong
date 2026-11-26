import UIKit

/// The transcript list. A press on a button wins over the scroll indicator, which otherwise takes touches along the trailing edge.
final class TranscriptCollectionView: UICollectionView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let hit = super.hitTest(point, with: event)
        guard let indicator = hit.flatMap(scrollIndicator) else { return hit }
        let hidden = indicator.isHidden
        indicator.isHidden = true
        let underneath = super.hitTest(point, with: event)
        indicator.isHidden = hidden
        return control(from: underneath) ?? hit
    }

    /// The scroll indicator is a private subview, and it sits above the cells.
    private func scrollIndicator(in view: UIView) -> UIView? {
        var current: UIView? = view
        while let candidate = current, candidate !== self {
            if String(describing: type(of: candidate)).contains("ScrollIndicator") {
                return candidate
            }
            current = candidate.superview
        }
        return nil
    }

    private func control(from view: UIView?) -> UIControl? {
        var current = view
        while let candidate = current, !(candidate is UICollectionViewCell) {
            if let control = candidate as? UIControl { return control }
            current = candidate.superview
        }
        return nil
    }
}
