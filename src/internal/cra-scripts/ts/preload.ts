// tslint:disable: no-console
import {drawPuppy} from './utils';
// import Path from 'path';

drawPuppy('Loading my poo...');
require('source-map-support/register');

// import Injector from 'require-injector';
import Module from 'module';
import {sep} from 'path';
// let origClearConsole: () => void;
poo();

function poo() {

  require('dr-comp-package/bin/nodePath').setContextPath(process.cwd());

  // origClearConsole = require('react-dev-utils/clearConsole');

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
          }
          // else if (target.endsWith('/paths') && resolve(this, target).endsWith('/react-scripts/config/paths')) {
          //   if (craPaths == null) {
          //     const origExports = superReq.call(this, target);
          //     origExports.appSrc.push('');
          //   }
          //   return craPaths;
          // }
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
// function resolve(module: Module, target: string) {
//   return Path.resolve(Path.dirname(module.filename), target).replace(/\\/g, '/');
// }
