import { inject, injectable } from 'tsyringe'
import { DI_TOKENS } from '@/di/tokens'
import type { ISystem } from '@/ecs/systems/ISystem'
import { SlotService } from '@/slot/SlotService'

@injectable()
export class SlotSystem implements ISystem {
  constructor(
    @inject(DI_TOKENS.SlotService) private readonly slot: SlotService,
  ) {}

  update(dt: number): void {
    this.slot.update(dt)
  }
}
