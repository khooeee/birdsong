import UIKit

/// One session's prompts and replies, streaming, with a composer to send, steer or stop.
final class TranscriptViewController: UIViewController {
    private struct Row: Hashable {
        let turnId: String
        let isReply: Bool
    }

    private let client: BirdsongClient
    private let voice: VoiceController
    private let session: Session
    var sessionId: String { session.id }
    private let subscription: EventSubscription
    private let sessionSubscription: EventSubscription
    private var turns: [RemoteTurn] = []
    private var loaded = false
    /// Follow new output until the user scrolls up; scrolling back to the end resumes it.
    private var followsEnd = true
    private let composer = ComposerView()
    private let modelConfigBar: ModelConfigBar
    private lazy var collectionView = TranscriptCollectionView(frame: .zero, collectionViewLayout: UICollectionView.plainFeedLayout())
    private lazy var dataSource = makeDataSource()

    init(client: BirdsongClient, voice: VoiceController, session: Session) {
        self.client = client
        self.voice = voice
        self.session = session
        subscription = EventSubscription(client: client, path: ["sessions", session.id, "events"])
        sessionSubscription = EventSubscription(client: client, path: ["events"])
        modelConfigBar = ModelConfigBar(client: client, sessionId: session.id)
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = session.title.components(separatedBy: "\n").first
        navigationItem.largeTitleDisplayMode = .never
        navigationItem.subtitle = session.agent
        navigationItem.rightBarButtonItem = VoiceBarButtonItem(voice: voice, sessionId: session.id, presenter: self)
        view.backgroundColor = .systemBackground

        collectionView.delegate = self
        collectionView.allowsSelection = false
        collectionView.keyboardDismissMode = .interactive
        composer.onSend = { [weak self] text in self?.send(text) }
        composer.onStop = { [weak self] in self?.stop() }
        composer.resumeNotice = session.continuationNotice
        modelConfigBar.modelConfig = session.modelConfig
        modelConfigBar.onError = { [weak self] message in self?.showError(message, title: "Couldn't change the setting") }
        composer.addAccessory(modelConfigBar)
        for subview in [collectionView, composer] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(subview)
        }
        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: view.topAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: composer.topAnchor),
            composer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            composer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            composer.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        subscription.onEvent = { [weak self] event in self?.handle(event) }
        sessionSubscription.onEvent = { [weak self] event in self?.handle(event) }
        subscription.onState = { [weak self] state in
            guard let self else { return }
            navigationItem.subtitle = state.notice ?? session.agent
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        subscription.start()
        sessionSubscription.start()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        subscription.stop()
        sessionSubscription.stop()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // The keyboard or a growing composer shrinks the list; keep the newest reply in view.
        if followsEnd { scrollToEnd() }
    }

    override func updateContentUnavailableConfiguration(using state: UIContentUnavailableConfigurationState) {
        if !loaded {
            contentUnavailableConfiguration = UIContentUnavailableConfiguration.loading()
        } else if turns.isEmpty {
            var config = UIContentUnavailableConfiguration.empty()
            config.text = "No messages yet"
            contentUnavailableConfiguration = config
        } else {
            contentUnavailableConfiguration = nil
        }
    }

    private func handle(_ event: RemoteEvent) {
        switch event {
        case .reset(let next):
            let previous = Dictionary(turns.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            turns = next
            loaded = true
            apply(changed: next.filter { previous[$0.id] != nil && previous[$0.id] != $0 }.map(\.id))
        case .turn(let turn):
            if let index = turns.firstIndex(where: { $0.id == turn.id }) {
                guard turns[index] != turn else { return }
                turns[index] = turn
            } else {
                turns.append(turn)
            }
            apply(changed: [turn.id])
        case .sessions(let list):
            AppBadge.show(list.pinned + list.unpinned)
            let current = (list.pinned + list.unpinned).first { $0.id == session.id }
            composer.resumeNotice = current?.continuationNotice
            if let current { modelConfigBar.modelConfig = current.modelConfig }
            if current?.unread == true { markRead() }
        case .turnDetail, .turnGone:
            break
        }
    }

    /// Voice keeps the app running with the screen locked, where nobody is reading. A failed call is retried
    /// by the next rail update.
    private func markRead() {
        guard UIApplication.shared.applicationState != .background else { return }
        Task { try? await client.setUnread(false, sessionId: session.id) }
    }

    private func apply(changed: [String]) {
        var snapshot = NSDiffableDataSourceSnapshot<Int, Row>()
        snapshot.appendSections([0])
        snapshot.appendItems(turns.flatMap { turn -> [Row] in
            let reply = Row(turnId: turn.id, isReply: true)
            if turn.agentStarted == true { return [reply] }
            return [Row(turnId: turn.id, isReply: false), reply]
        })
        let changedRows = changed.flatMap { [Row(turnId: $0, isReply: false), Row(turnId: $0, isReply: true)] }
        snapshot.reconfigureItems(changedRows.filter { snapshot.indexOfItem($0) != nil })
        dataSource.apply(snapshot, animatingDifferences: false) { [weak self] in
            guard let self, followsEnd else { return }
            scrollToEnd()
        }
        composer.isRunning = turns.contains { $0.status == .running && $0.queued != true }
        setNeedsUpdateContentUnavailableConfiguration()
    }

    private func send(_ text: String) {
        followsEnd = true
        Task {
            do {
                try await client.sendPrompt(text, sessionId: session.id)
            } catch {
                composer.restore(text)
                showError(error)
            }
        }
    }

    private func stop() {
        Task {
            do { try await client.cancel(sessionId: session.id) } catch { showError(error) }
        }
    }

    /// A sheet, so this screen's streams stay open underneath and keep the session read.
    private func showDetails(_ turnId: String, openAtEnd: Bool) {
        let details = TurnDetailsViewController(client: client, sessionId: session.id, turnId: turnId, openAtEnd: openAtEnd)
        present(UINavigationController(rootViewController: details), animated: true)
    }

    private func showError(_ error: any Error) {
        showError(error.localizedDescription)
    }

    private func showError(_ message: String, title: String = "Couldn't reach Birdsong") {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    private func scrollToEnd() {
        collectionView.contentOffset.y = collectionView.endContentOffsetY
    }

    private func makeDataSource() -> UICollectionViewDiffableDataSource<Int, Row> {
        let prompt = UICollectionView.CellRegistration<TranscriptPromptCell, Row> { [weak self] cell, _, row in
            guard let turn = self?.turn(row.turnId) else { return }
            cell.configure(with: turn)
            cell.onDetails = { [weak self] in self?.showDetails(row.turnId, openAtEnd: false) }
        }
        let reply = UICollectionView.CellRegistration<TranscriptReplyCell, Row> { [weak self] cell, _, row in
            guard let turn = self?.turn(row.turnId) else { return }
            cell.configure(with: turn)
            cell.onDetails = { [weak self] in self?.showDetails(row.turnId, openAtEnd: true) }
        }
        return UICollectionViewDiffableDataSource(collectionView: collectionView) { collectionView, indexPath, row in
            if row.isReply {
                return collectionView.dequeueConfiguredReusableCell(using: reply, for: indexPath, item: row)
            }
            return collectionView.dequeueConfiguredReusableCell(using: prompt, for: indexPath, item: row)
        }
    }

    private func turn(_ id: String) -> RemoteTurn? {
        turns.last { $0.id == id }
    }
}

extension TranscriptViewController: UICollectionViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        guard scrollView.isTracking || scrollView.isDecelerating else { return }
        followsEnd = collectionView.isNearEnd
    }

    func collectionView(
        _ collectionView: UICollectionView,
        contextMenuConfigurationForItemsAt indexPaths: [IndexPath],
        point: CGPoint
    ) -> UIContextMenuConfiguration? {
        guard let row = indexPaths.first.flatMap(dataSource.itemIdentifier(for:)),
              let turn = turn(row.turnId)
        else { return nil }
        let details = UIAction(title: "Turn Details", image: UIImage(systemName: "info.circle")) { [weak self] _ in
            self?.showDetails(row.turnId, openAtEnd: row.isReply)
        }
        let copy = TurnCellConfigurator.copyText(turn, isReply: row.isReply).map { text in
            UIAction(title: "Copy", image: UIImage(systemName: "doc.on.doc")) { _ in UIPasteboard.general.string = text }
        }
        return UIContextMenuConfiguration(actionProvider: { _ in
            UIMenu(children: [copy, details].compactMap { $0 })
        })
    }
}
