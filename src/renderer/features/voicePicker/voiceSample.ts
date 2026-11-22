let context: AudioContext | null = null;
let playing: { source: AudioBufferSourceNode; onEnded: () => void } | null = null;

/**
 * Plays one Inworld voice sample at a time. Decoded with Web Audio rather than an `<audio>` blob URL,
 * which the page's content security policy blocks.
 */
export const voiceSample = {
  async play(mp3: Uint8Array, onEnded: () => void): Promise<void> {
    voiceSample.stop();
    context ??= new AudioContext();
    await context.resume();
    // decodeAudioData detaches its buffer, so hand it a copy.
    const buffer = await context.decodeAudioData(mp3.slice().buffer);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const current = { source, onEnded };
    source.onended = () => {
      if (playing !== current) return;
      playing = null;
      onEnded();
    };
    playing = current;
    source.start();
  },

  stop(): void {
    const current = playing;
    if (!current) return;
    playing = null;
    current.source.stop();
    current.onEnded();
  },
};
