import { addComponent, addEntity } from 'bitecs'
import type { GameWorld } from '@/ecs/world'
import { BaseEntity } from '@/ecs/entities/BaseEntity'

export class CameraEntity extends BaseEntity {
  create(world: GameWorld): number {
    const { Camera } = world.components
    const eid = addEntity(world)
    addComponent(world, eid, Camera)
    return eid
  }

  static create(world: GameWorld): number {
    return new CameraEntity().create(world)
  }
}
