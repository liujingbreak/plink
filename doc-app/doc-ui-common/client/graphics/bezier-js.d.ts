/**
 * http://pomax.github.io/bezierjs
 */

declare module 'bezier-js' {
  export type PointsCoords = number[] | {x: number; y: number; z?: number;}[];

  export interface CoordBounds {
    min: number;
    mid: number;
    max: number;
    size: number;
  }

  export class Bezier {
    points: {x: number;y: number}[];
    constructor(...coords: PointsCoords);

    length(): number;

    get(t: number): number;

    compute(t: number): number;

    bbox(): {x: CoordBounds; y: CoordBounds};

    split(t1: number, t2: number): Bezier;
    split(t: number): {left: Bezier; right: Bezier; span: {x: number;y: number}[]};

  }
}
