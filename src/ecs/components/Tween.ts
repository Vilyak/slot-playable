/**
 * What object GSAP animates.
 * - sprite: Pixi Sprite from SpriteStore (scale, alpha, rotation, x, y, ...)
 * - position: proxy over Position.x/y SoA arrays
 */
export type TweenTarget = 'sprite' | 'position'

/**
 * Pending tween request stored on the Tween component.
 * Accepts the full GSAP vars surface via `vars` / `fromVars`.
 */
export type TweenRequest = {
  /** GSAP method to call. */
  method: 'to' | 'from' | 'fromTo'
  /**
   * Full GSAP tween vars.
   * Supports duration, ease, delay, yoyo, repeat, onUpdate, onComplete, etc.
   */
  vars: gsap.TweenVars
  /** Only for fromTo: starting values (full GSAP from-vars). */
  fromVars?: gsap.TweenVars
  /**
   * Animation target channel.
   * @see TweenTarget
   */
  target: TweenTarget
  /**
   * Kill existing tweens on this entity before starting.
   * Defaults to true when omitted.
   */
  replace?: boolean
}

/**
 * Tween component (AoS request queue + SoA lock flag).
 *
 * GSAP options are object graphs, so pending requests live as arrays of
 * TweenRequest objects keyed by entity id — not as numeric SoA fields.
 */
export class Tween {
  /** Pending tween requests per entity id. */
  requests: TweenRequest[][] = []

  /**
   * When 1, MovementSystem skips this entity.
   * Set while an active tween drives x/y (position channel or sprite x/y).
   */
  locksPosition: number[] = []

  enqueue(eid: number, request: TweenRequest): void {
    if (!this.requests[eid]) {
      this.requests[eid] = []
    }
    this.requests[eid].push(request)
  }

  hasPending(eid: number): boolean {
    return (this.requests[eid]?.length ?? 0) > 0
  }

  takePending(eid: number): TweenRequest[] {
    const pending = this.requests[eid]
    if (!pending || pending.length === 0) return []
    this.requests[eid] = []
    return pending
  }
}
