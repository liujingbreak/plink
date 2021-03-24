import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';
import {default as docUiCommon} from '@wfh/doc-ui-common/dist/webpack-config';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths, env, cmdOpt) {
    // change CRA paths:

    // output directory will be dist/static/main
    if (cmdOpt.buildType === 'app')
      craPaths.appBuild = craPaths.appBuild + '/plink';
    // webpack output.publicPath will be /main/, same as set environment variable PUBLIC_URL
    // craPaths.publicUrlOrPath = '/main/';
  },
  webpack(cfg, env, cmdOpt) {
    if (docUiCommon.webpack)
      docUiCommon.webpack(cfg, env, cmdOpt);
  }
};

export default handler;
