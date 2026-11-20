import UIKit

/// The mic in the navigation bar: starts or stops voice, shows what the agent is doing, and explains failures.
final class VoiceBarButtonItem: UIBarButtonItem {
    private let voice: VoiceController
    private weak var presenter: UIViewController?

    init(voice: VoiceController, presenter: UIViewController) {
        self.voice = voice
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
        voice.toggle()
    }

    @objc private func voiceChanged() {
        update()
        guard voice.state == .off, let error = voice.error, let presenter, presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil
        else { return }
        let alert = UIAlertController(title: "Voice stopped", message: error, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .cancel))
        alert.addAction(UIAlertAction(title: "Try Again", style: .default) { [voice] _ in voice.start() })
        presenter.present(alert, animated: true)
    }

    private func update() {
        let isVoiceOn = voice.state != .off
        style = isVoiceOn ? .prominent : .plain
        tintColor = isVoiceOn ? .systemIndigo : nil
        removeAllSymbolEffects()
        switch voice.state {
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
