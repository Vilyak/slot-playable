import { inject, injectable } from 'tsyringe'
import { DI_TOKENS } from '@/di/tokens'
import type { ISystem } from '@/ecs/systems/ISystem'
import type { GameWorld } from '@/ecs/world'
import { GameApplication } from '@/game/GameApplication'
import { GameCommands } from '@/game/GameCommands'
import { CameraCommandService } from '@/services/CameraCommandService'

@injectable()
export class GameLoop {
  private running = false
  private tickHandler: ((ticker: { deltaMS: number }) => void) | null = null

  constructor(
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.Systems) private readonly systems: ISystem[],
    @inject(DI_TOKENS.GameCommands) private readonly gameCommands: GameCommands,
    @inject(DI_TOKENS.CameraCommandService)
    private readonly cameraCommands: CameraCommandService,
  ) {}

  start(): void {
    if (this.running) return
    this.running = true

    this.tickHandler = (ticker) => {
      const dt = ticker.deltaMS
      this.world.time.delta = dt
      this.world.time.elapsed += dt
      this.gameCommands.flush()
      this.cameraCommands.flush()
      for (const system of this.systems) {
        system.update(dt)
      }
    }

    this.game.app.ticker.add(this.tickHandler)
  }

  stop(): void {
    if (!this.running || !this.tickHandler) return
    this.game.app.ticker.remove(this.tickHandler)
    this.tickHandler = null
    this.running = false
  }
}
