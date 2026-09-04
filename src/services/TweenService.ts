import { inject, injectable } from 'tsyringe'
import { addComponent, hasComponent } from 'bitecs'
import gsap from 'gsap'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { TweenTarget } from '@/ecs/components/Tween'
import { TweenRuntimeStore } from '@/ecs/TweenRuntimeStore'
import { SpriteStore } from '@/ecs/SpriteStore'

type TweenOptions = {
  target?: TweenTarget
  replace?: boolean
}

@injectable()
export class TweenService {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.TweenRuntimeStore) private readonly runtime: TweenRuntimeStore,
    @inject(DI_TOKENS.SpriteStore) private readonly sprites: SpriteStore,
  ) {}

  to(eid: number, vars: gsap.TweenVars, options: TweenOptions = {}): void {
    this.enqueue(eid, {
      method: 'to',
      vars,
      target: options.target ?? 'sprite',
      replace: options.replace,
    })
  }

  from(eid: number, vars: gsap.TweenVars, options: TweenOptions = {}): void {
    this.enqueue(eid, {
      method: 'from',
      vars,
      target: options.target ?? 'sprite',
      replace: options.replace,
    })
  }

  fromTo(
    eid: number,
    fromVars: gsap.TweenVars,
    vars: gsap.TweenVars,
    options: TweenOptions = {},
  ): void {
    this.enqueue(eid, {
      method: 'fromTo',
      fromVars,
      vars,
      target: options.target ?? 'sprite',
      replace: options.replace,
    })
  }

  kill(eid: number): void {
    const { Tween } = this.world.components
    if (hasComponent(this.world, eid, Tween)) {
      Tween.requests[eid] = []
      Tween.locksPosition[eid] = 0
    }

    this.runtime.kill(eid)

    const sprite = this.sprites.get(eid)
    if (sprite) {
      gsap.killTweensOf(sprite)
      gsap.killTweensOf(sprite.scale)
    }
  }

  private enqueue(
    eid: number,
    request: {
      method: 'to' | 'from' | 'fromTo'
      vars: gsap.TweenVars
      fromVars?: gsap.TweenVars
      target: TweenTarget
      replace?: boolean
    },
  ): void {
    const { Tween } = this.world.components
    if (!hasComponent(this.world, eid, Tween)) {
      addComponent(this.world, eid, Tween)
      Tween.locksPosition[eid] = 0
      Tween.requests[eid] = []
    }
    Tween.enqueue(eid, request)
  }
}
