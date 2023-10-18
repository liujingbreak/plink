import {SegmentIndexed} from './segment';

export interface Polygon {
  vertices: SegmentIndexed[];
  /** Plane equation:
   *  nx * x + ny * y + nz * z = d
   * Where:
   *  d = nx * x0 + ny * y0 + nz * z0
   */
  plane: {
    /** normal vector */
    n: readonly [number, number, number];
    d: number;
  };
}

export function calcPlaneEquation(plane: Partial<Polygon['plane']>, vertices: SegmentIndexed[]) {
  const [p0x, p0y, p0z] = vertices[0].point;
  const [p1x, p1y, p1z] = vertices[1].point;
  const [p2x, p2y, p2z] = vertices[2].point;
  const x1 = p1x - p0x;
  const y1 = p1y - p0y;
  const z1 = p1z - p0z;
  const x2 = p2x - p0x;
  const y2 = p2y - p0y;
  const z2 = p2z - p0z;

  const n = [y1 * z2 - z1 * y2, z1 * x2 - x1 * z2, x1 * y2 - y1 * x2] as const;
  const d = n[0] * x1 + n[1] * y1 + n[2] * z1;

  plane.n = n;
  plane.d = d;
}

