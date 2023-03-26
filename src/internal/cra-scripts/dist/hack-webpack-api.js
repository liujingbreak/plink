"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hackWebpack4Compiler = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const utils_1 = require("./utils");
// Don't install @types/react-dev-utils, it breaks latest html-webpack-plugin's own type definitions 
const _formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
/**
 * CRA only has "build" command which runs Webpack compiler.run() function, but we want to
 * support "watch" function, so hack Webpack's compiler.run() function by replacing it with
 * compiler.watch() function
 */
function hackWebpack4Compiler() {
    const webpack = require(path_1.default.resolve('node_modules/webpack'));
    if ((0, utils_1.getCmdOptions)().buildType !== 'lib' || !(0, utils_1.getCmdOptions)().watch) {
        return webpack;
    }
    const hacked = function () {
        const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
        // eslint-disable-next-line prefer-rest-params
        const compiler = webpack.apply(global, arguments);
        // const origRun = compiler.run;
        compiler.run = (handler) => {
            return compiler.watch({}, (err, stats) => {
                let messages;
                if (err) {
                    let errMessage = err.message;
                    // Add additional information for postcss errors
                    if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
                        errMessage +=
                            '\nCompileError: Begins at CSS selector ' +
                                err.postcssNode.selector;
                    }
                    messages = formatWebpackMessages({
                        errors: [errMessage],
                        warnings: []
                    });
                }
                else if (stats) {
                    messages = formatWebpackMessages(stats.toJson({ all: false, warnings: true, errors: true }));
                }
                if (messages.errors.length) {
                    // Only keep the first error. Others are often indicative
                    // of the same problem, but confuse the reader with noise.
                    if (messages.errors.length > 1) {
                        messages.errors.length = 1;
                    }
                    console.error(chalk_1.default.red(messages.errors.join('\n\n')));
                    if (messages.warnings.length) {
                        // eslint-disable-next-line no-console
                        console.log(chalk_1.default.yellow('\nTreating warnings as errors because process.env.CI = true.\n' +
                            'Most CI servers set it automatically.\n'));
                    }
                }
            });
        };
        return compiler;
    };
    return Object.assign(hacked, webpack);
}
exports.hackWebpack4Compiler = hackWebpack4Compiler;
//# sourceMappingURL=hack-webpack-api.js.map