// Spike: builds a one-octave piano whose keys play real sound in the prototype.
// Each key is a rectangle with a VIDEO fill (sound + a glow animation).
// Pressing the mapped computer key or clicking the key runs: skip to 0 → play.
async function build() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' })
  const WHITE_W = 64, WHITE_H = 256, BLACK_W = 40, BLACK_H = 160, PAD = 48
  const whites = NOTES.filter(n => !n.black)
  const frame = figma.createFrame()
  frame.name = 'Playhead spike'
  frame.resize(whites.length * WHITE_W + PAD * 2, WHITE_H + PAD * 2 + 40)
  frame.x = 100; frame.y = 100
  frame.fills = [{ type: 'SOLID', color: { r: 0.055, g: 0.055, b: 0.063 } }]
  frame.cornerRadius = 24

  const keyReactions = []
  let whiteIndex = 0
  const blacks = []
  for (const note of NOTES) {
    const video = await figma.createVideoAsync(figma.base64Decode(note.b64))
    const key = figma.createRectangle()
    key.name = `Key ${note.name} (${note.key})`
    if (note.black) {
      key.resize(BLACK_W, BLACK_H)
      key.x = PAD + whiteIndex * WHITE_W - BLACK_W / 2
      key.y = PAD
      blacks.push(key)
    } else {
      key.resize(WHITE_W - 2, WHITE_H)
      key.x = PAD + whiteIndex * WHITE_W + 1
      key.y = PAD
      whiteIndex++
    }
    key.bottomLeftRadius = key.bottomRightRadius = 8
    key.fills = [{ type: 'VIDEO', scaleMode: 'FILL', videoHash: video.hash }]
    frame.appendChild(key)
    const actions = [
      { type: 'UPDATE_MEDIA_RUNTIME', destinationId: key.id, mediaAction: 'SKIP_TO', newTimestamp: 0 },
      { type: 'UPDATE_MEDIA_RUNTIME', destinationId: key.id, mediaAction: 'PLAY' },
    ]
    await key.setReactionsAsync([{ trigger: { type: 'MOUSE_DOWN', delay: 0 }, actions }])
    keyReactions.push({ trigger: { type: 'ON_KEY_DOWN', device: 'KEYBOARD', keyCodes: [note.keyCode] }, actions })

    const label = figma.createText()
    label.fontName = { family: 'Inter', style: 'Medium' }
    label.characters = note.key
    label.fontSize = 11
    label.fills = [{ type: 'SOLID', color: note.black ? { r: 1, g: 1, b: 1 } : { r: 0.3, g: 0.3, b: 0.3 }, opacity: 0.6 }]
    frame.appendChild(label)
    label.x = key.x + key.width / 2 - label.width / 2
    label.y = key.y + key.height - 22
  }
  blacks.forEach(b => frame.appendChild(b)) // keep black keys on top
  frame.children.filter(n => n.type === 'TEXT').forEach(t => frame.appendChild(t))
  await frame.setReactionsAsync(keyReactions)
  figma.currentPage.flowStartingPoints = [{ nodeId: frame.id, name: 'Play the piano' }]
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  figma.closePlugin(`Built ${NOTES.length} playable keys`)
}
build().catch(e => figma.closePlugin('Error: ' + e.message))
