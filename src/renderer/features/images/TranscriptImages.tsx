import { memo, useCallback, useState, type MouseEvent } from "react";
import { imageViewer } from "./imageViewerStore";
import { transcriptImageUrl } from "./transcriptImageUrl";
import "./images.css";

/** Images an agent's tools returned or viewed; click one to view it, right-click to copy or save it. */
export const TranscriptImages = memo(function TranscriptImages({ names }: { names?: string[] }) {
  if (!names?.length) return null;
  return (
    <div className="transcript-images">
      {names.map((name) => <TranscriptImage key={name} name={name} />)}
    </div>
  );
});

const TranscriptImage = memo(function TranscriptImage({ name }: { name: string }) {
  const [missing, setMissing] = useState(false);
  const open = useCallback(() => imageViewer.open(name), [name]);
  const markMissing = useCallback(() => setMissing(true), []);
  const openMenu = useCallback((event: MouseEvent) => {
    event.preventDefault();
    void window.birdsong.showImageContextMenu(name);
  }, [name]);
  if (missing) return <div className="transcript-image-missing">Image unavailable</div>;
  return (
    <button
      type="button"
      className="transcript-image"
      onClick={open}
      onContextMenu={openMenu}
      aria-label="View image"
    >
      <img src={transcriptImageUrl(name)} alt="" loading="lazy" onError={markMissing} />
    </button>
  );
});
