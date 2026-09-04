import { inject, injectable } from 'tsyringe'
import { query, entityExists } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { ISystem } from '@/ecs/systems/ISystem'
import { SceneRoot } from '@/game/SceneRoot'
import { GameApplication } from '@/game/GameApplication'

/**
 * Applies Camera component state to SceneRoot every frame.
 *
 * Transform model:
 * - Camera (x, y) is the world-space center of the view.
 * - Scene container is translated so that camera center maps to screen center.
 * - Zoom/rotation are applied on the same container.
 */
@injectable()
export class CameraSystem implements ISystem {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.SceneRoot) private readonly scene: SceneRoot,
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
  ) {}

  update(dt: number): void {
    const { Camera, Position } = this.world.components
    const cameras = query(this.world, [Camera])
    if (cameras.length === 0) return

    // One active camera: first entity with Camera component.
    const eid = cameras[0]
    const dtSeconds = Math.max(dt, 0) / 1000

    // Keep viewport in sync with the current canvas size.
    Camera.viewportWidth[eid] = this.game.width
    Camera.viewportHeight[eid] = this.game.height

    if (Camera.followEnabled[eid] === 1) {
      const targetEid = Camera.targetEid[eid]
      if (targetEid >= 0 && entityExists(this.world, targetEid) && Position.x[targetEid] !== undefined) {
        this.followTarget(eid, targetEid, dtSeconds)
      }
    }

    this.applyShake(eid, dtSeconds)
    this.clampToBounds(eid)
    this.applyToScene(eid)
  }

  private followTarget(cameraEid: number, targetEid: number, dtSeconds: number): void {
    const { Camera, Position } = this.world.components

    const targetX = Position.x[targetEid]
    const targetY = Position.y[targetEid]
    let desiredX = targetX
    let desiredY = targetY

    // Dead zone: only move camera when target leaves the inner rectangle.
    const halfDeadW = Camera.deadZoneWidth[cameraEid] * 0.5
    const halfDeadH = Camera.deadZoneHeight[cameraEid] * 0.5
    const dx = targetX - Camera.x[cameraEid]
    const dy = targetY - Camera.y[cameraEid]

    if (Math.abs(dx) <= halfDeadW) {
      desiredX = Camera.x[cameraEid]
    } else {
      desiredX = targetX - Math.sign(dx) * halfDeadW
    }

    if (Math.abs(dy) <= halfDeadH) {
      desiredY = Camera.y[cameraEid]
    } else {
      desiredY = targetY - Math.sign(dy) * halfDeadH
    }

    // Frame-rate independent exponential smoothing.
    const lerp = Math.min(Math.max(Camera.followLerp[cameraEid], 0.0001), 1)
    const alpha = 1 - Math.pow(1 - lerp, dtSeconds * 60)
    Camera.x[cameraEid] += (desiredX - Camera.x[cameraEid]) * alpha
    Camera.y[cameraEid] += (desiredY - Camera.y[cameraEid]) * alpha
  }

  private applyShake(eid: number, dtSeconds: number): void {
    const { Camera } = this.world.components
    const strength = Camera.shakeStrength[eid]
    if (strength <= 0) return

    // Temporary offset; base camera center stays intact for follow logic.
    // Shake is applied only in applyToScene via a derived offset each frame.
    const damping = Math.max(Camera.shakeDamping[eid], 0)
    Camera.shakeStrength[eid] = Math.max(0, strength - strength * damping * dtSeconds)
  }

  private clampToBounds(eid: number): void {
    const { Camera } = this.world.components
    Camera.x[eid] = Math.min(Math.max(Camera.x[eid], Camera.minX[eid]), Camera.maxX[eid])
    Camera.y[eid] = Math.min(Math.max(Camera.y[eid], Camera.minY[eid]), Camera.maxY[eid])
  }

  private applyToScene(eid: number): void {
    const { Camera } = this.world.components
    const root = this.scene.root
    const zoom = Math.max(Camera.zoom[eid], 0.01)
    const halfW = Camera.viewportWidth[eid] * 0.5
    const halfH = Camera.viewportHeight[eid] * 0.5

    let shakeX = 0
    let shakeY = 0
    const strength = Camera.shakeStrength[eid]
    if (strength > 0) {
      shakeX = (Math.random() * 2 - 1) * strength
      shakeY = (Math.random() * 2 - 1) * strength
    }

    // Place world point (camera.x, camera.y) at screen center, then zoom/rotate.
    root.pivot.set(Camera.x[eid] + shakeX, Camera.y[eid] + shakeY)
    root.position.set(halfW, halfH)
    root.scale.set(zoom)
    root.rotation = Camera.rotation[eid]
  }
}
