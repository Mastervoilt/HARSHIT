
import { base64ToPcm16, pcm16ToFloat32 } from "./audio-utils";

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;

  constructor() {}

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

  playChunk(base64Data: string) {
    this.initContext();
    if (!this.audioContext) return;

    const pcm16 = base64ToPcm16(base64Data);
    const float32 = pcm16ToFloat32(pcm16);
    
    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    
    source.start(startTime);
    this.nextStartTime = startTime + buffer.duration;
  }

  stop() {
    this.audioContext?.close();
    this.audioContext = null;
    this.nextStartTime = 0;
  }

  interrupt() {
    // Basic interruption: stop the current context and create a new one for next chunks
    // More advanced would be to keep track of sources and stop them
    this.stop();
  }
}
