import '@esotericsoftware/spine-pixi-v8'
import { injectable } from 'tsyringe'
import { Assets, Spritesheet, Texture } from 'pixi.js'
import {
  AtlasAttachmentLoader,
  SkeletonBinary,
  SkeletonJson,
  Spine,
  type SkeletonData,
  type TextureAtlas,
} from '@esotericsoftware/spine-pixi-v8'
import {
  EmbeddedSpritesheets,
  type EmbeddedAtlasName,
} from '@/assets/generated/embeddedAssets'
import { Textures, type TextureAtlas as GeneratedTextureAtlas } from '@/assets/generated/Textures'
import { textureFromDataUrl } from '@/assets/textureFromDataUrl'
import {
  SpineAssetConfig,
  spineAtlasAlias,
  spineSkeletonAlias,
  type SpineSkeletonId,
} from '@/assets/spine.config'

@injectable()
export class AssetService {
  private loaded = false
  private readonly spineData = new Map<SpineSkeletonId, SkeletonData>()

  async loadAll(): Promise<void> {
    if (this.loaded) return

    await this.loadEmbeddedAtlases()
    await this.loadSpineAssets()

    this.loaded = true
  }

  getTexture(atlas: EmbeddedAtlasName, frame: string): Texture {
    const sheet = Assets.get<Spritesheet>(atlas)
    if (!(sheet instanceof Spritesheet) || !sheet.textures[frame]) {
      throw new Error(`Texture not found: ${atlas}/${frame}`)
    }
    return sheet.textures[frame]
  }

  getGeneratedTexture<A extends GeneratedTextureAtlas>(
    atlas: A,
    frame: keyof (typeof Textures)[A] & string,
  ): Texture {
    const frameName = Textures[atlas][frame] as string
    return this.getTexture(atlas, frameName)
  }

  isSpineLoaded(id: SpineSkeletonId): boolean {
    return this.spineData.has(id)
  }

  getSpineAliases(id: SpineSkeletonId): {
    skeleton: string
    atlas: string
    scale: number
    defaultAnimation?: string
  } {
    const entry = SpineAssetConfig[id]
    return {
      skeleton: spineSkeletonAlias(id),
      atlas: spineAtlasAlias(id),
      scale: entry.scale,
      defaultAnimation: entry.defaultAnimation,
    }
  }

  createSpine(id: SpineSkeletonId): Spine {
    const skeletonData = this.spineData.get(id)
    if (!skeletonData) {
      throw new Error(`Spine assets not loaded: ${id}`)
    }

    return new Spine({
      skeletonData,
      autoUpdate: true,
    })
  }

  private async loadEmbeddedAtlases(): Promise<void> {
    for (const name of Object.keys(EmbeddedSpritesheets) as EmbeddedAtlasName[]) {
      const entry = EmbeddedSpritesheets[name]
      const texture = await textureFromDataUrl(entry.image)
      const sheet = new Spritesheet({ texture, data: entry.data })
      await sheet.parse()
      Assets.cache.set(name, sheet)
    }
  }

  private async loadSpineAssets(): Promise<void> {
    for (const id of Object.keys(SpineAssetConfig) as SpineSkeletonId[]) {
      const entry = SpineAssetConfig[id]
      const atlasAlias = spineAtlasAlias(id)

      Assets.add({
        alias: atlasAlias,
        src: entry.atlas,
        loadParser: 'spineTextureAtlasLoader',
      })
      await Assets.load(atlasAlias)

      const atlas = Assets.get(atlasAlias) as TextureAtlas
      if (!atlas) {
        throw new Error(`Failed to load Spine atlas: ${entry.atlas}`)
      }

      const skeletonData = await this.parseSkeleton(entry.skeleton, atlas, entry.scale)
      this.spineData.set(id, skeletonData)
    }
  }

  private async parseSkeleton(
    src: string,
    atlas: TextureAtlas,
    scale: number,
  ): Promise<SkeletonData> {
    const attachmentLoader = new AtlasAttachmentLoader(atlas)
    const response = await fetch(src)
    if (!response.ok) {
      throw new Error(`Failed to fetch Spine skeleton: ${src} (${response.status})`)
    }

    if (src.endsWith('.skel')) {
      const buffer = new Uint8Array(await response.arrayBuffer())
      const binary = new SkeletonBinary(attachmentLoader)
      binary.scale = scale
      return binary.readSkeletonData(buffer)
    }

    const json = (await response.json()) as object
    const reader = new SkeletonJson(attachmentLoader)
    reader.scale = scale
    return reader.readSkeletonData(json)
  }
}
