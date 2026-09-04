import { injectable } from 'tsyringe'
import gsap from 'gsap'

@injectable()
export class TweenRuntimeStore {
  private readonly tweens = new Map<number, gsap.core.Tween[]>()

  add(eid: number, tween: gsap.core.Tween): void {
    const list = this.tweens.get(eid) ?? []
    list.push(tween)
    this.tweens.set(eid, list)
  }

  get(eid: number): gsap.core.Tween[] {
    return this.tweens.get(eid) ?? []
  }

  kill(eid: number): void {
    const list = this.tweens.get(eid)
    if (!list) return
    for (const tween of list) {
      tween.kill()
    }
    this.tweens.delete(eid)
  }

  killAll(): void {
    for (const eid of [...this.tweens.keys()]) {
      this.kill(eid)
    }
    gsap.globalTimeline.clear()
  }

  pruneCompleted(eid: number): void {
    const list = this.tweens.get(eid)
    if (!list) return
    const active = list.filter((tween) => tween.isActive() || tween.progress() < 1)
    if (active.length === 0) {
      this.tweens.delete(eid)
      return
    }
    this.tweens.set(eid, active)
  }

  hasActive(eid: number): boolean {
    this.pruneCompleted(eid)
    return (this.tweens.get(eid)?.length ?? 0) > 0
  }
}
