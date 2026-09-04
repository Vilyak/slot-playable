import { inject, injectable } from 'tsyringe'
import { query } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { ISystem } from '@/ecs/systems/ISystem'
import { SpriteStore } from '@/ecs/SpriteStore'

@injectable()
export class RenderSystem implements ISystem {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.SpriteStore) private readonly sprites: SpriteStore,
  ) {}

  update(_dt: number): void {
    const { Position } = this.world.components

    for (const eid of query(this.world, [Position])) {
      const sprite = this.sprites.get(eid)
      if (!sprite) continue
      sprite.x = Position.x[eid]
      sprite.y = Position.y[eid]
    }
  }
}
