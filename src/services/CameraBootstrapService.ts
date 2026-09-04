import { inject, injectable } from 'tsyringe'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import { CameraEntity } from '@/ecs/entities/CameraEntity'
import { GameApplication } from '@/game/GameApplication'

@injectable()
export class CameraBootstrapService {
  private cameraEid: number | null = null

  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
  ) {}

  /**
   * Creates the active camera entity once and syncs viewport to the screen size.
   */
  bootstrap(): number {
    const { Camera } = this.world.components

    if (this.cameraEid === null) {
      this.cameraEid = CameraEntity.create(this.world)
      Camera.initDefaults(this.cameraEid, this.game.width, this.game.height)
    } else {
      this.syncViewport()
    }

    return this.cameraEid
  }

  syncViewport(): void {
    if (this.cameraEid === null) return
    const { Camera } = this.world.components
    Camera.setViewport(this.cameraEid, this.game.width, this.game.height)
  }

  getCameraEid(): number | null {
    return this.cameraEid
  }
}
