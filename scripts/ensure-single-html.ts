import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found — run vite build first')
  process.exit(1)
}

const keep = new Set(['index.html'])
let removed = 0

for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
  if (keep.has(entry.name)) continue
  const full = path.join(distDir, entry.name)
  fs.rmSync(full, { recursive: true, force: true })
  removed += 1
}

console.log(`Playable build ready: dist/index.html (${removed} extra path(s) removed)`)
