import Path from 'path';
import {Transform} from 'stream';
import fs from 'fs';
import zlib from 'zlib';
import {config, log4File, ExtensionContext} from '@wfh/plink';
import {shutdownHook$} from '@wfh/plink/wfh/dist/app-server';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import * as _ from 'lodash';
import {Request, Response} from 'express';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import {NpmRegistryVersionJson, TarballsInfo} from './types';
import {createProxyWithCache, keyOfUri} from './cache-service';

const log = log4File(__filename);

export default function createNpmRegistryServer(api: ExtensionContext) {
  const setting = config()['@wfh/assets-processer'].npmRegistryCacheServer;
  if (setting == null)
    return;
  const STATE_FILE = Path.resolve(setting.cacheDir || config.resolve('destDir'), 'npm-registry-cache.json');

  const versionsCacheCtl = createProxyWithCache(Path.posix.join(setting.path || '/registry', 'versions'),
    setting.registry || 'https://registry.npmjs.org',
    Path.posix.join(setting.cacheDir || config.resolve('destDir'), 'versions')
  );

  const tarballDir = Path.resolve(setting.cacheDir || config.resolve('destDir'), 'tarballs');

  const pkgDownloadRouter = api.express.Router();

  api.use(Path.posix.join(setting.path || '/registry', '_tarballs'), pkgDownloadRouter);
  pkgDownloadRouter.get('/:pkgName/:version', (req, res) => {
  });

  const pkgDownloadCtl = createSlice({
    name: 'pkgCache',
    initialState: {} as TarballsInfo,
    reducers: {
      load(s: TarballsInfo, data: TarballsInfo) {
        s = {
          ...data
        };
      },
      add(s: TarballsInfo, payload: {pkgName: string; version: string; origUrl: string}) {
        let pkgEntry = s[payload.pkgName];
        if (pkgEntry == null)
          pkgEntry = s[payload.pkgName] = {};
        pkgEntry[payload.version] = payload.origUrl;
      },
      fetchTarball(_s: TarballsInfo,
        _payload: {req: Request; res: Response, pkgName: string; version: string; url: string}) {
      },
      fetchTarballDone(_s: TarballsInfo, _payload: {pkgName: string; version: string}) {}
    },
    debug: !!config().cliOptions?.verbose
  });

  pkgDownloadCtl.epic(action$ => {
    const actionByType = castByActionType(pkgDownloadCtl.actions, action$);
    // const fetchActionState = new Map<string, Response[]>();
    // map key is host name of remote tarball server
    const cacheSvcByOrigin = new Map<string, ReturnType<typeof createProxyWithCache>>();

    if (fs.existsSync(STATE_FILE)) {
      void fs.promises.readFile(STATE_FILE, 'utf-8')
      .then(content => {
        pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
      });
    }
    return rx.merge(
      // After state is loaded and changed, add a server shutdown hook to save state to file
      actionByType.load.pipe(
        op.switchMap(_action => pkgDownloadCtl.getStore()),
        op.take(1),
        op.map(() => {
          shutdownHook$.next(() => {
            log.info('Save changed npm-registry-cache');
            return fs.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState()));
          });
        })
      ),
      actionByType.fetchTarball.pipe(
        op.mergeMap(({payload}) => {
          return pkgDownloadCtl.getStore().pipe(
            op.map(s => _.get(s, [payload.pkgName, payload.version])),
            op.distinctUntilChanged(),
            op.filter(value => value != null),
            op.take(1),
            op.map(url => {
              const {origin, pathname} = new URL(url);
              let service = cacheSvcByOrigin.get(origin);
              if (service == null) {
                service = createProxyWithCache(`/${payload.pkgName}/${payload.version}`, origin,
                      tarballDir,
                      { manual: true,
                        pathRewrite(_path, _req) {
                          return pathname;
                        }
                });
                cacheSvcByOrigin.set(origin, service);
              }
              service.actionDispatcher.hitCache({
                key: keyOfUri(payload.req.method, url),
                req: payload.req, res: payload.res,
                next: () => {}
              });
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


  versionsCacheCtl.actionDispatcher.configureProxy({
    selfHandleResponse: true
  });

  versionsCacheCtl.actionDispatcher.configTransformer([
    (headers) => {
      let buffer = '';
      let decompress: Transform | undefined;
      let compresser: Transform | undefined;
      switch (headers['content-encoding']) {
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
      const transformers = decompress ? [decompress] : [];
      transformers.push();
      const processTrans = new Transform({
       transform(chunk, _encode, cb) {
            if (Buffer.isBuffer(chunk)) {
            buffer += chunk.toString();
          } else {
            buffer += chunk as string;
          }
          cb();
        },
        flush(cb) {
          const json = JSON.parse(buffer) as NpmRegistryVersionJson;
          const hostHeader = headers.find(([headerName, value]) => headerName.toLowerCase() === 'host')!;
          const host = hostHeader[1] as string;
          for (const [ver, versionEntry] of Object.entries(json.versions)) {
            pkgDownloadCtl.actionDispatcher.add({pkgName: json.name, version: ver, origUrl: versionEntry.dist.tarball});
            versionEntry.dist.tarball = host + `/_tarballs/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}`;
            log.info('rewrite tarball download URL to ' + versionEntry.dist.tarball);
          }
          cb(null, JSON.stringify(json));
        }
      });
      transformers.push(processTrans);
      if (compresser)
        transformers.push(compresser);
      return transformers;
    }
  ]);
}


