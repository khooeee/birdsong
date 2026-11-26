import type { AppSettings } from "../../shared/appSettings";
import type { Session } from "../../shared/session";
import { voiceInstructions } from "./voiceInstructions";
import { voiceToolDefs } from "./voiceToolDefs";
import { VOICE_TTS_MODEL } from "./voiceTtsModel";

/** `session.update` sent when the call is created: model, the session's instructions, voice, turn detection, tools. */
export function voiceSessionConfig(settings: AppSettings, session: Session) {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      model: settings.voiceModel,
      ...(settings.voiceReasoning !== "DEFAULT" && {
        text_generation_config: { reasoning: { effort: settings.voiceReasoning } },
      }),
      instructions: voiceInstructions(settings, session),
      output_modalities: ["audio"],
      audio: {
        input: {
          transcription: { model: "inworld/inworld-stt-1" },
          // Low eagerness: pauses mid-sentence (hands busy at the sink) don't end the turn.
          turn_detection: { type: "semantic_vad", eagerness: "low", create_response: true, interrupt_response: true },
        },
        output: { model: VOICE_TTS_MODEL, voice: settings.voiceName },
      },
      tools: voiceToolDefs,
      tool_choice: "auto",
      providerData: {
        stt: { voice_profile: false },
        // Send a turn's leading steering tag with the first TTS chunk only (Inworld's advice for tts-2).
        tts: { steering_handling: "emit_once" },
        memory: { enabled: true },
        responsiveness: { enabled: true },
      },
    },
  };
}
