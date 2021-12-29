import Path from 'path';
import {Transform} from 'stream';
import fs from 'fs';
import zlib from 'zlib';
import {config, log4File, ExtensionContext} from '@wfh/plink';
import {shutdownHooks} from '@wfh/plink/wfh/dist/app-server';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import * as _ from 'lodash';
import {Request, Response} from 'express';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import {CacheData, NpmRegistryVersionJson, TarballsInfo} from './types';
import {createProxyWithCache, keyOfUri} from './cache-service';

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
  log.info('NPM registry cache is serving at ', servePath);
  const versionsCacheCtl = createProxyWithCache(servePath,
    setting.registry || 'https://registry.npmjs.org',
    Path.posix.join(setting.cacheDir || config.resolve('destDir'), 'versions')
  );

  const tarballDir = Path.resolve(setting.cacheDir || config.resolve('destDir'), 'download-tarballs');

  const pkgDownloadRouter = api.express.Router();

  const serveTarballPath = Path.posix.join(setting.path || '/registry', '_tarballs');

  api.use(serveTarballPath, pkgDownloadRouter);
  pkgDownloadRouter.get('/:pkgName/:version', (req, res) => {
    log.info('incoming request download tarball', req.params.pkgName);
    pkgDownloadCtl.actionDispatcher.fetchTarball({req, res, pkgName: req.params.pkgName, version: req.params.version});
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
        log.info('Read cache state file:', STATE_FILE);
        pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
      });
    }
    shutdownHooks.push(() => {
      log.info('Save changed', STATE_FILE);
      return fs.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState(), null, '  '));
    });

    return rx.merge(
       actionByType.fetchTarball.pipe(
        op.mergeMap(({payload}) => {
          return pkgDownloadCtl.getStore().pipe(
            op.map(s => _.get(s, [payload.pkgName, payload.version])),
            op.distinctUntilChanged(),
            op.filter(value => value != null),
            op.take(1),
            op.map(url => {
              try {
                const {origin, pathname} = new URL(url);
                let service = cacheSvcByOrigin.get(origin);
                if (service == null) {
                  log.info('create download proxy intance for', origin);
                  service = createProxyWithCache(origin, origin,
                    tarballDir,
                    { manual: true });
                  cacheSvcByOrigin.set(origin, service);
                  service.actionDispatcher.configureProxy({
                    pathRewrite(_path, req) {
                      const {params: {pkgName, version}} = (req as Request<PkgDownloadRequestParams>);
                      const url = pkgDownloadCtl.getState()[pkgName][version];
                      const {pathname} = new URL(url);
                      return pathname;
                    }
                  });
                }
                service.actionDispatcher.hitCache({
                  key: keyOfUri(payload.req.method, pathname),
                  req: payload.req, res: payload.res,
                  next: () => {}
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


  versionsCacheCtl.actionDispatcher.configureProxy({
    selfHandleResponse: true
  });

  versionsCacheCtl.actionDispatcher.configTransformer({
    remote: [ createTransformer(true)],
    cached: [createTransformer(false)]
  });

  function createTransformer(trackRemoteUrl: boolean) {
    return (headers: CacheData['headers'], reqHost: string | undefined) => {
      let buffer = '';
      let decompress: Transform | undefined;
      let compresser: Transform | undefined;
      const encodingHeader = headers.find(([name, value]) => name === 'content-encoding');
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
      const transformers = decompress ? [decompress] : [];
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
          try {
            const json = JSON.parse(buffer) as NpmRegistryVersionJson;
            const param: {[ver: string]: string} = {};
            for (const [ver, versionEntry] of Object.entries(json.versions)) {
              param[ver] = versionEntry.dist.tarball;
              versionEntry.dist.tarball = (reqHost || DEFAULT_HOST) + `${serveTarballPath}/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}`;
              // log.info('rewrite tarball download URL to ' + versionEntry.dist.tarball);
            }
            if (trackRemoteUrl)
              pkgDownloadCtl.actionDispatcher.add({pkgName: json.name, versions: param});

            cb(null, JSON.stringify(json));
          } catch (e) {
            log.error(e);
            return cb(e as Error);
          }
        }
      });
      transformers.push(processTrans);
      if (compresser)
        transformers.push(compresser);
      return transformers;
    };
  }
}


