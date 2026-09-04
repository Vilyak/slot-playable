import 'reflect-metadata'
import { container } from 'tsyringe'
import { DI_TOKENS } from '@/di/tokens'
import { GameApplication } from '@/game/GameApplication'
import { GameLoop } from '@/game/GameLoop'
import { SceneRoot } from '@/game/SceneRoot'
import { GameCommands } from '@/game/GameCommands'
import { AssetService } from '@/assets/AssetService'
import { createGameWorld, type GameWorld } from '@/ecs/world'
import { SpriteStore } from '@/ecs/SpriteStore'
import { SpineStore } from '@/ecs/SpineStore'
import { TweenRuntimeStore } from '@/ecs/TweenRuntimeStore'
import { BunnySpawnerService } from '@/services/BunnySpawnerService'
import { SpineSpawnerService } from '@/services/SpineSpawnerService'
import { SpineService } from '@/services/SpineService'
import { CameraBootstrapService } from '@/services/CameraBootstrapService'
import { CameraCommandService } from '@/services/CameraCommandService'
import { TweenService } from '@/services/TweenService'
import { MovementSystem } from '@/ecs/systems/MovementSystem'
import { BounceSystem } from '@/ecs/systems/BounceSystem'
import { TweenSystem } from '@/ecs/systems/TweenSystem'
import { SpineSystem } from '@/ecs/systems/SpineSystem'
import { CameraSystem } from '@/ecs/systems/CameraSystem'
import { RenderSystem } from '@/ecs/systems/RenderSystem'
import { SlotService } from '@/slot/SlotService'
import { SlotSystem } from '@/slot/SlotSystem'
import type { ISystem } from '@/ecs/systems/ISystem'

let bootstrapped = false

export function bootstrapContainer() {
  if (bootstrapped) {
    return container
  }

  container.registerSingleton(DI_TOKENS.GameApplication, GameApplication)
  container.registerSingleton(DI_TOKENS.SceneRoot, SceneRoot)
  container.registerSingleton(DI_TOKENS.AssetService, AssetService)
  container.registerSingleton(DI_TOKENS.SpriteStore, SpriteStore)
  container.registerSingleton(DI_TOKENS.SpineStore, SpineStore)
  container.registerSingleton(DI_TOKENS.TweenRuntimeStore, TweenRuntimeStore)
  container.registerSingleton(DI_TOKENS.TweenService, TweenService)
  container.registerSingleton(DI_TOKENS.SpineService, SpineService)
  container.registerSingleton(DI_TOKENS.BunnySpawnerService, BunnySpawnerService)
  container.registerSingleton(DI_TOKENS.SpineSpawnerService, SpineSpawnerService)
  container.registerSingleton(DI_TOKENS.CameraBootstrapService, CameraBootstrapService)
  container.registerSingleton(DI_TOKENS.CameraCommandService, CameraCommandService)
  container.registerSingleton(DI_TOKENS.SlotService, SlotService)
  container.registerSingleton(DI_TOKENS.GameCommands, GameCommands)
  container.registerSingleton(DI_TOKENS.GameLoop, GameLoop)
  container.registerSingleton(DI_TOKENS.MovementSystem, MovementSystem)
  container.registerSingleton(DI_TOKENS.BounceSystem, BounceSystem)
  container.registerSingleton(DI_TOKENS.TweenSystem, TweenSystem)
  container.registerSingleton(DI_TOKENS.SpineSystem, SpineSystem)
  container.registerSingleton(DI_TOKENS.CameraSystem, CameraSystem)
  container.registerSingleton(DI_TOKENS.RenderSystem, RenderSystem)
  container.registerSingleton(DI_TOKENS.SlotSystem, SlotSystem)

  container.registerInstance(DI_TOKENS.GameWorld, createGameWorld())

  container.register(DI_TOKENS.Systems, {
    useFactory: (c) =>
      [
        c.resolve<SlotSystem>(DI_TOKENS.SlotSystem),
        c.resolve<TweenSystem>(DI_TOKENS.TweenSystem),
        c.resolve<RenderSystem>(DI_TOKENS.RenderSystem),
      ] satisfies ISystem[],
  })

  bootstrapped = true
  return container
}

export function resolveGameApplication(): GameApplication {
  return container.resolve<GameApplication>(DI_TOKENS.GameApplication)
}

export function resolveSceneRoot(): SceneRoot {
  return container.resolve<SceneRoot>(DI_TOKENS.SceneRoot)
}

export function resolveAssetService(): AssetService {
  return container.resolve<AssetService>(DI_TOKENS.AssetService)
}

export function resolveGameLoop(): GameLoop {
  return container.resolve<GameLoop>(DI_TOKENS.GameLoop)
}

export function resolveGameCommands(): GameCommands {
  return container.resolve<GameCommands>(DI_TOKENS.GameCommands)
}

export function resolveCameraBootstrapService(): CameraBootstrapService {
  return container.resolve<CameraBootstrapService>(DI_TOKENS.CameraBootstrapService)
}

export function resolveCameraCommandService(): CameraCommandService {
  return container.resolve<CameraCommandService>(DI_TOKENS.CameraCommandService)
}

export function resolveTweenService(): TweenService {
  return container.resolve<TweenService>(DI_TOKENS.TweenService)
}

export function resolveSpineService(): SpineService {
  return container.resolve<SpineService>(DI_TOKENS.SpineService)
}

export function resolveSlotService(): SlotService {
  return container.resolve<SlotService>(DI_TOKENS.SlotService)
}

export function resolveGameWorld(): GameWorld {
  return container.resolve<GameWorld>(DI_TOKENS.GameWorld)
}
