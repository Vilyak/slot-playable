/**
 * Candy slot assets from AI PNGs:
 * - machine_frame / btn_spin: chroma-key pure green (#00FF00-ish) → alpha
 * - symbols / coin: largest colorful subject extract
 * Writes window.json with measured reel-hole bounds for SlotService.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const artDirCandidates = [
  path.join(root, 'art_source'),
  process.env.SLOT_ART_DIR,
  path.join(
    process.env.USERPROFILE || '',
    '.cursor',
    'projects',
    'd-Workspace-PLAYABLES-slot-playable',
    'assets',
  ),
].filter(Boolean) as string[]

const artDirFound = artDirCandidates.find((dir) => fs.existsSync(dir))
if (!artDirFound) {
  console.error('No art_source/ found')
  process.exit(1)
}
const artDir = artDirFound
const outDir = path.join(root, 'raw_assets', 'slot')
const publicDir = path.join(root, 'public')
const generatedRoot = path.join(root, 'src', 'assets', 'generated')

function sat(r: number, g: number, b: number) {
  return Math.max(r, g, b) - Math.min(r, g, b)
}
function lum(r: number, g: number, b: number) {
  return r + g + b
}

/** Pure chroma green screen (and near-green spill). */
function isChromaGreen(r: number, g: number, b: number) {
  // strong green channel, green dominates red/blue
  if (g < 140) return false
  if (g < r + 35) return false
  if (g < b + 35) return false
  // also catch bright lime / #00FF00 family
  if (g > 200 && r < 120 && b < 120) return true
  if (g > 160 && r < 90 && b < 90) return true
  return g - Math.max(r, b) >= 40
}

function isChecker(r: number, g: number, b: number) {
  const s = sat(r, g, b)
  const m = Math.max(r, g, b)
  if (s > 28) return false
  return m >= 165
}

function isSubjectPixel(r: number, g: number, b: number) {
  if (isChromaGreen(r, g, b) || isChecker(r, g, b)) return false
  if (sat(r, g, b) >= 26) return true
  if (lum(r, g, b) < 90) return true
  return false
}

function nearTransparent(data: Buffer, width: number, height: number, x: number, y: number) {
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ] as const) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
    if (data[(ny * width + nx) * 4 + 3]! < 20) return true
  }
  return false
}

function chromaToAlpha(data: Buffer, width: number, height: number) {
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    if (isChromaGreen(data[o]!, data[o + 1]!, data[o + 2]!)) {
      data[o + 3] = 0
    }
  }
  // Kill green / dark / soft fringe next to transparent
  for (let pass = 0; pass < 3; pass++) {
    const kill: number[] = []
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const o = (y * width + x) * 4
        const a = data[o + 3]!
        if (a < 8) continue
        if (!nearTransparent(data, width, height, x, y)) continue
        const r = data[o]!
        const g = data[o + 1]!
        const b = data[o + 2]!
        const greenish = g > r + 12 && g > b + 12 && g > 90
        const darkHalo = r + g + b < 140 && a < 230
        const softEdge = a < 180
        if (greenish || darkHalo || softEdge) kill.push(o)
      }
    }
    for (const o of kill) data[o + 3] = 0
  }
  // Harden remaining alpha: no mushy edges
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const a = data[o + 3]!
    if (a === 0 || a === 255) continue
    data[o + 3] = a < 128 ? 0 : 255
  }
}

function extractLargestSubject(data: Buffer, width: number, height: number) {
  const n = width * height
  const label = new Int32Array(n).fill(-1)
  const sizes: number[] = []
  let next = 0
  const idx = (x: number, y: number) => y * width + x

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y)
      if (label[i]! >= 0) continue
      const o = i * 4
      if (!isSubjectPixel(data[o]!, data[o + 1]!, data[o + 2]!)) continue
      const stack = [i]
      label[i] = next
      let size = 0
      while (stack.length) {
        const cur = stack.pop()!
        size++
        const cx = cur % width
        const cy = (cur / width) | 0
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const ni = idx(nx, ny)
          if (label[ni]! >= 0) continue
          const no = ni * 4
          if (!isSubjectPixel(data[no]!, data[no + 1]!, data[no + 2]!)) continue
          label[ni] = next
          stack.push(ni)
        }
      }
      sizes[next++] = size
    }
  }

  let best = -1
  let bestSize = 0
  for (let id = 0; id < next; id++) {
    if ((sizes[id] ?? 0) > bestSize) {
      bestSize = sizes[id]!
      best = id
    }
  }

  const keep = new Uint8Array(n)
  if (best >= 0) for (let i = 0; i < n; i++) if (label[i] === best) keep[i] = 1

  const dilate = new Uint8Array(n)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!keep[idx(x, y)]) continue
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dy * dy > 8) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          dilate[idx(nx, ny)] = 1
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const o = i * 4
    if (!dilate[i]) {
      data[o + 3] = 0
      continue
    }
    if (isChromaGreen(data[o]!, data[o + 1]!, data[o + 2]!) || isChecker(data[o]!, data[o + 1]!, data[o + 2]!)) {
      data[o + 3] = 0
    }
  }
}

