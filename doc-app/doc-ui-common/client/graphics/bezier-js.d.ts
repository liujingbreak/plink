/**
 * http://pomax.github.io/bezierjs
 */

declare module 'bezier-js' {
  export type PointsCoords = [number, number, number?][] | {x: number; y: number; z?: number;}[];

  export interface CoordBounds {
    min: number;
    mid: number;
    max: number;
    size: number;
  }

  export class Bezier {
    points: Point[];
    constructor(...coords: PointsCoords);

    length(): number;

    get(t: number): number;

    compute(t: number): number;

    bbox(): {x: CoordBounds; y: CoordBounds};

    split(t1: number, t2: number): Bezier;
    split(t: number): {left: Bezier; right: Bezier; span: {x: number;y: number}[]};

    lineIntersects(line: {p1: Point; p2: Point}): number[];
  }

  export type Point = {x: number; y: number; z?: number};
}
