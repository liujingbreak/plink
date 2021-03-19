import {ReactScriptsHandler, CraScriptsPaths} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths: CraScriptsPaths) {
    // change CRA paths:

    // output directory will be dist/static/main
    craPaths.appBuild = craPaths.appBuild + '/plink';
    // webpack output.publicPath will be /main/, same as set environment variable PUBLIC_URL
    // craPaths.publicUrlOrPath = '/main/';
  },
  webpack(cfg, env, cmdOpt) {
    // Change webpack configure here
  }
};

export default handler;
