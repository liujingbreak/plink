// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
import {drawPuppy, saveCmdArgToEnv} from './utils';
import _getPaths from './cra-scripts-paths';

drawPuppy('Loading my poo...');
require('source-map-support/register');

import Module from 'module';
import {sep, resolve, dirname} from 'path';

poo();

saveCmdArgToEnv();

function poo() {
  require('dr-comp-package/bin/nodePath').setContextPath(process.cwd());
  const getPaths: typeof _getPaths = require('./cra-scripts-paths').default;

  const reactScriptsPath = `${sep}node_modules${sep}react-scripts${sep}`;
  const reactDevUtilsPath = `${sep}node_modules${sep}react-dev-utils${sep}`;

  const superReq = Module.prototype.require;

  // TODO: Should use require-injector new version
  Module.prototype.require = function(this: Module, target) {
    if (this.filename.indexOf(reactScriptsPath) >= 0) {
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
            resolve(dirname(this.filename), target).endsWith('/react-scripts/config/paths')) {
            console.log(`[preload] source: ${this.filename},\n  target: react-scripts/config/paths`);
            return getPaths();
          }
      }
    } else if (this.filename.indexOf(reactDevUtilsPath) >= 0) {
      if (target.endsWith('/clearConsole')) {
        return clearConsole;
      }
    }
    return superReq.call(this, target);
  };
}

function clearConsole() {
  // origClearConsole();
  drawPuppy('pooed on create-react-app');
}
