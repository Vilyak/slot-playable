import { inject, injectable } from 'tsyringe'
import { DI_TOKENS } from '@/di/tokens'
import { BunnySpawnerService } from '@/services/BunnySpawnerService'

@injectable()
export class GameCommands {
  private pendingAddBunny = 0

  constructor(
    @inject(DI_TOKENS.BunnySpawnerService) private readonly bunnySpawner: BunnySpawnerService,
  ) {}

  enqueueAddBunny(): void {
    this.pendingAddBunny += 1
  }

  enqueueAddSpineboy(): void {}

  flush(): void {
    while (this.pendingAddBunny > 0) {
      this.pendingAddBunny -= 1
      this.bunnySpawner.spawn()
    }
  }
}
