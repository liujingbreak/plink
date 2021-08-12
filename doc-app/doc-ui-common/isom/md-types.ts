export interface TOC {
  level: number;
  tag: string;
  text: string;
  id: string;
  children?: TOC[];
}

export interface LoaderRecivedData {
  toc: TOC[];
  content: string;
}
