import { inject, injectable } from 'tsyringe'
import { addComponent, hasComponent, removeComponent } from 'bitecs'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { SpinePlayRequest } from '@/ecs/components/Spine'
import type { SpineSkeletonId } from '@/assets/spine.config'
import { SpineAssetConfig } from '@/assets/spine.config'
import { AssetService } from '@/assets/AssetService'
import { SpineStore } from '@/ecs/SpineStore'
import { SceneRoot } from '@/game/SceneRoot'

@injectable()
export class SpineService {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.AssetService) private readonly assets: AssetService,
    @inject(DI_TOKENS.SpineStore) private readonly spines: SpineStore,
    @inject(DI_TOKENS.SceneRoot) private readonly scene: SceneRoot,
  ) {}

  /**
   * Synchronously creates Spine display and marks entity attached.
   * Assets must already be loaded via AssetService.loadAll().
   */
  attach(eid: number, skeletonId: SpineSkeletonId): void {
    const { SpineAnim, Position } = this.world.components

    if (!hasComponent(this.world, eid, Position)) {
      addComponent(this.world, eid, Position)
    }

    if (!hasComponent(this.world, eid, SpineAnim)) {
      addComponent(this.world, eid, SpineAnim)
    }

    SpineAnim.init(eid, skeletonId)

    const existing = this.spines.get(eid)
    if (existing) {
      existing.destroy()
      this.spines.delete(eid)
    }

    const spine = this.assets.createSpine(skeletonId)
    this.spines.set(eid, spine)
    this.scene.root.addChild(spine)
    SpineAnim.attached[eid] = 1

    const defaults = SpineAssetConfig[skeletonId]
    if (defaults.defaultAnimation) {
      this.play(eid, defaults.defaultAnimation, { loop: true })
    }
  }

  play(
    eid: number,
    animation: string,
    opts: Omit<SpinePlayRequest, 'animation'> = {},
  ): void {
    const { SpineAnim } = this.world.components
    if (!hasComponent(this.world, eid, SpineAnim)) {
      throw new Error(`Entity ${eid} has no SpineAnim component`)
    }
    SpineAnim.enqueuePlay(eid, { animation, ...opts })
  }

  setSkin(eid: number, skin: string): void {
    const { SpineAnim } = this.world.components
    if (!hasComponent(this.world, eid, SpineAnim)) {
      throw new Error(`Entity ${eid} has no SpineAnim component`)
    }
    SpineAnim.setSkin(eid, skin)
  }

  setTimeScale(eid: number, scale: number): void {
    const { SpineAnim } = this.world.components
    if (!hasComponent(this.world, eid, SpineAnim)) {
      throw new Error(`Entity ${eid} has no SpineAnim component`)
    }
    SpineAnim.timeScale[eid] = scale
  }

  detach(eid: number): void {
    const { SpineAnim } = this.world.components
    const spine = this.spines.get(eid)
    if (spine?.parent) {
      spine.parent.removeChild(spine)
    }
    this.spines.delete(eid)

    if (hasComponent(this.world, eid, SpineAnim)) {
      SpineAnim.attached[eid] = 0
      SpineAnim.skeletonId[eid] = null
      SpineAnim.playQueue[eid] = []
      SpineAnim.pendingSkin[eid] = null
      removeComponent(this.world, eid, SpineAnim)
    }

    spine?.destroy({ children: true })
  }
}
