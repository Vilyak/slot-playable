import { injectable } from 'tsyringe'
import type { Sprite } from 'pixi.js'

@injectable()
export class SpriteStore {
  private readonly sprites = new Map<number, Sprite>()

  set(eid: number, sprite: Sprite): void {
    this.sprites.set(eid, sprite)
  }

  get(eid: number): Sprite | undefined {
    return this.sprites.get(eid)
  }

  delete(eid: number): void {
    const sprite = this.sprites.get(eid)
    sprite?.destroy()
    this.sprites.delete(eid)
  }

  clear(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy()
    }
    this.sprites.clear()
  }
}
