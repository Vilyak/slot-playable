import {
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  type Texture,
} from 'pixi.js'
import { inject, injectable } from 'tsyringe'
import gsap from 'gsap'
import { DI_TOKENS } from '@/di/tokens'
import { GameApplication } from '@/game/GameApplication'
import { SceneRoot } from '@/game/SceneRoot'
import { AssetService } from '@/assets/AssetService'
import { EmbeddedImages } from '@/assets/generated/embeddedAssets'
import { FrameWindow } from '@/assets/generated/FrameWindow'
import { textureFromDataUrl } from '@/assets/textureFromDataUrl'
import { getStore } from '@/ui/store/storeHolder'
import { addCoins, gameWon, spinEnded, spinStarted } from '@/ui/store/playableSlice'
import {
  DESIGN_H,
  DESIGN_W,
  FRAME_SCALE,
  REEL_COUNT,
  SPIN_BTN_GAP,
  SPIN_BTN_WIDTH_RATIO,
  STRIP_LEN,
  SYMBOL_KEYS,
  VISIBLE_ROWS,
  WIN_COIN_REWARD,
  WINDOW_PAD,
  type SymbolKey,
} from '@/slot/types'

type Particle = {
  sprite: Sprite
  vx: number
  vy: number
  vr: number
  life: number
  maxLife: number
  gravity: number
}

type ReelState = {
  container: Container
  strip: Container
  sprites: Sprite[]
  stripKeys: SymbolKey[]
  offset: number
  speed: number
  spinning: boolean
  stopping: boolean
}

const SYMBOL_FRAME: Record<
  SymbolKey,
  'symbolCircle' | 'symbolStar' | 'symbolHeart' | 'symbolDiamond' | 'symbolTriangle'
> = {
  circle: 'symbolCircle',
  star: 'symbolStar',
  heart: 'symbolHeart',
  diamond: 'symbolDiamond',
  triangle: 'symbolTriangle',
}

@injectable()
export class SlotService {
  private readonly root = new Container()
  private readonly world = new Container()
  private readonly machine = new Container()
  private readonly reelsLayer = new Container()
  private readonly fxLayer = new Container()
  private readonly uiLayer = new Container()

  private bg: Sprite | null = null
  private frame: Sprite | null = null
  private spinBtn: Sprite | null = null
  private winText: Text | null = null
  private flash: Graphics | null = null
  private windowBg: Graphics | null = null
  private windowMask: Graphics | null = null

  private winX = 0
  private winY = 0
  private winW = 360
  private winH = 360
  /** Vertical pitch — exactly 3 rows fill the window height. */
  private cell = 110
  /** Horizontal column width (may differ from cell). */
  private colW = 110
  private reelGap = 8
  private spinBtnScale = 0.5

  private reels: ReelState[] = []
  private particles: Particle[] = []
  private busy = false
  private spinIndex = 0
  private audioCtx: AudioContext | null = null

  private readonly onResize = () => this.layout()

  constructor(
    @inject(DI_TOKENS.GameApplication) private readonly game: GameApplication,
    @inject(DI_TOKENS.SceneRoot) private readonly scene: SceneRoot,
    @inject(DI_TOKENS.AssetService) private readonly assets: AssetService,
  ) {}

  async init(): Promise<void> {
    this.scene.root.addChild(this.root)
    this.root.addChild(this.world)
    this.world.addChild(this.machine)
    this.world.addChild(this.fxLayer)

    await this.loadBackground()
    this.computeWindowFromGeneratedConfig()
    this.buildWindow()
    this.machine.addChild(this.reelsLayer)
    this.buildReels()
    this.buildFrame()
    this.machine.addChild(this.uiLayer)
    this.buildSpinButton()
    this.buildWinText()
    this.buildFlash()
    this.layout()
    this.game.app.renderer.on('resize', this.onResize)
  }

  update(dt: number): void {
    const seconds = dt > 2 ? dt / 1000 : dt
    this.updateReels(seconds)
    this.updateParticles(seconds)
  }

  destroy(): void {
    this.game.app.renderer.off('resize', this.onResize)
    gsap.killTweensOf(this.machine)
    if (this.winText) gsap.killTweensOf(this.winText)
    if (this.spinBtn) gsap.killTweensOf(this.spinBtn)
    this.root.removeFromParent()
  }

  private async loadBackground(): Promise<void> {
    if (!('bg' in EmbeddedImages)) return
    try {
      const texture = await textureFromDataUrl((EmbeddedImages as { bg: string }).bg)
      this.bg = new Sprite(texture)
      this.bg.anchor.set(0.5)
      this.root.addChildAt(this.bg, 0)
    } catch {
      // ignore
    }
  }

