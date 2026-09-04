import { inject, injectable } from 'tsyringe'
import { hasComponent, query } from 'bitecs'
import gsap from 'gsap'
import { DI_TOKENS } from '@/di/tokens'
import type { GameWorld } from '@/ecs/world'
import type { ISystem } from '@/ecs/systems/ISystem'
import type { TweenRequest } from '@/ecs/components/Tween'
import { SpriteStore } from '@/ecs/SpriteStore'
import { TweenRuntimeStore } from '@/ecs/TweenRuntimeStore'

@injectable()
export class TweenSystem implements ISystem {
  constructor(
    @inject(DI_TOKENS.GameWorld) private readonly world: GameWorld,
    @inject(DI_TOKENS.SpriteStore) private readonly sprites: SpriteStore,
    @inject(DI_TOKENS.TweenRuntimeStore) private readonly runtime: TweenRuntimeStore,
  ) {}

  update(_dt: number): void {
    const { Tween } = this.world.components

    for (const eid of query(this.world, [Tween])) {
      if (!Tween.hasPending(eid)) {
        this.refreshLock(eid)
        continue
      }

      const pending = Tween.takePending(eid)
      for (const request of pending) {
        this.startRequest(eid, request)
      }
      this.refreshLock(eid)
    }
  }

  private startRequest(eid: number, request: TweenRequest): void {
    const resolved = this.resolveTarget(eid, request)
    if (!resolved) return

    let { target, vars, fromVars } = resolved

    if (request.replace !== false) {
      gsap.killTweensOf(target)
      this.runtime.kill(eid)
    }

    const affectsPosition = this.requestAffectsPosition(request)
    if (affectsPosition) {
      this.world.components.Tween.locksPosition[eid] = 1
    }

    vars = this.wrapVars(eid, vars, affectsPosition, request.target)

    let tween
    if (request.method === 'fromTo') {
      tween = gsap.fromTo(target, fromVars ?? {}, vars)
    } else if (request.method === 'from') {
      tween = gsap.from(target, vars)
    } else {
      tween = gsap.to(target, vars)
    }

    this.runtime.add(eid, tween)
  }

  private resolveTarget(
    eid: number,
    request: TweenRequest,
  ): { target: object; vars: gsap.TweenVars; fromVars?: gsap.TweenVars } | null {
    if (request.target === 'position') {
      const { Position } = this.world.components
      return {
        target: {
          get x() {
            return Position.x[eid] ?? 0
          },
          set x(value: number) {
            Position.x[eid] = value
          },
          get y() {
            return Position.y[eid] ?? 0
          },
          set y(value: number) {
            Position.y[eid] = value
          },
        },
        vars: request.vars,
        fromVars: request.fromVars,
      }
    }

    const sprite = this.sprites.get(eid)
    if (!sprite) return null

    // Pixi scale is ObservablePoint {x,y}; numeric `scale` shorthand maps onto it.
    const scaleValue = (request.vars as Record<string, unknown>).scale
    if (typeof scaleValue === 'number') {
      const { scale: _ignored, ...rest } = request.vars as gsap.TweenVars & { scale?: number }
      const fromScale = request.fromVars
        ? (request.fromVars as Record<string, unknown>).scale
        : undefined

      let fromVars: gsap.TweenVars | undefined
      if (request.fromVars) {
        const { scale: _fromIgnored, ...fromRest } = request.fromVars as gsap.TweenVars & {
          scale?: number
        }
        fromVars =
          typeof fromScale === 'number'
            ? { ...fromRest, x: fromScale, y: fromScale }
            : fromRest
      }

      return {
        target: sprite.scale,
        vars: { ...rest, x: scaleValue, y: scaleValue },
        fromVars,
      }
    }

    return {
      target: sprite,
      vars: request.vars,
      fromVars: request.fromVars,
    }
  }

  private requestAffectsPosition(request: TweenRequest): boolean {
    if (request.target === 'position') return true
    const vars = request.vars as Record<string, unknown>
    const fromVars = (request.fromVars ?? {}) as Record<string, unknown>
    return 'x' in vars || 'y' in vars || 'x' in fromVars || 'y' in fromVars
  }

  private wrapVars(
    eid: number,
    vars: gsap.TweenVars,
    affectsPosition: boolean,
    targetKind: TweenRequest['target'],
  ): gsap.TweenVars {
    const userOnUpdate = vars.onUpdate
    const userOnComplete = vars.onComplete
    const { Position } = this.world.components

    return {
      ...vars,
      onUpdate: () => {
        if (affectsPosition && targetKind === 'sprite') {
          const sprite = this.sprites.get(eid)
          if (sprite) {
            Position.x[eid] = sprite.x
            Position.y[eid] = sprite.y
          }
        }
        userOnUpdate?.()
      },
      onComplete: () => {
        userOnComplete?.()
        this.runtime.pruneCompleted(eid)
        this.refreshLock(eid)
      },
    }
  }

  private refreshLock(eid: number): void {
    const { Tween } = this.world.components
    if (!hasComponent(this.world, eid, Tween)) return

    if (!this.runtime.hasActive(eid)) {
      Tween.locksPosition[eid] = 0
    }
  }
}
