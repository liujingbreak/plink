/* eslint-disable no-console */
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
import Path from 'path';
import {sep} from 'path';
import fs from 'fs-extra';
import {hookCommonJsRequire} from '@wfh/plink/wfh/dist/loaderHooks';
import {drawPuppy} from './utils';
import _paths from './cra-scripts-paths';
import {getCmdOptions} from './utils';
import {hackWebpack4Compiler} from './hack-webpack-api';
import {register as registerForkTsChecker} from './hack-fork-ts-checker';
// Avoid child process require us!
const deleteExecArgIdx: number[] = [];
for (let i = 0, l = process.execArgv.length; i < l; i++) {
  if (i < l - 1 && /^(?:-r|--require)$/.test(process.execArgv[i]) &&
  /^@wfh\/cra-scripts($|\/)/.test(process.execArgv[i + 1])) {
    deleteExecArgIdx.push(i);
  }
}
deleteExecArgIdx.reduce((offset, deleteIdx) => {
  process.execArgv.splice(deleteIdx + offset, 2);
  return offset + 2;
}, 0);

export function poo() {
  const getCraPaths = (require('./cra-scripts-paths') as {default: typeof _paths}).default;

  const reactScriptsPath = Path.resolve('node_modules/react-scripts');
  // const reactDevUtilsPath = Path.resolve('node_modules/react-dev-utils');
  const buildScriptsPath = Path.resolve('node_modules', 'react-scripts', 'scripts', 'build.js');

  const reactWebpackCfg = Path.resolve('node_modules/react-scripts/config/webpack.config.js');
  const reactWebpackDevServerCfg = Path.resolve('node_modules/react-scripts/config/webpackDevServer.config.js');
  const clearConsole = Path.resolve('node_modules/react-dev-utils/clearConsole.js');
  const craPaths = Path.resolve('node_modules/react-scripts/config/paths.js');

  const craPackagesPathPrefix = Path.resolve('node_modules/react-');

  // Disable @pmmmwh/react-refresh-webpack-plugin, since it excludes our node_modules
  // from HMR
  // process.env.FAST_REFRESH = 'false';

  hookCommonJsRequire((filename, target, req, resolve) => {
    if (filename.startsWith(reactScriptsPath + sep)) {
      if (filename === buildScriptsPath) {
        if (target === 'fs-extra') {
          if (getCmdOptions().buildType === 'lib') {
            // Disable copy public path
            return Object.assign({}, fs, {
              copySync(src: string) {
                console.log('[prepload] skip copy ', src);
              }
            });
          } else {
            return Object.assign({}, fs, {
              emptyDirSync(dir: string) {
                console.log('[prepload] skip emptyDirSync ', dir);
              }
            });
          }
        }
        if (target === 'webpack') {
          return hackWebpack4Compiler();
        }
      }
      switch (resolve(target)) {
        case reactWebpackCfg:
          return require('./webpack.config').default;
        case reactWebpackDevServerCfg:
          return require('./webpack.devserver.config').default;
        case clearConsole:
          return noClearConsole;
        case craPaths:
          return getCraPaths();
        default:
      }
      if (target === 'react-dev-utils/openBrowser') {
        return require('./cra-open-browser.cjs').default;
      }
    } else if (filename.startsWith(craPackagesPathPrefix)) {
      switch (resolve(target)) {
        case craPaths:
          return getCraPaths();
        case clearConsole:
          return noClearConsole;
        default:
      }
    }
  });

  registerForkTsChecker();
}



function noClearConsole() {
  // origClearConsole();
  drawPuppy('pooed on create-react-app');
}
