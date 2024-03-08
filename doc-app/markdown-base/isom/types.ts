export interface TOC {
  /** begin with 0 */
  level: number;
  tag: string;
  text: string;
  id: string;
  children?: TOC[];
}

export interface LoaderRecivedData {
  toc: TOC[];
  html: string;
  mermaids: string[];
  /** Available relative markdown file links, for Webpack compilation */
  links?: {[id: string]: () => (Promise<LoaderRecivedData> | LoaderRecivedData)};
  /** Available relative markdown file links, For real time server side markdown rendering */
  linkHashes?: string[];
}
