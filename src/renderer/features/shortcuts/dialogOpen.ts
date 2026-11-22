/** A native dialog, app modal, or image viewer is open, so window-level shortcuts should stand down. */
export function dialogOpen(): boolean {
  return document.querySelector("dialog[open], .modal-backdrop, .image-viewer") !== null;
}
