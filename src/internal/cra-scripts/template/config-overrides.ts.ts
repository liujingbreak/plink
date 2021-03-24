import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';
// import plinkConfig from '@wfh/plink/wfh/dist/config';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths, env, cmdOpt) {
    // change CRA paths:

    // output directory will be dist/static/main
    craPaths.appBuild = craPaths.appBuild + '/main';
    // webpack output.publicPath will be /main/, same as set environment variable PUBLIC_URL
    craPaths.publicUrlOrPath = '/main/';
  },

  webpack(cfg, env, cmdOpt) {
    // change Webpack configure "cfg"
  }
};

export default handler;
