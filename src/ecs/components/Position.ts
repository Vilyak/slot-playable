export class Position {
  x: number[] = []
  y: number[] = []

  set(eid: number, x: number, y: number): void {
    this.x[eid] = x
    this.y[eid] = y
  }
}
