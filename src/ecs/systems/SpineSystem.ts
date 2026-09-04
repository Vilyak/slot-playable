import { inject, injectable } from 'tsyringe'
import { query } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { ISystem } from '@/ecs/systems/ISystem'
import type { SpinePlayRequest } from '@/ecs/components/Spine'
import { SpineStore } from '@/ecs/SpineStore'
import { AssetService } from '@/assets/AssetService'
import { SceneRoot } from '@/game/SceneRoot'
import type { SpineSkeletonId } from '@/assets/spine.config'

/**
 * Processes SpineAnim play/skin queues and syncs Position → Spine display.
 * Spine.autoUpdate drives skeleton animation on its own ticker.
 */
@injectable()
export class SpineSystem implements ISystem {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.SpineStore) private readonly spines: SpineStore,
    @inject(DI_TOKENS.AssetService) private readonly assets: AssetService,
    @inject(DI_TOKENS.SceneRoot) private readonly scene: SceneRoot,
  ) {}

  update(_dt: number): void {
    const { SpineAnim, Position } = this.world.components

    for (const eid of query(this.world, [SpineAnim, Position])) {
      this.ensureAttached(eid)

      const spine = this.spines.get(eid)
      if (!spine) continue

      const skin = SpineAnim.takePendingSkin(eid)
      if (skin) {
        spine.skeleton.setSkinByName(skin)
        spine.skeleton.setSlotsToSetupPose()
      }

      const plays = SpineAnim.takePlayQueue(eid)
      for (const play of plays) {
        this.applyPlay(spine, play)
      }

      spine.state.timeScale = SpineAnim.timeScale[eid] ?? 1

      spine.x = Position.x[eid]
      spine.y = Position.y[eid]
    }
  }

  private ensureAttached(eid: number): void {
    const { SpineAnim } = this.world.components
    if (SpineAnim.attached[eid] === 1) return

    const skeletonId = SpineAnim.skeletonId[eid]
    if (!skeletonId) return

    const spine = this.assets.createSpine(skeletonId as SpineSkeletonId)
    this.spines.set(eid, spine)
    this.scene.root.addChild(spine)
    SpineAnim.attached[eid] = 1
  }

  private applyPlay(spine: ReturnType<AssetService['createSpine']>, play: SpinePlayRequest): void {
    const track = play.track ?? 0
    const loop = play.loop ?? true
    const delay = play.delay ?? 0

    if (play.mixDuration != null) {
      const current = spine.state.getCurrent(track)?.animation?.name
      if (current) {
        spine.state.data.setMix(current, play.animation, play.mixDuration)
      }
    }

    if (delay > 0) {
      spine.state.addAnimation(track, play.animation, loop, delay)
    } else {
      spine.state.setAnimation(track, play.animation, loop)
    }
  }
}
