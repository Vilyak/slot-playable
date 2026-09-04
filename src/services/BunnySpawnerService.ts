import { injectable } from 'tsyringe'

/** Demo bunny spawner — disabled in candy slot playable. */
@injectable()
export class BunnySpawnerService {
  spawn(_x?: number, _y?: number): number {
    return -1
  }
}
