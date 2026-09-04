import { injectable } from 'tsyringe'
import { Application } from 'pixi.js'

@injectable()
export class GameApplication {
  readonly app = new Application()

  private initPromise: Promise<void> | null = null

  async init(host: HTMLElement): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.app.init({
        background: '#ff9ad5',
        resizeTo: host,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })
    }

    await this.initPromise

    for (const child of [...host.children]) {
      if (child instanceof HTMLCanvasElement && child !== this.app.canvas) {
        child.remove()
      }
    }

    if (this.app.canvas.parentElement !== host) {
      host.appendChild(this.app.canvas)
    }

    this.app.resizeTo = host
  }

  get width(): number {
    return this.app.screen.width
  }

  get height(): number {
    return this.app.screen.height
  }

  get floorY(): number {
    return this.app.screen.height
  }

  get stage() {
    return this.app.stage
  }
}
