import _webpack from 'webpack';
import chalk from 'chalk';
// Don't install @types/react-dev-utils, it breaks latest html-webpack-plugin's own type definitions 
const _formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
import {getCmdOptions} from './utils';
import Path from 'path';

/**
 * CRA only has "build" command which runs Webpack compiler.run() function, but we want to
 * support "watch" function, so hack Webpack's compiler.run() function by replacing it with
 * compiler.watch() function
 */
export function hackWebpack4Compiler() {
  const webpack: typeof _webpack = require(Path.resolve('node_modules/webpack'));
  if (getCmdOptions().buildType !== 'lib' || !getCmdOptions().watch) {
    return webpack;
  }
  const hacked = function() {
    const formatWebpackMessages: typeof _formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
    const compiler: ReturnType<typeof webpack> = webpack.apply(global, arguments);
    // const origRun = compiler.run;
    compiler.run = (handler) => {
      return compiler.watch({}, (err, stats) => {
        let messages: ReturnType<typeof _formatWebpackMessages>;
        if (err) {
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
        } else {
          messages = formatWebpackMessages(
            stats.toJson({ all: false, warnings: true, errors: true })
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
}
