import UIKit

/// One turn in full, live: the prompt, thoughts, tool calls, steers, subagents and the reply.
final class TurnDetailsViewController: UIViewController {
    private let subscription: EventSubscription
    private var items: [String: RemoteTurnItem] = [:]
    private var status: RemoteTurn.Status?
    private var isGone = false
    private var connection: EventSubscription.State?
    /// A running turn opens at its newest step and follows it until the user scrolls up; a finished one opens at its start.
    private var followsEnd = false
    private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: Self.layout())
    private lazy var dataSource = makeDataSource()

    init(client: BirdsongClient, sessionId: String, turnId: String) {
        subscription = EventSubscription(client: client, path: ["sessions", sessionId, "turns", turnId, "events"])
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Turn Details"
        view.backgroundColor = .systemBackground
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            systemItem: .close,
            primaryAction: UIAction { [weak self] _ in self?.dismiss(animated: true) }
        )
        collectionView.frame = view.bounds
        collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        collectionView.delegate = self
        collectionView.allowsSelection = false
        view.addSubview(collectionView)

        subscription.onEvent = { [weak self] event in
            switch event {
            case .turnDetail(let detail): self?.apply(detail)
            case .turnGone: self?.showGone()
            default: break
            }
        }
        subscription.onState = { [weak self] state in
            self?.connection = state
            self?.updateSubtitle()
            self?.setNeedsUpdateContentUnavailableConfiguration()
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        subscription.start()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        subscription.stop()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if followsEnd { scrollToEnd() }
    }

    override func updateContentUnavailableConfiguration(using state: UIContentUnavailableConfigurationState) {
        if isGone {
            var config = UIContentUnavailableConfiguration.empty()
            config.text = "This turn was removed"
            contentUnavailableConfiguration = config
        } else if status != nil {
            contentUnavailableConfiguration = nil
        } else if case .offline(let message) = connection {
            var config = UIContentUnavailableConfiguration.empty()
            config.image = UIImage(systemName: "exclamationmark.triangle")
            config.text = "Can't load this turn"
            config.secondaryText = message
            contentUnavailableConfiguration = config
        } else {
            contentUnavailableConfiguration = UIContentUnavailableConfiguration.loading()
        }
    }

    private func apply(_ detail: RemoteTurnDetail) {
        if status == nil { followsEnd = detail.status == .running }
        status = detail.status
        let changed = detail.items.map(\.id).filter { items[$0] != nil }
        for item in detail.items { items[item.id] = item }

        var snapshot = NSDiffableDataSourceSnapshot<Int, String>()
        snapshot.appendSections([0])
        snapshot.appendItems(detail.order.filter { items[$0] != nil })
        snapshot.reconfigureItems(changed.filter { snapshot.indexOfItem($0) != nil })
        dataSource.apply(snapshot, animatingDifferences: false) { [weak self] in
            guard let self, followsEnd else { return }
            scrollToEnd()
        }
        updateSubtitle()
        setNeedsUpdateContentUnavailableConfiguration()
    }

    /// A queued prompt that was discarded.
    private func showGone() {
        subscription.stop()
        isGone = true
        dataSource.apply(NSDiffableDataSourceSnapshot<Int, String>(), animatingDifferences: false)
        navigationItem.subtitle = nil
        setNeedsUpdateContentUnavailableConfiguration()
    }

    private func updateSubtitle() {
        guard let status, !isGone else { return }
        navigationItem.subtitle = if case .offline = connection {
            "Reconnecting…"
        } else {
            switch status {
            case .running: "Working…"
            case .stopped: "Stopped"
            case .complete: nil
            }
        }
    }

    private var isAtEnd: Bool {
        let visibleBottom = collectionView.contentOffset.y + collectionView.bounds.height - collectionView.adjustedContentInset.bottom
        return visibleBottom >= collectionView.contentSize.height - 40
    }

    private func scrollToEnd() {
        let inset = collectionView.adjustedContentInset
        let end = collectionView.contentSize.height - collectionView.bounds.height + inset.bottom
        collectionView.contentOffset.y = max(-inset.top, end)
    }

    private static func layout() -> UICollectionViewLayout {
        var config = UICollectionLayoutListConfiguration(appearance: .plain)
        config.showsSeparators = false
        config.backgroundColor = .systemBackground
        return UICollectionViewCompositionalLayout.list(using: config)
    }

    private func makeDataSource() -> UICollectionViewDiffableDataSource<Int, String> {
        let step = UICollectionView.CellRegistration<TurnStepCell, String> { [weak self] cell, _, id in
            guard let item = self?.items[id] else { return }
            cell.configure(with: item)
        }
        return UICollectionViewDiffableDataSource(collectionView: collectionView) { collectionView, indexPath, id in
            collectionView.dequeueConfiguredReusableCell(using: step, for: indexPath, item: id)
        }
    }
}

extension TurnDetailsViewController: UICollectionViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        guard scrollView.isTracking || scrollView.isDecelerating else { return }
        followsEnd = status == .running && isAtEnd
    }
}
