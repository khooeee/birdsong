import UIKit

/// A session's mic in the navigation bar: starts or stops voice on that session, shows what the agent is doing while
/// voice is on it, and explains failures.
final class VoiceBarButtonItem: UIBarButtonItem {
    private let voice: VoiceController
    private let sessionId: String
    private weak var presenter: UIViewController?

    init(voice: VoiceController, sessionId: String, presenter: UIViewController) {
        self.voice = voice
        self.sessionId = sessionId
        self.presenter = presenter
        super.init()
        target = self
        action = #selector(tapped)
        NotificationCenter.default.addObserver(self, selector: #selector(voiceChanged), name: VoiceController.didChange, object: voice)
        update()
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    @objc private func tapped() {
        voice.toggle(sessionId: sessionId)
    }

    @objc private func voiceChanged() {
        update()
        guard voice.state == .off, voice.sessionId == sessionId, let error = voice.error, let presenter,
              presenter.viewIfLoaded?.window != nil, presenter.presentedViewController == nil
        else { return }
        let alert = UIAlertController(title: "Voice stopped", message: error, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .cancel))
        alert.addAction(UIAlertAction(title: "Try Again", style: .default) { [voice, sessionId] _ in voice.start(sessionId: sessionId) })
        presenter.present(alert, animated: true)
    }

    private func update() {
        let isVoiceOn = voice.isOn(sessionId: sessionId)
        style = isVoiceOn ? .prominent : .plain
        tintColor = isVoiceOn ? .systemIndigo : nil
        removeAllSymbolEffects()
        switch isVoiceOn ? voice.state : .off {
        case .off:
            setSymbol("mic")
        case .connecting:
            setSymbol("mic.fill")
            addSymbolEffect(.pulse)
        case .live(.idle):
            setSymbol("mic.fill")
        case .live(.thinking):
            setSymbol("ellipsis")
            addSymbolEffect(.variableColor.iterative)
        case .live(.speaking):
            setSymbol("waveform")
            addSymbolEffect(.variableColor.iterative)
        }
        accessibilityLabel = isVoiceOn ? "Stop Voice" : "Start Voice"
    }

    private func setSymbol(_ name: String) {
        setSymbolImage(UIImage(systemName: name)!, contentTransition: .replace)
    }
}