  private tex(
    frame:
      | 'symbolCircle'
      | 'symbolStar'
      | 'symbolHeart'
      | 'symbolDiamond'
      | 'symbolTriangle'
      | 'machineFrame'
      | 'btnSpin'
      | 'coin'
      | 'confetti0'
      | 'confetti1'
      | 'confetti2'
      | 'confetti3'
      | 'confetti4',
  ): Texture {
    return this.assets.getGeneratedTexture('slot', frame)
  }

  private symbolTex(key: SymbolKey): Texture {
    return this.tex(SYMBOL_FRAME[key])
  }

  /** Map FrameWindow (texture px) → machine-local space with frame anchor 0.5. */
  private computeWindowFromGeneratedConfig(): void {
    const s = FRAME_SCALE
    const { texW, texH, x, y, w, h } = FrameWindow
    this.winW = w * s
    this.winH = h * s
    this.winX = (x + w / 2 - texW / 2) * s
    this.winY = (y + h / 2 - texH / 2) * s

    // Vertical: exactly VISIBLE_ROWS fill the hole (no 4th/5th row peeking)
    this.cell = Math.max(40, this.winH / VISIBLE_ROWS)
    this.reelGap = Math.max(2, Math.floor(this.cell * 0.04))
    const innerW = Math.max(80, this.winW - WINDOW_PAD * 2)
    this.colW = (innerW - (REEL_COUNT - 1) * this.reelGap) / REEL_COUNT
  }

