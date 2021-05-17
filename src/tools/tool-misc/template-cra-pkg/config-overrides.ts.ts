import {ReactScriptsHandler} from '@wfh/cra-scripts/dist/types';
// import plinkConfig from '@wfh/plink/wfh/dist/config';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths, env, cmdOpt) {
    // change CRA paths:

    // output directory will be dist/static/main
    if (cmdOpt.buildType === 'app')
      craPaths.appBuild = craPaths.appBuild + '$__appBuild__$';
    // Setting "craPaths.publicUrlOrPath" will override environment variable PUBLIC_URL
    // craPaths.publicUrlOrPath = '$__publicUrlOrPath__$';
  },

  webpack(cfg, env, cmdOpt) {
    // Change Webpack configure "cfg"
  },

  tsCompilerOptions(compileOptionsJson, cmdOpt) {
    // Change TS compiler options.
    // create-react-app does not support setting some of compilerOptions in tsconfig.json file like "paths",
    // but you can set them here like:
    //   compileOptionsJson.paths = {
    //     '@/*': [path.relative(compileOptionsJson.baseUrl as string, 'node_modules/foobar-pkg/src/*').replace(/\\/g, '/')]
    //   };
    //
    // Be aware that the compilerOptions will be applied to all depended packages,
    // all "paths, baseUrl" like value are relative to "work space" directory where create-react-app's tsconfig.json
    // file is located
  }
};

export default handler;
