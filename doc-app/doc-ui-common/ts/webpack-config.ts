import {ReactScriptsHandler, CraScriptsPaths} from '@wfh/cra-scripts/dist/types';
import {findLoader} from '@wfh/webpack-common/dist/webpack-util';
import path from 'path';

const handler: ReactScriptsHandler = {
  changeCraPaths(craPaths: CraScriptsPaths) {
  },
  webpack(cfg, env, cmdOpt) {
    if (cfg.module?.rules) {
      findLoader(cfg.module.rules, (loader, ruleSet, idx, useItems) => {
        if (/node_modules[/\\]sass-loader[/\\]/.test(loader)) {
          useItems.push(path.resolve(__dirname, 'sass-theme-loader.js'));
          // return true;
        }
        return false;
      });
    }

    // To work around issue: canvas-5-polyfill requiring node-canvas during Webpack compilation
    cfg.externals = [...(Array.isArray(cfg.externals) ? cfg.externals : []), 'canvas'];
  }
};


export default handler;
