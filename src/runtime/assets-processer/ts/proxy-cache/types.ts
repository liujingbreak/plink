// import { Options as HpmOptions} from 'http-proxy-middleware';
import stream from 'stream';

export type ProxyCacheState = {
  // proxyOptions: HpmOptions;
  cacheDir: string;
  cacheByUri: Map<string, CacheData | 'loading' | 'requesting'>;
  /** transform remote response */
  responseTransformer: ((resHeaders: CacheData['headers'], reqHost: string | undefined) => stream.Transform[])[];
  /** transform cached response */
  cacheTransformer: ((resHeaders: CacheData['headers'], reqHost: string | undefined) => stream.Transform[])[];
  error?: Error;
};

export type CacheData = {
  statusCode: number;
  headers: [string, string | string[]][];
  body: Buffer;
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
