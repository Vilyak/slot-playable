/**
 * Camera component (SoA).
 *
 * One entity typically owns Camera and represents the active view.
 * Position of the camera is stored as the center of the viewport in world space.
 */
export class Camera {
  /** World-space X of the camera center. */
  x: number[] = []

  /** World-space Y of the camera center. */
  y: number[] = []

  /** Viewport width in world units (usually matches screen width). */
  viewportWidth: number[] = []

  /** Viewport height in world units (usually matches screen height). */
  viewportHeight: number[] = []

  /** Zoom factor. 1 = 100%, >1 zooms in, <1 zooms out. */
  zoom: number[] = []

  /** Camera rotation in radians. */
  rotation: number[] = []

  /**
   * Whether follow mode is enabled.
   * 0 = free camera, 1 = follow target when targetEid is valid.
   */
  followEnabled: number[] = []

  /**
   * Entity id to follow.
   * Use -1 when there is no follow target.
   */
  targetEid: number[] = []

  /**
   * Follow smoothing factor in the range (0..1].
   * Higher values make the camera catch up faster.
   * Applied as exponential lerp: 1 - (1 - lerp)^dtSeconds.
   */
  followLerp: number[] = []

  /**
   * Horizontal dead zone around camera center.
   * Target movement inside this zone does not move the camera.
   */
  deadZoneWidth: number[] = []

  /**
   * Vertical dead zone around camera center.
   * Target movement inside this zone does not move the camera.
   */
  deadZoneHeight: number[] = []

  /** Left world bound for camera center (inclusive). */
  minX: number[] = []

  /** Top world bound for camera center (inclusive). */
  minY: number[] = []

  /** Right world bound for camera center (inclusive). */
  maxX: number[] = []

  /** Bottom world bound for camera center (inclusive). */
  maxY: number[] = []

  /**
   * Current screen-shake intensity in world units.
   * Applied as a decaying offset each frame.
   */
  shakeStrength: number[] = []

  /**
   * How fast shake decays per second.
   * Example: 8 means shake fades quickly.
   */
  shakeDamping: number[] = []

  setViewport(eid: number, width: number, height: number): void {
    this.viewportWidth[eid] = width
    this.viewportHeight[eid] = height
  }

  setFollowTarget(eid: number, targetEid: number): void {
    this.targetEid[eid] = targetEid
    this.followEnabled[eid] = 1
  }

  clearFollowTarget(eid: number): void {
    this.targetEid[eid] = -1
    this.followEnabled[eid] = 0
  }

  setBounds(eid: number, minX: number, minY: number, maxX: number, maxY: number): void {
    this.minX[eid] = minX
    this.minY[eid] = minY
    this.maxX[eid] = maxX
    this.maxY[eid] = maxY
  }

  /**
   * Initializes camera fields with safe defaults.
   * Free mode, no target, zoom 1, no dead zone, wide bounds, no shake.
   */
  initDefaults(eid: number, viewportWidth: number, viewportHeight: number): void {
    this.x[eid] = viewportWidth * 0.5
    this.y[eid] = viewportHeight * 0.5
    this.setViewport(eid, viewportWidth, viewportHeight)
    this.zoom[eid] = 1
    this.rotation[eid] = 0
    this.followEnabled[eid] = 0
    this.targetEid[eid] = -1
    this.followLerp[eid] = 0.12
    this.deadZoneWidth[eid] = 0
    this.deadZoneHeight[eid] = 0
    this.setBounds(eid, -1e6, -1e6, 1e6, 1e6)
    this.shakeStrength[eid] = 0
    this.shakeDamping[eid] = 8
  }
}
