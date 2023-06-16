export type PaintableState = {
  /** value is calculated by relativeX */
  x: number;
  /** value is calculated by relativeY */
  y: number;
  /** value is calculated by relativeWidth */
  w: number;
  /** value is calculated by relativeHeight */
  h: number;
  /** relative size of parent, if parent is not a positional paintable, size is relative to reactive canvas, value is between 0 ~ 1 */
  relativeWidth?: number;
  relativeHeight?: number;
  /** relative left position to parent width, 0 - 1 */
  relativeX?: number;
  /** relative right position to parent height, 0 - 1 */
  relativeY?: number;
};


