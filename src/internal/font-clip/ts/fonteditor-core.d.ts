declare module 'fonteditor-core' {
  export type fontFileType = 'ttf' | 'woff' | 'woff2' | 'eof' | 'otf' | 'svg';
  export interface CreateOpt {
    type: fontFileType;
    subset?: number[];
    hinting?: boolean;
    compound2simple?: boolean;
    inflate?: null | Function;
    combinePath?: boolean;
  }
  export interface Font {
    get(): {[key: string]: any};
    write(opt: {type: fontFileType, hinting?: boolean, deflate?: null | Function}): Buffer;
    optimize(): void;
    compound2simple(): void;
    sort(): void;
    find(opt: {filter: (glyf: any) => void}): any;
  }
  interface FontFactory {
    create(buf: Buffer, opts: CreateOpt): Font;
  }
  export const Font: FontFactory;

  export const woff2: {
    init(): Promise<void>;
  }
}
