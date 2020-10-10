declare module 'gulp-sourcemaps' {
  interface InitOptions {
    loadMaps?: boolean;
    debug?: boolean;
  }

  interface WriteMapper {
      (file: string): string;
  }

  interface CloneOptions {
      contents?: boolean;
  }
  interface WriteOptions {
    addComment?: boolean;
    includeContent?: boolean;
    sourceRoot?: string | WriteMapper;
    sourceMappingURLPrefix?: string | WriteMapper;
    clone?: boolean | CloneOptions;
  }
  export function init(): NodeJS.ReadWriteStream;
  export function write(path?: string, opts?: WriteOptions): NodeJS.ReadWriteStream;
  export function write(opts?: WriteOptions): NodeJS.ReadWriteStream;
  export function mapSources(cb: (sourcePath: string, file: any) => string): NodeJS.ReadWriteStream;
}
