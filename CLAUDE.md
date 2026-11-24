# Playhead — notes for Claude

- Stack: Vite + React 18 + TypeScript (strict). No UI library, no state library. Plain CSS with tokens in `src/styles.css`.
- `src/core` must stay framework-free and covered by `src/core/core.test.ts`. Run `npm test` and `npm run build` before finishing.
- Keep it lean: no new dependencies without a strong reason. Document every module with a header comment.
- Songs must be public domain. Samples are CC BY 3.0 (credit stays in README and the app).
- This app ships as a Figma Make riff. Don't touch `.figma/make/*` unless the deploy contract changes.
- Git identity: every commit is authored and pushed as **Izaias Cavalcanti** (`182826885+iziuqo@users.noreply.github.com`). Never as Claude or anyone else, and add no co-author trailers.
