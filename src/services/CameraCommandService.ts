import { inject, injectable } from 'tsyringe'
import { query } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import { CameraBootstrapService } from '@/services/CameraBootstrapService'

type CameraCommand =
  | { type: 'toggleFollow' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'setFollowTarget'; targetEid: number }
  | { type: 'clearFollow' }

@injectable()
export class CameraCommandService {
  private readonly queue: CameraCommand[] = []
  private readonly zoomStep = 0.1
  private readonly minZoom = 0.4
  private readonly maxZoom = 3

  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.CameraBootstrapService)
    private readonly cameraBootstrap: CameraBootstrapService,
  ) {}

  enqueueToggleFollow(): void {
    this.queue.push({ type: 'toggleFollow' })
  }

  enqueueZoomIn(): void {
    this.queue.push({ type: 'zoomIn' })
  }

  enqueueZoomOut(): void {
    this.queue.push({ type: 'zoomOut' })
  }

  enqueueSetFollowTarget(targetEid: number): void {
    this.queue.push({ type: 'setFollowTarget', targetEid })
  }

  enqueueClearFollow(): void {
    this.queue.push({ type: 'clearFollow' })
  }

  flush(): void {
    while (this.queue.length > 0) {
      const command = this.queue.shift()
      if (!command) break
      this.apply(command)
    }
  }

  private apply(command: CameraCommand): void {
    const cameraEid = this.resolveCameraEid()
    if (cameraEid === null) return

    const { Camera, Position } = this.world.components

    switch (command.type) {
      case 'toggleFollow': {
        if (Camera.followEnabled[cameraEid] === 1) {
          Camera.clearFollowTarget(cameraEid)
          break
        }

        const targetEid = this.findFirstFollowTarget()
        if (targetEid === null) break
        Camera.setFollowTarget(cameraEid, targetEid)
        // Snap camera closer to target immediately for better UX.
        Camera.x[cameraEid] = Position.x[targetEid]
        Camera.y[cameraEid] = Position.y[targetEid]
        break
      }
      case 'setFollowTarget': {
        Camera.setFollowTarget(cameraEid, command.targetEid)
        break
      }
      case 'clearFollow': {
        Camera.clearFollowTarget(cameraEid)
        break
      }
      case 'zoomIn': {
        Camera.zoom[cameraEid] = Math.min(this.maxZoom, Camera.zoom[cameraEid] + this.zoomStep)
        break
      }
      case 'zoomOut': {
        Camera.zoom[cameraEid] = Math.max(this.minZoom, Camera.zoom[cameraEid] - this.zoomStep)
        break
      }
    }
  }

  private resolveCameraEid(): number | null {
    const existing = this.cameraBootstrap.getCameraEid()
    if (existing !== null) return existing
    return this.cameraBootstrap.bootstrap()
  }

  private findFirstFollowTarget(): number | null {
    const { Position, Velocity } = this.world.components
    const entities = query(this.world, [Position, Velocity])
    return entities.length > 0 ? entities[0] : null
  }
}
