import Path from 'path';
import os from 'os';
import {Transform, Writable, Readable, promises as streamProm} from 'stream';
import fs from 'fs';
import zlib from 'zlib';
import {config, log4File, ExtensionContext} from '@wfh/plink';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import * as _ from 'lodash';
import {Request, Response} from 'express';
import ProxyAgent from 'proxy-agent';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import chalk from 'chalk';
import {CacheData, NpmRegistryVersionJson, TarballsInfo, Transformer} from './types';
import {createProxyWithCache} from './cache-service';
// import insp from 'inspector';
// insp.open(9222, '0.0.0.0', true);
const isWin = os.platform().indexOf('win32') >= 0;
const log = log4File(__filename);

type PkgDownloadRequestParams = {
  pkgName: string;
  version: string;
};

export default function createNpmRegistryServer(api: ExtensionContext) {
  const setting = config()['@wfh/assets-processer'].npmRegistryCacheServer;
  if (setting == null)
    return;
  const DEFAULT_HOST = setting.host || (`http://localhost${config().port !== 80 ? ':' + config().port : ''}`);
  const STATE_FILE = Path.resolve(setting.cacheDir || config.resolve('destDir'), 'npm-registry-cache.json');

  const servePath = Path.posix.join(setting.path || '/registry', 'versions');
  const envVarDesc = `${isWin ? 'set' : 'export'} npm_config_registry=http://${config().localIP}:${config().port}${servePath}`;
  log.info('NPM registry cache is serving at ', servePath, '\n' +
    `You can set environment variable: ${chalk.cyan(envVarDesc)}`);

  const versionsCacheCtl = createProxyWithCache(servePath, {
      selfHandleResponse: true,
      target: setting.registry || 'https://registry.npmjs.org',
      agent: setting.proxy ? new ProxyAgent(setting.proxy) : undefined
    },
    Path.posix.join(setting.cacheDir || config.resolve('destDir'), 'versions')
  );

  const tarballDir = Path.resolve(setting.cacheDir || config.resolve('destDir'), 'download-tarballs');
  const pkgDownloadRouter = api.express.Router();
  const serveTarballPath = Path.posix.join(setting.path || '/registry', '_tarballs');

  api.expressAppSet(app => app.use(serveTarballPath, pkgDownloadRouter));

  pkgDownloadRouter.get<PkgDownloadRequestParams>('/:pkgName/:version', (req, res) => {
    pkgDownloadCtl.actionDispatcher.fetchTarball({
      req, res, pkgName: req.params.pkgName, version: req.params.version});
  });

  const pkgDownloadCtl = createSlice({
    name: 'pkgCache',
    initialState: {} as TarballsInfo,
    reducers: {
      load(s: TarballsInfo, data: TarballsInfo) {
        Object.assign(s, data);
      },
      add(s: TarballsInfo, payload: {pkgName: string; versions: {[version: string]: string}}) {
        let pkgEntry = s[payload.pkgName];
        if (pkgEntry == null)
          s[payload.pkgName] = payload.versions;
        else
          s[payload.pkgName] = {...pkgEntry, ...payload.versions};
      },
      fetchTarball(_s: TarballsInfo,
        _payload: {req: Request<PkgDownloadRequestParams>; res: Response; pkgName: string; version: string}) {
      }
    },
    debugActionOnly: !!config().cliOptions?.verbose
  });

  pkgDownloadCtl.epic(action$ => {
    const actionByType = castByActionType(pkgDownloadCtl.actions, action$);
    // const fetchActionState = new Map<string, Response[]>();
    // map key is host name of remote tarball server
    // const cacheSvcByOrigin = new Map<string, ReturnType<typeof createProxyWithCache>>();
    const tarballCacheSerivce = createProxyWithCache('', {followRedirects: true, selfHandleResponse: true},
      tarballDir);

    if (fs.existsSync(STATE_FILE)) {
      void fs.promises.readFile(STATE_FILE, 'utf-8')
      .then(content => {
        log.info('Read cache state file:', STATE_FILE);
        pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
      });
    }

    return rx.merge(
       actionByType.fetchTarball.pipe(
        op.mergeMap(({payload}) => {
          return pkgDownloadCtl.getStore().pipe(
            op.map(s => _.get(s, [payload.pkgName, payload.version])),
            op.distinctUntilChanged(),
            op.filter(value => value != null),
            op.take(1),
            op.map(url => {
              log.info('incoming request download', url);
              try {
                tarballCacheSerivce.actionDispatcher.hitCache({
                  key: url.replace(/^https?:\//g, ''),
                  req: payload.req, res: payload.res,
                  next: () => {},
                  target: url
                });
              } catch (e) {
                log.error('Failed for download URL:' + url, e);
                throw e;
              }
            })
          );
        })
      )
    ).pipe(
      op.ignoreElements(),
      op.catchError((err, src) => {
        log.error(err);
        return src; // re-subsribe on fail
      })
    );
  });

  versionsCacheCtl.actionDispatcher.configTransformer({
    remote: createTransformer(true),
    cached: createTransformer(false)
  });

  function createTransformer(trackRemoteUrl: boolean): Transformer {
    return async (headers: CacheData['headers'], reqHost: string | undefined,
      source: NodeJS.ReadableStream) => {
      let fragments = '';
      let bufLength = 0;
      const subject = new rx.ReplaySubject<Buffer>();
      let decompress: NodeJS.ReadWriteStream | undefined;
      let compresser: NodeJS.ReadWriteStream | undefined;
      const encodingHeader = headers.find(([name]) => name === 'content-encoding');
      const contentEncoding = encodingHeader ? encodingHeader[1] : '';
      switch (contentEncoding) {
        case 'br':
          decompress = zlib.createBrotliDecompress();
          compresser = zlib.createBrotliCompress();
          break;
        // Or, just use zlib.createUnzip() to handle both of the following cases:
        case 'gzip':
          decompress = zlib.createGunzip();
          compresser = zlib.createGzip();
          break;
        case 'deflate':
          decompress = zlib.createInflate();
          compresser = zlib.createDeflate();
          break;
        default:
      }
      const transformers: any[] = decompress ? [decompress] : [];
      const processTrans = new Transform({
        transform(chunk, _encode, cb) {
          if (Buffer.isBuffer(chunk)) {
            fragments += chunk.toString();
          } else {
            fragments += chunk as string;
          }
          cb();
        },
        flush(cb) {
          if (fragments.length === 0) {
            return cb(null, '');
          }
          try {
            const json = JSON.parse(fragments) as NpmRegistryVersionJson;
            const param: {[ver: string]: string} = {};

            if (json.versions) {
              for (const [ver, versionEntry] of Object.entries(json.versions)) {
                const origTarballUrl = param[ver] = versionEntry.dist.tarball;
                const urlObj = new URL(origTarballUrl);
                const url = versionEntry.dist.tarball = (reqHost || DEFAULT_HOST) +
                  `${serveTarballPath}/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}${urlObj.search}`;
                if (!url.startsWith('http'))
                  versionEntry.dist.tarball = 'http://' + url;
              }
              if (trackRemoteUrl)
                pkgDownloadCtl.actionDispatcher.add({pkgName: json.name, versions: param});

              cb(null, JSON.stringify(json));
            } else {
              log.info('Skip transform', fragments);
              cb(null, fragments);
            }

          } catch (e) {
            log.error(fragments, e);
            return cb(null, '');
          }
        }
      });
      transformers.push(processTrans);
      if (compresser)
        transformers.push(compresser);

      transformers.push( new Writable({
          write(chunk_1, _enc, cb_2) {
            const buffer = Buffer.isBuffer(chunk_1) ? chunk_1 : Buffer.from(chunk_1 as string);
            bufLength += buffer.length;
            subject.next(buffer);
            cb_2();
          },
          final(cb_3) {
            subject.complete();
            cb_3();
          }
        })
      );
      // NodeJS bug: https://github.com/nodejs/node/issues/40191:
      // stream.promises.pipeline doesn't support arrays of streams since node 16.10
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const done: Promise<unknown> = (streamProm.pipeline as any)(source, ...transformers);
      await done;

      return {
        length: bufLength,
        readable: () => new Readable({
          read() {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const self = this;
            subject.subscribe({
              next(buf) {
                self.push(buf);
              },
              error(err) {
                self.destroy(err);
              },
              complete() {
                self.push(null);
              }
            });
          }
        })
      };
    };
  }

  return () => {
    log.info('Save changed', STATE_FILE);
    return fs.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState(), null, '  '));
  };
}