async function processChroma(
  name: string,
  size: { w: number; h: number } | number,
): Promise<{ width: number; height: number; data: Buffer }> {
  const src = path.join(artDir, name)
  if (!fs.existsSync(src)) throw new Error(`Missing ${src}`)
  const w = typeof size === 'number' ? size : size.w
  const h = typeof size === 'number' ? size : size.h

  let img = sharp(fs.readFileSync(src)).ensureAlpha()
  const meta = await img.metadata()
  // resize keeping aspect into box
  img = img.resize(w, h, {
    fit: 'contain',
    background: { r: 0, g: 255, b: 0, alpha: 1 },
  })
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  chromaToAlpha(data, info.width, info.height)

  let png = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 2 })
    .png()
    .toBuffer()

  // Binary alpha only — keep colored frame chrome intact
  {
    const t = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (let i = 0; i < t.info.width * t.info.height; i++) {
      const o = i * 4
      const a = t.data[o + 3]!
      if (a > 0 && a < 255) t.data[o + 3] = a < 128 ? 0 : 255
    }
    png = await sharp(t.data, {
      raw: { width: t.info.width, height: t.info.height, channels: 4 },
    })
      .png()
      .toBuffer()
  }

  // re-read after trim for hole measure
  const trimmed = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  fs.writeFileSync(path.join(outDir, name), png)
  console.log(`  ✓ ${name} (chroma) from ${meta.width}x${meta.height}`)
  return { width: trimmed.info.width, height: trimmed.info.height, data: trimmed.data }
}

async function hardenFinalPng(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  // Strip dark / soft / green halo after resize AA
  for (let pass = 0; pass < 3; pass++) {
    const kill: number[] = []
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const o = (y * width + x) * 4
        const a = data[o + 3]!
        if (a < 8) continue
        if (!nearTransparent(data, width, height, x, y)) continue
        const r = data[o]!
        const g = data[o + 1]!
        const b = data[o + 2]!
        const lum = (r + g + b) / 3
        if (a < 220 || lum < 70 || (g > r + 15 && g > b + 15 && g > 80)) kill.push(o)
      }
    }
    for (const o of kill) {
      data[o] = 0
      data[o + 1] = 0
      data[o + 2] = 0
      data[o + 3] = 0
    }
  }
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const a = data[o + 3]!
    if (a > 0 && a < 255) data[o + 3] = a < 160 ? 0 : 255
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function processSubject(name: string, size: number) {
  const src = path.join(artDir, name)
  if (!fs.existsSync(src)) throw new Error(`Missing ${src}`)
  // Prefer chroma green cutout for clean edges; fall back to subject extract
  const { data, info } = await sharp(fs.readFileSync(src))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let greenCount = 0
  for (let i = 0; i < info.width * info.height; i++) {
    if (isChromaGreen(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!)) greenCount++
  }
  const greenRatio = greenCount / (info.width * info.height)

  if (greenRatio > 0.15) {
    chromaToAlpha(data, info.width, info.height)
  } else {
    extractLargestSubject(data, info.width, info.height)
  }

  const resized = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 4 })
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer()

  const png = await hardenFinalPng(resized)
  fs.writeFileSync(path.join(outDir, name), png)
  console.log(`  ✓ ${name} (${greenRatio > 0.15 ? 'chroma' : 'subject'})`)
}

