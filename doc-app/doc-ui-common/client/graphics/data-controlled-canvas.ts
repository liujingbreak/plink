
export interface Drawable {
  id: string;
  cacheId?: string | null;
  parentId?: string | null;
  isAnimating: boolean;
  renderer: string;
  /** children Drawable's id */
  children: string[];
}

export interface CanvasState {
  drawableById: {[id: string]: Drawable};
}

// export const actions = 

export const caches = new Map<string, HTMLCanvasElement>();
export const renderers = new Map<string, Renderer>();

export type Renderer = (ctx: CanvasRenderingContext2D, target: Drawable) => void;
