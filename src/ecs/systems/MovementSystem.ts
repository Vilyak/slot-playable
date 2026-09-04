import { inject, injectable } from 'tsyringe'
import { query, hasComponent } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { ISystem } from '@/ecs/systems/ISystem'

@injectable()
export class MovementSystem implements ISystem {
  constructor(@inject(DI_TOKENS.GameWorld) private readonly world: GameWorld) {}

  update(dt: number): void {
    const { Position, Velocity, Tween } = this.world.components
    const seconds = dt / 1000

    for (const eid of query(this.world, [Position, Velocity])) {
      // Skip entities whose x/y are currently driven by GSAP.
      if (hasComponent(this.world, eid, Tween) && Tween.locksPosition[eid] === 1) {
        continue
      }
      Position.x[eid] += Velocity.x[eid] * seconds
      Position.y[eid] += Velocity.y[eid] * seconds
    }
  }
}
