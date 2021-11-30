import Path from 'path';
import {Transform} from 'stream';
import fs from 'fs';
import {config, log4File, ExtensionContext} from '@wfh/plink';
import {shutdownHook$} from '@wfh/plink/wfh/dist/app-server';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createSlice, castByActionType} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';
import {NpmRegistryVersionJson, TarballsInfo} from './types';
import {createProxyWithCache} from './cache-service';

const log = log4File(__filename);

const STATE_FILE = config.resolve('destDir', 'npm-registry-cache.json');

export default function createNpmRegistryServer(api: ExtensionContext) {
  const setting = config()['@wfh/assets-processer'].npmRegistryCacheServer;
  if (setting == null)
    return;

  const versionsCacheCtl = createProxyWithCache(Path.posix.join(setting.path || '/registry', 'versions'),
    setting.registry || 'https://registry.npmjs.org',
    Path.posix.join(setting.cacheDir || config.resolve('destDir'), 'versions')
  );

  const pkgDownloadRouter = api.express.Router();

  api.use(Path.posix.join(setting.path || '/registry', 'packages'), pkgDownloadRouter);
  pkgDownloadRouter.get('/:pkgName', (req, res) => {

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
      }
    },
    debug: !!config().cliOptions?.verbose
  });

  pkgDownloadCtl.epic(action$ => {

    const actionByType = castByActionType(pkgDownloadCtl.actions, action$);

    if (fs.existsSync(STATE_FILE)) {
      void fs.promises.readFile(STATE_FILE, 'utf-8')
      .then(content => {
        pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
      });
    }
    return rx.merge(
      // After state is loaded and changed, add a server shutdown hook to save state to file
      actionByType.load.pipe(
        op.switchMap(action => pkgDownloadCtl.getStore()),
        op.take(1),
        op.map(() => {
          shutdownHook$.next(() => {
            log.info('Save changed npm-registry-cache');
            return fs.promises.writeFile(config.resolve('destDir', 'npm-registry-cache.json'), JSON.stringify(pkgDownloadCtl.getState()));
          });
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
    () => {
      let buffer = '';
      return new Transform({
        transform(chunk, encode, cb) {
          if (Buffer.isBuffer(chunk)) {
            buffer += chunk.toString();
          } else {
            buffer += chunk as string;
          }
          cb();
        },
        flush(cb) {
          const json = JSON.parse(buffer) as NpmRegistryVersionJson;
          for (const [ver, versionEntry] of Object.entries(json.versions)) {
            pkgDownloadCtl.actionDispatcher.add({pkgName: json.name, version: ver, origUrl: versionEntry.dist.tarball});
          }
          cb(null, JSON.stringify(json));
        }
      });
    }
  ]);
}


