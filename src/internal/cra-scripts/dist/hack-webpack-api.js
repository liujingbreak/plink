"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hackWebpack4Compiler = void 0;
const chalk_1 = __importDefault(require("chalk"));
// Don't install @types/react-dev-utils, it breaks latest html-webpack-plugin's own type definitions 
const _formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');
const utils_1 = require("./utils");
const path_1 = __importDefault(require("path"));
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
                else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay13ZWJwYWNrLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhhY2std2VicGFjay1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHFHQUFxRztBQUNyRyxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ2hGLG1DQUFzQztBQUN0QyxnREFBd0I7QUFFeEI7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQjtJQUNsQyxNQUFNLE9BQU8sR0FBb0IsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0lBQy9FLElBQUksSUFBQSxxQkFBYSxHQUFFLENBQUMsU0FBUyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUEscUJBQWEsR0FBRSxDQUFDLEtBQUssRUFBRTtRQUNqRSxPQUFPLE9BQU8sQ0FBQztLQUNoQjtJQUNELE1BQU0sTUFBTSxHQUFHO1FBQ2IsTUFBTSxxQkFBcUIsR0FBa0MsT0FBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7UUFDOUcsTUFBTSxRQUFRLEdBQStCLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLGdDQUFnQztRQUNoQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDekIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDdkMsSUFBSSxRQUFtRCxDQUFDO2dCQUN4RCxJQUFJLEdBQUcsRUFBRTtvQkFDUCxJQUFJLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO29CQUU3QixnREFBZ0Q7b0JBQ2hELElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsRUFBRTt3QkFDNUQsVUFBVTs0QkFDUix5Q0FBeUM7Z0NBQ3hDLEdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO3FCQUNyQztvQkFDRCxRQUFRLEdBQUcscUJBQXFCLENBQUM7d0JBQy9CLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQzt3QkFDcEIsUUFBUSxFQUFFLEVBQUU7cUJBQ04sQ0FBQyxDQUFDO2lCQUNYO3FCQUFNO29CQUNMLFFBQVEsR0FBRyxxQkFBcUIsQ0FDOUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDM0QsQ0FBQztpQkFDSDtnQkFDRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO29CQUMxQix5REFBeUQ7b0JBQ3pELDBEQUEwRDtvQkFDMUQsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQzlCLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztxQkFDNUI7b0JBQ0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTt3QkFDNUIsc0NBQXNDO3dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUNULGVBQUssQ0FBQyxNQUFNLENBQ1YsZ0VBQWdFOzRCQUM5RCx5Q0FBeUMsQ0FDNUMsQ0FDRixDQUFDO3FCQUNIO2lCQUNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7UUFDRixPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDLENBQUM7SUFDRixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFwREQsb0RBb0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF93ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIERvbid0IGluc3RhbGwgQHR5cGVzL3JlYWN0LWRldi11dGlscywgaXQgYnJlYWtzIGxhdGVzdCBodG1sLXdlYnBhY2stcGx1Z2luJ3Mgb3duIHR5cGUgZGVmaW5pdGlvbnMgXG5jb25zdCBfZm9ybWF0V2VicGFja01lc3NhZ2VzID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL2Zvcm1hdFdlYnBhY2tNZXNzYWdlcycpO1xuaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG4vKipcbiAqIENSQSBvbmx5IGhhcyBcImJ1aWxkXCIgY29tbWFuZCB3aGljaCBydW5zIFdlYnBhY2sgY29tcGlsZXIucnVuKCkgZnVuY3Rpb24sIGJ1dCB3ZSB3YW50IHRvXG4gKiBzdXBwb3J0IFwid2F0Y2hcIiBmdW5jdGlvbiwgc28gaGFjayBXZWJwYWNrJ3MgY29tcGlsZXIucnVuKCkgZnVuY3Rpb24gYnkgcmVwbGFjaW5nIGl0IHdpdGhcbiAqIGNvbXBpbGVyLndhdGNoKCkgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhhY2tXZWJwYWNrNENvbXBpbGVyKCkge1xuICBjb25zdCB3ZWJwYWNrOiB0eXBlb2YgX3dlYnBhY2sgPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL3dlYnBhY2snKSk7XG4gIGlmIChnZXRDbWRPcHRpb25zKCkuYnVpbGRUeXBlICE9PSAnbGliJyB8fCAhZ2V0Q21kT3B0aW9ucygpLndhdGNoKSB7XG4gICAgcmV0dXJuIHdlYnBhY2s7XG4gIH1cbiAgY29uc3QgaGFja2VkID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZm9ybWF0V2VicGFja01lc3NhZ2VzOiB0eXBlb2YgX2Zvcm1hdFdlYnBhY2tNZXNzYWdlcyA9IHJlcXVpcmUoJ3JlYWN0LWRldi11dGlscy9mb3JtYXRXZWJwYWNrTWVzc2FnZXMnKTtcbiAgICBjb25zdCBjb21waWxlcjogUmV0dXJuVHlwZTx0eXBlb2Ygd2VicGFjaz4gPSB3ZWJwYWNrLmFwcGx5KGdsb2JhbCwgYXJndW1lbnRzKTtcbiAgICAvLyBjb25zdCBvcmlnUnVuID0gY29tcGlsZXIucnVuO1xuICAgIGNvbXBpbGVyLnJ1biA9IChoYW5kbGVyKSA9PiB7XG4gICAgICByZXR1cm4gY29tcGlsZXIud2F0Y2goe30sIChlcnIsIHN0YXRzKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlczogUmV0dXJuVHlwZTx0eXBlb2YgX2Zvcm1hdFdlYnBhY2tNZXNzYWdlcz47XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICBsZXQgZXJyTWVzc2FnZSA9IGVyci5tZXNzYWdlO1xuXG4gICAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gZm9yIHBvc3Rjc3MgZXJyb3JzXG4gICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChlcnIsICdwb3N0Y3NzTm9kZScpKSB7XG4gICAgICAgICAgICBlcnJNZXNzYWdlICs9XG4gICAgICAgICAgICAgICdcXG5Db21waWxlRXJyb3I6IEJlZ2lucyBhdCBDU1Mgc2VsZWN0b3IgJyArXG4gICAgICAgICAgICAgIChlcnIgYXMgYW55KS5wb3N0Y3NzTm9kZS5zZWxlY3RvcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWVzc2FnZXMgPSBmb3JtYXRXZWJwYWNrTWVzc2FnZXMoe1xuICAgICAgICAgICAgZXJyb3JzOiBbZXJyTWVzc2FnZV0sXG4gICAgICAgICAgICB3YXJuaW5nczogW11cbiAgICAgICAgICB9IGFzIGFueSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWVzc2FnZXMgPSBmb3JtYXRXZWJwYWNrTWVzc2FnZXMoXG4gICAgICAgICAgICBzdGF0cy50b0pzb24oeyBhbGw6IGZhbHNlLCB3YXJuaW5nczogdHJ1ZSwgZXJyb3JzOiB0cnVlIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWVzc2FnZXMuZXJyb3JzLmxlbmd0aCkge1xuICAgICAgICAgIC8vIE9ubHkga2VlcCB0aGUgZmlyc3QgZXJyb3IuIE90aGVycyBhcmUgb2Z0ZW4gaW5kaWNhdGl2ZVxuICAgICAgICAgIC8vIG9mIHRoZSBzYW1lIHByb2JsZW0sIGJ1dCBjb25mdXNlIHRoZSByZWFkZXIgd2l0aCBub2lzZS5cbiAgICAgICAgICBpZiAobWVzc2FnZXMuZXJyb3JzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIG1lc3NhZ2VzLmVycm9ycy5sZW5ndGggPSAxO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmVycm9yKGNoYWxrLnJlZChtZXNzYWdlcy5lcnJvcnMuam9pbignXFxuXFxuJykpKTtcbiAgICAgICAgICBpZiAobWVzc2FnZXMud2FybmluZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGNoYWxrLnllbGxvdyhcbiAgICAgICAgICAgICAgICAnXFxuVHJlYXRpbmcgd2FybmluZ3MgYXMgZXJyb3JzIGJlY2F1c2UgcHJvY2Vzcy5lbnYuQ0kgPSB0cnVlLlxcbicgK1xuICAgICAgICAgICAgICAgICAgJ01vc3QgQ0kgc2VydmVycyBzZXQgaXQgYXV0b21hdGljYWxseS5cXG4nXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBjb21waWxlcjtcbiAgfTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oaGFja2VkLCB3ZWJwYWNrKTtcbn1cbiJdfQ==