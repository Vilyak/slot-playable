import { injectable } from 'tsyringe'
import type { Spine } from '@esotericsoftware/spine-pixi-v8'

@injectable()
export class SpineStore {
  private readonly spines = new Map<number, Spine>()

  set(eid: number, spine: Spine): void {
    this.spines.set(eid, spine)
  }

  get(eid: number): Spine | undefined {
    return this.spines.get(eid)
  }

  delete(eid: number): void {
    const spine = this.spines.get(eid)
    spine?.destroy()
    this.spines.delete(eid)
  }

  clear(): void {
    for (const spine of this.spines.values()) {
      spine.destroy()
    }
    this.spines.clear()
  }
}
