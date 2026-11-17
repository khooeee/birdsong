/** Ask the prompt to take focus. */
export function requestPromptFocus(): void {
  window.dispatchEvent(new CustomEvent("birdsong:focus-prompt"));
}
