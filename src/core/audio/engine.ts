import { midiToFrequency } from '../music/notes'

/**
 * Playhead's sound engine: a small polyphonic sampler on the Web Audio API.
 *
 * Signal chain:  voice → (timbre filter) → master gain → room reverb (wet)
 *                                                    ↘ dry ─────────────→ compressor → speakers
 *
 * Usage:
 *   const engine = new AudioEngine()
 *   await engine.loadSamples({ 60: urlOfC4, 63: urlOfDs4, … })
 *   engine.noteOn(60, 0.8); engine.noteOff(60)
 *
 * Until samples finish loading, a soft synth plays so the very first key
 * press is never silent.
 */
export type Timbre = 'grand' | 'felt' | 'musicbox'

interface Voice {
  output: GainNode
  sources: AudioScheduledSourceNode[]
}

const RELEASE_SECONDS: Record<Timbre, number> = { grand: 0.35, felt: 0.25, musicbox: 1.2 }
const MAX_VOICES = 48

export class AudioEngine {
  readonly context: AudioContext
  timbre: Timbre = 'grand'
  private readonly bus: GainNode
  private readonly samples = new Map<number, AudioBuffer>()
  private readonly voices = new Map<number, Voice>()
  private readonly sustained = new Set<number>()
  private sustainOn = false

  constructor(context = new AudioContext({ latencyHint: 'interactive' })) {
    this.context = context
    const compressor = new DynamicsCompressorNode(context, { threshold: -14, ratio: 4 })
    const reverb = new ConvolverNode(context, { buffer: makeRoomImpulse(context) })
    const wet = new GainNode(context, { gain: 0.22 })
    this.bus = new GainNode(context, { gain: 0.8 })

    this.bus.connect(compressor)
    this.bus.connect(reverb).connect(wet).connect(compressor)
    compressor.connect(context.destination)
  }

  /** Browsers start audio suspended; call from any user gesture. Safe to repeat. */
  unlock(): Promise<void> {
    return this.context.state === 'running' ? Promise.resolve() : this.context.resume()
  }

  /** Fetches and decodes samples keyed by MIDI number. Works with file and data: URLs. */
  async loadSamples(urls: Readonly<Record<number, string>>): Promise<void> {
    await Promise.all(
      Object.entries(urls).map(async ([midi, url]) => {
        const data = await (await fetch(url)).arrayBuffer()
        this.samples.set(Number(midi), await this.context.decodeAudioData(data))
      }),
    )
  }

  set volume(value: number) {
    this.bus.gain.setTargetAtTime(value, this.context.currentTime, 0.02)
  }

  /** Starts a note now, or at `when` (AudioContext time) for scheduled playback. */
  noteOn(midi: number, velocity = 0.8, when = this.context.currentTime): void {
    this.stopVoice(midi, when, 0.03)
    if (this.voices.size >= MAX_VOICES) this.stopVoice(this.voices.keys().next().value!, when, 0.03)

    const output = new GainNode(this.context, { gain: 0 })
    const peak = 0.15 + 0.85 * velocity ** 1.6
    output.gain.setValueAtTime(0, when)
    output.gain.linearRampToValueAtTime(peak, when + 0.004)
    output.connect(this.bus)

    const sources =
      this.timbre === 'musicbox' || !this.samples.size
        ? this.synthVoice(midi, output, when)
        : this.sampledVoice(midi, velocity, output, when)
    this.voices.set(midi, { output, sources })
    this.sustained.delete(midi)
  }

  noteOff(midi: number, when = this.context.currentTime): void {
    if (this.sustainOn) this.sustained.add(midi)
    else this.stopVoice(midi, when, RELEASE_SECONDS[this.timbre])
  }

  /** Damper pedal: held notes keep ringing until released. */
  setSustain(on: boolean): void {
    this.sustainOn = on
    if (on) return
    this.sustained.forEach((midi) => this.stopVoice(midi, this.context.currentTime, RELEASE_SECONDS[this.timbre]))
    this.sustained.clear()
  }

  /** Silences everything immediately (e.g. when a song is stopped). */
  panic(): void {
    ;[...this.voices.keys()].forEach((midi) => this.stopVoice(midi, this.context.currentTime, 0.05))
  }

  private sampledVoice(midi: number, velocity: number, output: GainNode, when: number) {
    const [root, buffer] = this.nearestSample(midi)
    const source = new AudioBufferSourceNode(this.context, {
      buffer,
      playbackRate: 2 ** ((midi - root) / 12),
    })
    // Felt = darker and softer; harder strikes also open the filter (brighter).
    const brightness = this.timbre === 'felt' ? 900 + 1200 * velocity : 4000 + 14000 * velocity
    const tone = new BiquadFilterNode(this.context, { type: 'lowpass', frequency: brightness, Q: 0.3 })
    source.connect(tone).connect(output)
    source.start(when)
    return [source]
  }

  /** Music-box bell: a sine plus a quiet, quickly decaying overtone. */
  private synthVoice(midi: number, output: GainNode, when: number) {
    const frequency = midiToFrequency(midi)
    return [1, 4].map((multiple, i) => {
      const oscillator = new OscillatorNode(this.context, { frequency: frequency * multiple })
      const partial = new GainNode(this.context, { gain: i ? 0.12 : 0.5 })
      partial.gain.setTargetAtTime(0, when, i ? 0.08 : 0.9)
      oscillator.connect(partial).connect(output)
      oscillator.start(when)
      return oscillator
    })
  }

  private nearestSample(midi: number): [number, AudioBuffer] {
    let best: [number, AudioBuffer] | undefined
    for (const entry of this.samples) {
      if (!best || Math.abs(entry[0] - midi) < Math.abs(best[0] - midi)) best = entry
    }
    return best!
  }

  private stopVoice(midi: number, when: number, release: number): void {
    const voice = this.voices.get(midi)
    if (!voice) return
    voice.output.gain.cancelScheduledValues(when)
    voice.output.gain.setTargetAtTime(0, when, release / 4)
    voice.sources.forEach((s) => s.stop(when + release * 2))
    this.voices.delete(midi)
  }
}

/** A short, generated "small room" impulse response: decaying stereo noise. */
function makeRoomImpulse(context: BaseAudioContext, seconds = 1.6): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds)
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3
  }
  return impulse
}
