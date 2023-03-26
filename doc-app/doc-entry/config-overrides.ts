import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';
import {default as docUiCommon} from '@wfh/doc-ui-common/dist/webpack-config';
import {config} from '@wfh/plink';
import * as op from 'rxjs/operators';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths, env, cmdOpt) {
    // change CRA paths:

    // output directory will be dist/static/main
    if (cmdOpt.buildType === 'app') {
      craPaths.appBuild = craPaths.appBuild + '/plink';
      craPaths.publicUrlOrPath = '/plink';
    }
    // webpack output.publicPath will be /main/, same as set environment variable PUBLIC_URL
    // craPaths.publicUrlOrPath = '/main/';
  },
  webpack(cfg, env, cmdOpt) {
    if (docUiCommon.webpack)
      docUiCommon.webpack(cfg, env, cmdOpt);
    // For file watch limitation in Termux
  }
};

config.getStore().pipe(
  op.share(),
  op.map(setting => setting['@wfh/doc-entry'].basename),
  op.distinctUntilChanged(),
  op.map(basename => {
    process.env.REACT_APP_routeBasename = basename;
  })
).subscribe();

export default handler;
