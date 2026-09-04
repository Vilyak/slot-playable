import { addComponent, addEntity } from 'bitecs'
import type { GameWorld } from '@/ecs/world'
import { BaseEntity } from '@/ecs/entities/BaseEntity'

export class Bunny extends BaseEntity {
  create(world: GameWorld): number {
    const { Position, Velocity } = world.components
    const eid = addEntity(world)

    addComponent(world, eid, Position)
    addComponent(world, eid, Velocity)

    return eid
  }

  static create(world: GameWorld): number {
    return new Bunny().create(world)
  }
}