  private buildWindow(): void {
    const radius = Math.min(this.winW, this.winH) * 0.08
    this.windowBg = new Graphics()
      .roundRect(-this.winW / 2, -this.winH / 2, this.winW, this.winH, radius)
      .fill(0x1a0838)
    this.windowBg.position.set(this.winX, this.winY)
    this.windowBg.eventMode = 'none'
    this.machine.addChild(this.windowBg)

    const guides = new Graphics()
    for (let i = 1; i < 3; i++) {
      const gy = -this.winH / 2 + (this.winH / 3) * i
      guides
        .moveTo(-this.winW / 2 + 14, gy)
        .lineTo(this.winW / 2 - 14, gy)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.1 })
    }
    for (let i = 1; i < 3; i++) {
      const gx = -this.winW / 2 + (this.winW / 3) * i
      guides
        .moveTo(gx, -this.winH / 2 + 14)
        .lineTo(gx, this.winH / 2 - 14)
        .stroke({ width: 2, color: 0xffffff, alpha: 0.08 })
    }
    guides.position.set(this.winX, this.winY)
    guides.eventMode = 'none'
    this.machine.addChild(guides)

    this.windowMask = new Graphics()
      .roundRect(-this.winW / 2, -this.winH / 2, this.winW, this.winH, radius)
      .fill(0xffffff)
    this.windowMask.position.set(this.winX, this.winY)
    this.machine.addChild(this.windowMask)
    this.reelsLayer.mask = this.windowMask
    this.reelsLayer.position.set(this.winX, this.winY)
  }

  private buildFrame(): void {
    this.frame = new Sprite(this.tex('machineFrame'))
    this.frame.anchor.set(0.5)
    this.frame.scale.set(FRAME_SCALE)
    this.frame.eventMode = 'none'
    this.machine.addChild(this.frame)
  }

  private randomKey(): SymbolKey {
    return SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]!
  }

  private buildReels(): void {
    const totalW = REEL_COUNT * this.colW + (REEL_COUNT - 1) * this.reelGap
    const startX = -totalW / 2 + this.colW / 2

    for (let i = 0; i < REEL_COUNT; i++) {
      const container = new Container()
      container.x = startX + i * (this.colW + this.reelGap)
      const strip = new Container()
      container.addChild(strip)

      const stripKeys: SymbolKey[] = []
      const sprites: Sprite[] = []
      for (let s = 0; s < STRIP_LEN; s++) {
        const key = this.randomKey()
        stripKeys.push(key)
        const spr = new Sprite(this.symbolTex(key))
        spr.anchor.set(0.5)
        spr.eventMode = 'none'
        strip.addChild(spr)
        sprites.push(spr)
      }

      this.reelsLayer.addChild(container)
      const reel: ReelState = {
        container,
        strip,
        sprites,
        stripKeys,
        offset: 0,
        speed: 0,
        spinning: false,
        stopping: false,
      }
      this.layoutStrip(reel)
      this.reels.push(reel)
    }
  }

  private layoutStrip(reel: ReelState): void {
    const cell = this.cell
    const stripH = STRIP_LEN * cell
    const offset = ((reel.offset % stripH) + stripH) % stripH
    const half = (VISIBLE_ROWS * cell) / 2
    const blur = reel.spinning && !reel.stopping

    for (let i = 0; i < reel.sprites.length; i++) {
      const spr = reel.sprites[i]!
      let y = i * cell - offset + cell / 2 - half
      while (y < -half - cell * 2) y += stripH
      while (y > half + cell * 2) y -= stripH
      spr.y = y
      spr.x = 0
      const fit =
        (Math.min(this.colW, cell) * 0.78) / Math.max(spr.texture.width, spr.texture.height, 1)
      spr.scale.set(fit, blur ? fit * 0.7 : fit)
      spr.alpha = blur ? 0.85 : 1
    }
  }

  private buildSpinButton(): void {
    this.spinBtn = new Sprite(this.tex('btnSpin'))
    this.spinBtn.anchor.set(0.5)
    this.spinBtn.eventMode = 'static'
    this.spinBtn.cursor = 'pointer'
    this.spinBtn.on('pointerdown', () => this.onSpinPress())
    this.spinBtn.on('pointerup', () => this.onSpinRelease())
    this.spinBtn.on('pointerupoutside', () => this.onSpinRelease())
    this.uiLayer.addChild(this.spinBtn)
  }

  private buildWinText(): void {
    this.winText = new Text({
      text: 'WIN!',
      style: new TextStyle({
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
        fontSize: 84,
        fontWeight: '900',
        fill: '#ffe566',
        stroke: { color: '#ff2d7a', width: 10 },
        dropShadow: {
          color: '#ff80ab',
          blur: 8,
          distance: 4,
          angle: Math.PI / 4,
        },
      }),
    })
    this.winText.anchor.set(0.5)
    this.winText.visible = false
    this.winText.alpha = 0
    this.fxLayer.addChild(this.winText)
  }

  private buildFlash(): void {
    this.flash = new Graphics()
    this.flash.rect(-600, -600, 1200, 1200).fill({ color: 0xffffff, alpha: 1 })
    this.flash.alpha = 0
    this.flash.eventMode = 'none'
    this.fxLayer.addChild(this.flash)
  }

  private layout(): void {
    const w = this.game.width
    const h = this.game.height
    const scale = Math.min(w / DESIGN_W, h / DESIGN_H)
    this.world.scale.set(scale)
    // Shift up so frame + SPIN read as one centered block
    this.world.position.set(w / 2, h / 2 - 48)

    if (this.bg) {
      const bgScale = Math.max(w / this.bg.texture.width, h / this.bg.texture.height)
      this.bg.scale.set(bgScale)
      this.bg.position.set(w / 2, h / 2)
    }

    if (this.frame) this.frame.scale.set(FRAME_SCALE)

    if (this.spinBtn && this.frame) {
      const targetW = this.frame.width * SPIN_BTN_WIDTH_RATIO
      this.spinBtnScale = targetW / Math.max(1, this.spinBtn.texture.width)
      this.spinBtn.scale.set(this.spinBtnScale)
      this.spinBtn.x = 0
      // Sit just under the cabinet bottom edge
      this.spinBtn.y = this.frame.height / 2 + this.spinBtn.height / 2 + SPIN_BTN_GAP
    }
  }

  private onSpinPress(): void {
    if (!this.spinBtn || this.busy) return
    this.ensureAudio()
    gsap.to(this.spinBtn.scale, {
      x: this.spinBtnScale * 0.92,
      y: this.spinBtnScale * 0.92,
      duration: 0.08,
    })
  }

  private onSpinRelease(): void {
    if (!this.spinBtn) return
    gsap.to(this.spinBtn.scale, {
      x: this.spinBtnScale,
      y: this.spinBtnScale,
      duration: 0.12,
    })
    void this.spin()
  }

  private async spin(): Promise<void> {
    if (this.busy) return
    this.busy = true
    getStore().dispatch(spinStarted())
    if (this.spinBtn) this.spinBtn.alpha = 0.7

    // Scripted funnel: 1st spin lose, 2nd spin win
    const wantWin = this.spinIndex === 1
    this.spinIndex += 1
    const winSymbol = this.randomKey()
    const results: SymbolKey[][] = []

    for (let r = 0; r < REEL_COUNT; r++) {
      const top = this.randomKey()
      let mid = wantWin ? winSymbol : this.randomKey()
      const bot = this.randomKey()
      if (!wantWin && r === REEL_COUNT - 1) {
        const first = results[0]![1]
        const second = results[1]![1]
        if (first === second && mid === first) mid = this.pickDifferent(first)
      }
      results.push([top, mid, bot])
    }

    for (let i = 0; i < this.reels.length; i++) {
      const reel = this.reels[i]!
      reel.spinning = true
      reel.stopping = false
      reel.speed = this.cell * 32 + i * 520 + Math.random() * 280
    }

    for (let i = 0; i < this.reels.length; i++) {
      await this.wait(0.24 + i * 0.2)
      await this.stopReel(i, results[i]!)
      this.playStopClick()
    }

    const center = results.map((row) => row[1]!)
    const isWin = center[0] === center[1] && center[1] === center[2]
    if (isWin) {
      await this.playWin()
      getStore().dispatch(gameWon())
    }

    getStore().dispatch(spinEnded({ won: isWin }))
    if (this.spinBtn) this.spinBtn.alpha = 1
    this.busy = false
  }

  private pickDifferent(key: SymbolKey): SymbolKey {
    const others = SYMBOL_KEYS.filter((k) => k !== key)
    return others[Math.floor(Math.random() * others.length)]!
  }

  private wait(sec: number): Promise<void> {
    return new Promise((resolve) => gsap.delayedCall(sec, resolve))
  }

  private stopReel(index: number, triple: SymbolKey[]): Promise<void> {
    return new Promise((resolve) => {
      const reel = this.reels[index]!
      const cell = this.cell
      const base = 10
      for (let row = 0; row < 3; row++) {
        const idx = base + row
        reel.stripKeys[idx] = triple[row]!
        reel.sprites[idx]!.texture = this.symbolTex(triple[row]!)
      }

      const half = (VISIBLE_ROWS * cell) / 2
      const target = (base + 1) * cell + cell / 2 - half
      const stripH = STRIP_LEN * cell
      reel.stopping = true
      reel.spinning = true
      const start = reel.offset
      // Spin top→bottom = decreasing offset; land on aligned target with enough travel
      let end = target
      while (end >= start) end -= stripH
      while (start - end < cell * 5) end -= stripH

      const proxy = { v: start }
      gsap.to(proxy, {
        v: end,
        duration: 0.35,
        ease: 'back.out(1.6)',
        onUpdate: () => {
          reel.offset = proxy.v
          this.layoutStrip(reel)
        },
        onComplete: () => {
          reel.offset = ((end % stripH) + stripH) % stripH
          reel.stopping = false
          reel.spinning = false
          reel.speed = 0
          this.layoutStrip(reel)
          resolve()
        },
      })
    })
  }

  private updateReels(dt: number): void {
    for (const reel of this.reels) {
      if (!reel.spinning || reel.stopping) continue
      // Decreasing offset → symbols move top → bottom
      reel.offset -= reel.speed * dt
      this.layoutStrip(reel)
    }
  }

  private async playWin(): Promise<void> {
    this.playFanfare()
    this.shakeMachine()
    this.flashScreen()
    this.showWinText()
    this.spawnConfetti()
    await this.flyCoinsToCounter()
    getStore().dispatch(addCoins(WIN_COIN_REWARD))
    this.punchCoinCounter()
  }

  private showWinText(): void {
    if (!this.winText) return
    this.winText.visible = true
    this.winText.alpha = 0
    this.winText.scale.set(0.2)
    this.winText.position.set(this.winX, this.winY)
    gsap.killTweensOf(this.winText)
    gsap.killTweensOf(this.winText.scale)
    gsap
      .timeline()
      .to(this.winText, { alpha: 1, duration: 0.12 })
      .to(this.winText.scale, { x: 1.15, y: 1.15, duration: 0.35, ease: 'back.out(2)' }, 0)
      .to(this.winText.scale, { x: 1, y: 1, duration: 0.2 }, '>-0.05')
      .to(this.winText, { alpha: 0, duration: 0.35, delay: 0.8 })
      .add(() => {
        if (this.winText) this.winText.visible = false
      })
  }

  private flashScreen(): void {
    if (!this.flash) return
    this.flash.alpha = 0.7
    gsap.to(this.flash, { alpha: 0, duration: 0.4, ease: 'power2.out' })
  }

  private shakeMachine(): void {
    const baseX = this.machine.x
    const baseY = this.machine.y
    gsap.fromTo(
      this.machine,
      { x: baseX - 7 },
      {
        x: baseX,
        duration: 0.4,
        ease: 'elastic.out(1, 0.4)',
        onUpdate: () => {
          this.machine.y = baseY + Math.sin(performance.now() / 28) * 2.5
        },
        onComplete: () => {
          this.machine.x = baseX
          this.machine.y = baseY
        },
      },
    )
  }

  private counterTargetInFx(): { x: number; y: number } {
    const el = document.getElementById('coin-counter')
    const canvas = this.game.app.canvas as HTMLCanvasElement | undefined
    if (!el || !canvas) {
      return { x: -DESIGN_W * 0.32, y: -DESIGN_H * 0.42 }
    }
    const er = el.getBoundingClientRect()
    const cr = canvas.getBoundingClientRect()
    if (cr.width < 1 || cr.height < 1) {
      return { x: -DESIGN_W * 0.32, y: -DESIGN_H * 0.42 }
    }
    const screenX = er.left + er.width * 0.18
    const screenY = er.top + er.height * 0.5
    const localX = ((screenX - cr.left) / cr.width) * this.game.width
    const localY = ((screenY - cr.top) / cr.height) * this.game.height
    return this.fxLayer.toLocal({ x: localX, y: localY })
  }

  private punchCoinCounter(): void {
    const el = document.getElementById('coin-counter')
    if (!el) return
    el.classList.remove('phud__coins--punch')
    // restart CSS animation
    void el.offsetWidth
    el.classList.add('phud__coins--punch')
  }

  private flyCoinsToCounter(): Promise<void> {
    return new Promise((resolve) => {
      const coinTex = this.tex('coin')
      const target = this.counterTargetInFx()
      const count = 28
      let done = 0
      const finish = () => {
        done++
        if (done >= count) resolve()
      }

      for (let i = 0; i < count; i++) {
        const sprite = new Sprite(coinTex)
        sprite.anchor.set(0.5)
        const startScale = 0.35 + Math.random() * 0.25
        sprite.scale.set(startScale)
        const ox = this.winX + (Math.random() - 0.5) * 70
        const oy = this.winY + (Math.random() - 0.5) * 50
        sprite.position.set(ox, oy)
        this.fxLayer.addChild(sprite)

        const delay = i * 0.028
        const duration = 0.55 + Math.random() * 0.25
        const midX = ox + (target.x - ox) * 0.45 + (Math.random() - 0.5) * 80
        const midY = oy + (target.y - oy) * 0.35 - 40 - Math.random() * 60

        gsap.to(sprite, {
          duration: duration * 0.45,
          delay,
          x: midX,
          y: midY,
          ease: 'power1.out',
          onComplete: () => {
            gsap.to(sprite, {
              duration: duration * 0.55,
              x: target.x,
              y: target.y,
              ease: 'power2.in',
              onComplete: () => {
                sprite.destroy()
                finish()
              },
            })
          },
        })
        gsap.to(sprite.scale, {
          x: startScale * 0.45,
          y: startScale * 0.45,
          duration,
          delay,
          ease: 'power2.in',
        })
      }
    })
  }

  private spawnConfetti(): void {
    const frames = ['confetti0', 'confetti1', 'confetti2', 'confetti3', 'confetti4'] as const
    for (let i = 0; i < 36; i++) {
      const sprite = new Sprite(this.tex(frames[i % frames.length]!))
      sprite.anchor.set(0.5)
      sprite.scale.set(0.65 + Math.random() * 0.5)
      sprite.rotation = Math.random() * Math.PI
      sprite.position.set(this.winX + (Math.random() - 0.5) * 60, this.winY - 30)
      this.fxLayer.addChild(sprite)
      this.particles.push({
        sprite,
        vx: (Math.random() - 0.5) * 340,
        vy: 30 + Math.random() * 200,
        vr: (Math.random() - 0.5) * 12,
        life: 0.9 + Math.random(),
        maxLife: 1.3,
        gravity: 400,
      })
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.vy += p.gravity * dt
      p.sprite.x += p.vx * dt
      p.sprite.y += p.vy * dt
      p.sprite.rotation += p.vr * dt
      p.life -= dt
      p.sprite.alpha = Math.max(0, p.life / p.maxLife)
      if (p.life <= 0 || Math.abs(p.sprite.x) > 900 || Math.abs(p.sprite.y) > 900) {
        p.sprite.destroy()
        this.particles.splice(i, 1)
      }
    }
  }

  private ensureAudio(): void {
    if (this.audioCtx) return
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.audioCtx = new AC()
  }

  private playStopClick(): void {
    if (!this.audioCtx) return
    const ctx = this.audioCtx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(520, t)
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08)
    gain.gain.setValueAtTime(0.08, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.12)
  }

  private playFanfare(): void {
    if (!this.audioCtx) return
    const ctx = this.audioCtx
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  }
}
