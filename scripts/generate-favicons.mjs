import sharp from 'sharp'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

function svgForTheme(bg, size) {
  const rx = Math.round(size * (44 / 180))
  const inner = size * (108 / 180)
  const pad = (size - inner) / 2
  const scale = inner / 24
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect fill="${bg}" width="${size}" height="${size}" rx="${rx}" />
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="none" stroke="#fafafa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m18 2 4 4" />
    <path d="m17 7 3-3" />
    <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
    <path d="m9 11 4 4" />
    <path d="m5 19-3 3" />
    <path d="m14 4 6 6" />
  </g>
</svg>`
}

const light = '#2d7dcc'
const dark = '#3d92e0'

async function main() {
  const s32 = Buffer.from(svgForTheme(light, 32))
  const s32d = Buffer.from(svgForTheme(dark, 32))
  const apple = Buffer.from(svgForTheme(light, 180))

  await sharp(s32).png().toFile(join(publicDir, 'icon-light-32x32.png'))
  await sharp(s32d).png().toFile(join(publicDir, 'icon-dark-32x32.png'))
  await sharp(apple).png().toFile(join(publicDir, 'apple-icon.png'))

  try {
    execSync(
      'magick icon-light-32x32.png -define icon:auto-resize=32,16 favicon.ico',
      { cwd: publicDir, stdio: 'ignore' }
    )
  } catch {
    /* optional; requires ImageMagick in PATH */
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
