/**
 * Queued Spine animation command processed by SpineSystem.
 */
export type SpinePlayRequest = {
  /** Animation name from the skeleton data. */
  animation: string
  /** Track index. Default 0. */
  track?: number
  /** Loop flag. Default true. */
  loop?: boolean
  /** Mix duration into this animation (seconds). */
  mixDuration?: number
  /**
   * Delay before starting (seconds).
   * When > 0, uses addAnimation instead of setAnimation.
   */
  delay?: number
}

/**
 * Spine animation component (AoS queues + SoA flags).
 * Named SpineAnim to avoid clashing with runtime Spine class.
 */
export class SpineAnim {
  /** Skeleton id from SpineAssetConfig (e.g. "spineboy"). */
  skeletonId: (string | null)[] = []

  /** Pending play commands per entity. */
  playQueue: SpinePlayRequest[][] = []

  /** Pending skin name; null means no pending change. */
  pendingSkin: (string | null)[] = []

  /** Animation time scale. 1 = normal speed. */
  timeScale: number[] = []

  /** 1 when Spine display is attached in SpineStore. */
  attached: number[] = []

  enqueuePlay(eid: number, request: SpinePlayRequest): void {
    if (!this.playQueue[eid]) {
      this.playQueue[eid] = []
    }
    this.playQueue[eid].push(request)
  }

  takePlayQueue(eid: number): SpinePlayRequest[] {
    const queue = this.playQueue[eid]
    if (!queue || queue.length === 0) return []
    this.playQueue[eid] = []
    return queue
  }

  setSkin(eid: number, skin: string): void {
    this.pendingSkin[eid] = skin
  }

  takePendingSkin(eid: number): string | null {
    const skin = this.pendingSkin[eid] ?? null
    this.pendingSkin[eid] = null
    return skin
  }

  init(eid: number, skeletonId: string): void {
    this.skeletonId[eid] = skeletonId
    this.playQueue[eid] = []
    this.pendingSkin[eid] = null
    this.timeScale[eid] = 1
    this.attached[eid] = 0
  }
}