function measureHole(data: Buffer, width: number, height: number) {
  // Find largest contiguous transparent region (reel window), ignore tiny holes
  const visited = new Uint8Array(width * height)
  const idx = (x: number, y: number) => y * width + x
  let best = { minX: 0, minY: 0, maxX: 0, maxY: 0, size: 0 }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(x, y)
      if (visited[i] || data[i * 4 + 3]! > 12) continue
      // flood
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y
      let size = 0
      const stack = [i]
      visited[i] = 1
      while (stack.length) {
        const cur = stack.pop()!
        size++
        const cx = cur % width
        const cy = (cur / width) | 0
        if (cx < minX) minX = cx
        if (cy < minY) minY = cy
        if (cx > maxX) maxX = cx
        if (cy > maxY) maxY = cy
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const ni = idx(nx, ny)
          if (visited[ni] || data[ni * 4 + 3]! > 12) continue
          visited[ni] = 1
          stack.push(ni)
        }
      }
      // Prefer interior window: not touching image border (outer chroma)
      const touchesBorder = minX <= 1 || minY <= 1 || maxX >= width - 2 || maxY >= height - 2
      if (touchesBorder) continue
      if (size > best.size) best = { minX, minY, maxX, maxY, size }
    }
  }

  if (best.size < 800) {
    const side = Math.floor(Math.min(width, height) * 0.5)
    const minX = Math.floor((width - side) / 2)
    const minY = Math.floor(height * 0.3)
    return { texW: width, texH: height, x: minX, y: minY, w: side, h: side }
  }

  return {
    texW: width,
    texH: height,
    x: best.minX,
    y: best.minY,
    w: best.maxX - best.minX,
    h: best.maxY - best.minY,
  }
}

function writeWindowConfig(hole: ReturnType<typeof measureHole>) {
  fs.mkdirSync(generatedRoot, { recursive: true })
  const content = `// Auto-generated by scripts/generate-slot-assets.ts — do not edit.
export const FrameWindow = {
  texW: ${hole.texW},
  texH: ${hole.texH},
  x: ${hole.x},
  y: ${hole.y},
  w: ${hole.w},
  h: ${hole.h},
} as const
`
  fs.writeFileSync(path.join(generatedRoot, 'FrameWindow.ts'), content, 'utf8')
  console.log(
    `  ✓ FrameWindow ${hole.w}x${hole.h} @ (${hole.x},${hole.y}) in ${hole.texW}x${hole.texH}`,
  )
}

function confettiSvg(fill: string, stroke: string) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <g transform="rotate(-28 32 32)">
    <rect x="18" y="22" width="28" height="18" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <ellipse cx="28" cy="27" rx="8" ry="3" fill="#fff" opacity="0.5"/>
  </g>
</svg>`)
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  fs.mkdirSync(publicDir, { recursive: true })
  console.log(`Art source: ${artDir}`)

  await processSubject('symbol_circle.png', 192)
  await processSubject('symbol_star.png', 192)
  await processSubject('symbol_heart.png', 192)
  await processSubject('symbol_diamond.png', 192)
  await processSubject('symbol_triangle.png', 192)
  await processSubject('coin.png', 96)

  const frame = await processChroma('machine_frame.png', { w: 560, h: 720 })
  writeWindowConfig(measureHole(frame.data, frame.width, frame.height))

  await processChroma('btn_spin.png', { w: 420, h: 160 })

  for (const [name, fill, stroke] of [
    ['confetti_0.png', '#ff5da8', '#d81b60'],
    ['confetti_1.png', '#ffd54f', '#f9a825'],
    ['confetti_2.png', '#40c4ff', '#0288d1'],
    ['confetti_3.png', '#69f0ae', '#00c853'],
    ['confetti_4.png', '#e040fb', '#8e24aa'],
  ] as const) {
    fs.writeFileSync(
      path.join(outDir, name),
      await sharp(confettiSvg(fill, stroke)).png().toBuffer(),
    )
    console.log(`  ✓ ${name}`)
  }

  const bgSrc = path.join(artDir, 'bg.png')
  if (fs.existsSync(bgSrc)) {
    fs.writeFileSync(
      path.join(publicDir, 'bg.png'),
      await sharp(fs.readFileSync(bgSrc)).resize(420, 760, { fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer(),
    )
    console.log('  ✓ public/bg.png')
  }

  // UI overlays for React popup / HUD (chroma → public)
  for (const [name, size] of [
    ['coin_hud.png', 96],
    ['hand_pointer.png', 220],
    ['property_0.png', 256],
    ['property_1.png', 256],
    ['property_2.png', 256],
  ] as const) {
    const src = path.join(artDir, name)
    if (!fs.existsSync(src)) continue
    const { data, info } = await sharp(fs.readFileSync(src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    chromaToAlpha(data, info.width, info.height)
    const resized = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim({ threshold: 4 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    const out = await hardenFinalPng(resized)
    const publicName =
      name === 'coin_hud.png'
        ? 'coinHud.png'
        : name === 'hand_pointer.png'
          ? 'handPointer.png'
          : name.replace('_', '')
    fs.writeFileSync(path.join(publicDir, publicName), out)
    console.log(`  ✓ public/${publicName}`)
  }

  console.log('Done → raw_assets/slot + FrameWindow.ts')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
