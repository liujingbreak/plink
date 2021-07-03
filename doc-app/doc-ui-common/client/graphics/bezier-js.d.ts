declare module 'bezier-js/dist/bezier' {
  export type PointsCoords = number[] | {x: number; y: number; z?: number;}[];

  export interface CoordBounds {
    min: number;
    mid: number;
    max: number;
    size: number;
  }

  export class Bezier {
    constructor(...coords: PointsCoords);

    length(): number;

    get(t: number): number;

    compute(t: number): number;

    bbox(): {x: CoordBounds; y: CoordBounds};
  }
}
