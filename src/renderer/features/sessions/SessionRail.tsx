import { SettingsMenu } from "../settings/SettingsMenu";
import { VoiceButton } from "../voice/VoiceButton";
import { VoiceLogButton } from "../voiceLog/VoiceLogButton";
import { RailModeBar } from "../explorer/RailModeBar";
import { SessionList, type SessionListProps } from "./SessionList";
import { startRailResize } from "./startRailResize";
import "./sessionRail.css";
import "./sessionRailRow.css";
import "./sessionSpinner.css";
import "./sessionRailPin.css";

/** Left rail: mode icons, then the session list, then the footer. */
export function SessionRail(props: SessionListProps) {
  return (
    <aside className="rail" aria-label="Tabs">
      <div
        className="rail-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize tabs"
        onPointerDown={startRailResize}
      />
      <RailModeBar hasSessions={props.pinned.length + props.unpinned.length > 0} />
      <SessionList {...props} />
      <div className="rail-footer">
        <VoiceLogButton />
        <VoiceButton />
        <SettingsMenu />
      </div>
    </aside>
  );
}
