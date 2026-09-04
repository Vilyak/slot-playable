import { inject, injectable } from 'tsyringe'
import { query } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { ISystem } from '@/ecs/systems/ISystem'
import { GameApplication } from '@/game/GameApplication'
import { SpriteStore } from '@/ecs/SpriteStore'

@injectable()
export class BounceSystem implements ISystem {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
    @inject(DI_TOKENS.SpriteStore) private readonly sprites: SpriteStore,
  ) {}

  update(_dt: number): void {
    const { Position, Velocity } = this.world.components
    const floorY = this.game.floorY
    const width = this.game.width

    for (const eid of query(this.world, [Position, Velocity])) {
      const sprite = this.sprites.get(eid)
      if (!sprite) continue

      const halfW = sprite.width * sprite.anchor.x
      const height = sprite.height

      if (Position.y[eid] + height >= floorY) {
        Position.y[eid] = floorY - height
        Velocity.y[eid] = -Math.abs(Velocity.y[eid])
      }

      if (Position.y[eid] < 0) {
        Position.y[eid] = 0
        Velocity.y[eid] = Math.abs(Velocity.y[eid])
      }

      if (Position.x[eid] - halfW < 0) {
        Position.x[eid] = halfW
        Velocity.x[eid] = Math.abs(Velocity.x[eid])
      }

      if (Position.x[eid] + (sprite.width - halfW) > width) {
        Position.x[eid] = width - (sprite.width - halfW)
        Velocity.x[eid] = -Math.abs(Velocity.x[eid])
      }
    }
  }
}
