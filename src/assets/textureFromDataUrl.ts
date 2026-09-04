import { Texture } from 'pixi.js'

/** Pixi v8 treats string args to Texture.from as cache aliases, not URLs. */
export async function textureFromDataUrl(dataUrl: string): Promise<Texture> {
  const image = new Image()
  image.src = dataUrl
  await image.decode()
  return Texture.from(image)
}
