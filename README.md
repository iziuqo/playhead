# Playhead 🎹 — a real piano in Figma

A sampled grand piano you play with your computer keyboard, right inside Figma.
Learn songs with falling notes, beat the **Daily Tune**, record a take and share it as a link.
Built as a **Figma Make** app and posted as a Community **riff**, so anyone can play it live and remix it.

**Play it:** https://ribbon-game-22428059.figma.site · **Figma Community:** https://www.figma.com/@heyizaias (riff + remixable Make file)

| | |
|---|---|
| **Play** | `A S D F G H J K L ; '` white keys · `W E T Y U O P` black keys · `Z`/`X` octave · `Space` sustain · `R` record |
| **Learn** | 5 public-domain songs as falling notes. *Waits for you* (learning) or *Keeps time* (scored) |
| **Daily** | One 10-note tune per day, same for everyone. Score, streak 🔥, shareable emoji grid |
| **Share** | Record → link copied. The melody lives in the link itself (no server) |

## Run it locally

```bash
npm ci
npm run dev      # http://localhost:5173
npm test         # unit tests for the core
npm run build    # production build into dist/
```

Requirements: Node 20+. No accounts, keys or environment variables.

## How it's organized

```
src/
  core/            Pure TypeScript, no React. Unit-tested.
    audio/         AudioEngine (Web Audio sampler + reverb), computer-keyboard map
    music/         Note helpers, score notation, songs, Daily Tune generator, PracticeSession game logic
    codec/         Melody ⇄ compact URL string (share links)
  ui/              React layer
    usePiano.ts    Sound, pressed keys, keyboard input, recording, playback
    useGame.ts     Runs one Learn/Daily round
    Keyboard.tsx   The on-screen piano (accessible buttons, glissando, multi-touch)
    Brand.tsx      Logo: a mini piano whose playhead follows the notes you play
    FocusCue.tsx   Pill that asks for a click when the page can't hear the keyboard
    useKeyboardFocus.ts  Auto-focus + focus detection (Figma runs the app in an iframe)
    Credit.tsx     "made by" signature with its hover micro-interaction
    Stage.tsx      The <canvas> above the keys: rising trails and falling notes
    layout.ts      Key geometry shared by Keyboard and Stage
    share.ts / streak.ts / samples.ts
  App.tsx          Screens and wiring
  styles.css       Design tokens and all styles
.figma/make/       Scripts Figma Make uses to install, preview and publish
tools/prototype-latency-spike/   Dev plugin that tests a no-code prototype piano (see its README)
```

Rules of thumb:
- Logic goes in `core/` (testable, no DOM besides Web Audio). UI goes in `ui/`.
- Per-frame visuals never go through React state: `Stage` subscribes to note signals.
- Add a song by appending one line to `src/core/music/songs.ts`. **Public-domain melodies only.**

## Collaborating (Ethan, start here)

1. Ask Izaias for **write access** to this repo and **edit access** to the Make file.
2. Clone and run:
   ```bash
   git clone https://github.com/iziuqo/playhead && cd playhead
   npm ci && npm run dev
   ```
3. With Claude: add `iziuqo/playhead` to your Claude project (Project settings → Repositories).
   Claude reads `CLAUDE.md` for the rules, including who commits are authored as.
4. Work on a branch, open a pull request, and let CI (tests + build) pass before merging.
5. Shipping to Figma: the Make file is the published riff. A new version is imported from
   this repo by Izaias (Make files can't be overwritten by a re-import, so each release
   goes into a fresh Make file and the riff is updated to point at it).

In Figma Make itself you can also prompt or edit code directly; Make runs `.figma/make/dev`.

## Credits

- Piano samples: [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3) by Alexander Holm, **CC BY 3.0**.
- Design & code: **[Izaias Cavalcanti](https://portfolio.izaias.xyz)**. MIT licensed.
