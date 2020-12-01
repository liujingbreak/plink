// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
import {drawPuppy} from './utils';
import _paths from './cra-scripts-paths';
import {getCmdOptions} from './utils';
import Path from 'path';
import fs from 'fs-extra';
import {hackWebpack4Compiler} from './hack-webpack-api';
import Module from 'module';
import {sep, resolve, dirname} from 'path';
// Avoid child process require us!
const deleteExecArgIdx: number[] = [];
for (let i = 0, l = process.execArgv.length; i < l; i++) {
  if (i < l - 1 && /^(?:\-r|\-\-require)$/.test(process.execArgv[i]) &&
  /^@wfh\/cra\-scripts($|\/)/.test(process.execArgv[i + 1])) {
    deleteExecArgIdx.push(i);
  }
}
deleteExecArgIdx.reduce((offset, deleteIdx) => {
  process.execArgv.splice(deleteIdx + offset, 2);
  return offset + 2;
}, 0);

// drawPuppy('Loading my poo...');
// saveCmdArgToEnv();
// poo();

export function poo() {
  let getCraPaths: typeof _paths = require('./cra-scripts-paths').default;

  const reactScriptsPath = `${sep}node_modules${sep}react-scripts${sep}`;
  const reactDevUtilsPath = `${sep}node_modules${sep}react-dev-utils${sep}`;
  const buildScriptsPath = Path.join('node_modules', 'react-scripts', 'scripts', 'build.js');

  // Disable @pmmmwh/react-refresh-webpack-plugin, since it excludes our node_modules
  // from HMR
  process.env.FAST_REFRESH = 'false';

  const superReq = Module.prototype.require;
  // TODO: Should use require-injector new version
  Module.prototype.require = function(this: Module, target: string) {
    if (this.filename.indexOf(reactScriptsPath) >= 0) {
      if (this.filename.endsWith(buildScriptsPath)) {
        if (target === 'fs-extra' && getCmdOptions().buildType === 'lib') {
          // Disable copy public path
          return Object.assign({}, fs, {
            copySync(src: string) {
              console.log('[prepload] skip copy ', src);
            }
          });
        }
        if (target === 'webpack') {
          return hackWebpack4Compiler();
        }
      }
      switch (target) {
        case '../config/webpack.config':
          target = require.resolve('./webpack.config');
          // console.log(this.filename, target);
          break;

        case '../config/webpackDevServer.config':
          target = require.resolve('./webpack.devserver.config');
          break;

        default:
          if (target.endsWith('/clearConsole')) {
            return clearConsole;
          } else if (target.endsWith('/paths') &&
            /[\\/]react-scripts[\\/]config[\\/]paths$/.test(
              resolve(dirname(this.filename), target))) {
            // console.log(`[preload] source: ${this.filename},\n  target: react-scripts/config/paths`);
            return getCraPaths();
          }
      }
    } else if (this.filename.indexOf(reactDevUtilsPath) >= 0) {
      if (target.endsWith('/clearConsole')) {
        return clearConsole;
      }
    }
    return superReq.call(this, target);
  } as any;
}



function clearConsole() {
  // origClearConsole();
  drawPuppy('pooed on create-react-app');
}

// require(Path.resolve('node_modules/react-scripts/bin/react-scripts.js'));
