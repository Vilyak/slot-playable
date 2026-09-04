import type { GameWorld } from '@/ecs/world'

export abstract class BaseEntity {
  abstract create(world: GameWorld): number
}
