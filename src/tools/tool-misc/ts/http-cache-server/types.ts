export type Transformer = (resHeaders: CacheData['headers'],
  reqHost: string | undefined, source: NodeJS.ReadableStream) => PromiseLike<{
  readable: () => NodeJS.ReadableStream;
  length: number
}>;

export type ProxyCacheState = {
  // proxy: httpProxy;
  cacheDir?: string;
  /** transform remote response */
  responseTransformer?: Transformer;
  /** transform cached response */
  cacheTransformer?: Transformer;
  error?: Error;
};

export type CacheData = {
  statusCode: number;
  headers: [string, string | string[]][];
  body: () => NodeJS.ReadableStream;
};

export type NpmRegistryVersionJson = {
  name: string;
  'dist-tags': {[key: string]: string};
  versions: {
    [version: string]: {
      version: string;
      dist: {
        shasum: string;
        size: number;
        noattachment: boolean;
        tarball: string;
      };
    };
  };
};

/**
 * Store original tarball download URL
 */
export type TarballsInfo = {
  [pkgName: string]: {
    [version: string]: string;
  };
};
