import { inject, injectable } from 'tsyringe'
import { addComponent, addEntity } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import { SpineService } from '@/services/SpineService'
import { GameApplication } from '@/game/GameApplication'

@injectable()
export class SpineSpawnerService {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.SpineService) private readonly spine: SpineService,
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
  ) {}

  spawnSpineboy(x?: number, y?: number): number {
    const { Position, Velocity } = this.world.components
    const eid = addEntity(this.world)

    addComponent(this.world, eid, Position)
    addComponent(this.world, eid, Velocity)

    const spawnX = x ?? this.game.width * 0.5 + (Math.random() - 0.5) * 160
    const spawnY = y ?? this.game.height * 0.75

    Position.set(eid, spawnX, spawnY)
    Velocity.set(eid, 0, 0)

    this.spine.attach(eid, 'spineboy')
    // defaultAnimation from config already enqueued by attach; ensure walk plays.
    this.spine.play(eid, 'walk', { loop: true })

    return eid
  }
}
