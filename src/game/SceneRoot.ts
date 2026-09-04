import { inject, injectable } from 'tsyringe'
import { Container } from 'pixi.js'
import { DI_TOKENS } from '@/di/tokens'
import { GameApplication } from '@/game/GameApplication'

@injectable()
export class SceneRoot {
  readonly container = new Container()

  constructor(
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
  ) {}

  mount(): void {
    if (!this.container.parent) {
      this.game.stage.addChild(this.container)
    }
  }

  get root(): Container {
    return this.container
  }
}
