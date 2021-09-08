import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';
// import {config} from '@wfh/plink';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths, env, cmdOpt) {
    // change CRA paths:

    // output directory will be dist/static/main
    if (cmdOpt.buildType === 'app')
      craPaths.appBuild = craPaths.appBuild + '$__appBuild__$';
    // Setting "craPaths.publicUrlOrPath" will override environment variable PUBLIC_URL,
    // can not contain "host:port", otherwise react-dev-utils/WebpackDevServerUtils won't work correctly.
    // craPaths.publicUrlOrPath = '$__publicUrlOrPath__$';
  },

  webpack(cfg, env, cmdOpt) {
    // Change Webpack configure "cfg"
  }
};

export default handler;
