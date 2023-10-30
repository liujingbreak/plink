/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Path from 'path';
import _webpack from 'webpack';
import {log4File} from '@wfh/plink';
import chalk from 'chalk';
import {getCmdOptions} from './utils';
// Don't install @types/react-dev-utils, it breaks latest html-webpack-plugin's own type definitions 
const _formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const log = log4File(__filename);

/**
 * CRA only has "build" command which runs Webpack compiler.run() function, but we want to
 * support "watch" function, so hack Webpack's compiler.run() function by replacing it with
 * compiler.watch() function
 */
export function hackWebpack4Compiler() {
  const webpack: typeof _webpack = require(Path.resolve('node_modules/webpack'));
  if (getCmdOptions().cmd !== 'cra-start' && getCmdOptions().watch) {
    const hacked = function() {
      const formatWebpackMessages: typeof _formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
      // eslint-disable-next-line prefer-rest-params
      const compiler: ReturnType<typeof webpack> = webpack.apply(global, arguments as any);
      // const origRun = compiler.run;
      compiler.run = (handler) => {
        return compiler.watch({}, (err, stats) => {
          let messages: ReturnType<typeof _formatWebpackMessages>;
          if (err) {
            if ((err as any)?.details)
              log.error('Webpack error "details":' + (err as any).details);
            let errMessage = err.message;

            // Add additional information for postcss errors
            if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
              errMessage +=
                '\nCompileError: Begins at CSS selector ' +
                (err as any).postcssNode.selector;
            }
            messages = formatWebpackMessages({
              errors: [errMessage],
              warnings: []
            } as any);
          } else if (stats) {
            messages = formatWebpackMessages(
              stats.toJson({all: false, warnings: true, errors: true})
            );
          }
          if (messages.errors.length) {
            // Only keep the first error. Others are often indicative
            // of the same problem, but confuse the reader with noise.
            if (messages.errors.length > 1) {
              messages.errors.length = 1;
            }
            console.error(chalk.red(messages.errors.join('\n\n')));
            if (messages.warnings.length) {
              // eslint-disable-next-line no-console
              console.log(
                chalk.yellow(
                  '\nTreating warnings as errors because process.env.CI = true.\n' +
                    'Most CI servers set it automatically.\n'
                )
              );
            }
          }
        });
      };
      return compiler;
    };
    return Object.assign(hacked, webpack);
  } else {
    // create-react-app doesn't print Webpack's detail error, have to hack it
    // see https://webpack.js.org/api/node/#error-handling
    const hacked = function(...args: [any, ...any[]]) {
      const compiler = webpack(...args);
      const compileRun = compiler.run;
      compiler.run = (cb: (err: any, stats: any) => void) => {
        return compileRun.call(compiler, (err: unknown, stats: unknown) => {
          if ((err as any)?.details) {
            log.error('Webpack error "details":' + (err as any).details);
          }
          cb(err, stats);
        });
      };
      return compiler;
    };
    return Object.assign(hacked, webpack);
  }

}
