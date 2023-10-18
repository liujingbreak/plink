import {ReactScriptsHandler, CraScriptsPaths} from '@wfh/cra-scripts/dist/types';

const handler: ReactScriptsHandler = {
  changeCraPaths(_craPaths: CraScriptsPaths) {
  },
  webpack(cfg, _env, _cmdOpt) {
    // To work around issue: canvas-5-polyfill requiring node-canvas during Webpack compilation
    cfg.externals = [...(Array.isArray(cfg.externals) ? cfg.externals : []), 'canvas'];
  }
};


export default handler;
