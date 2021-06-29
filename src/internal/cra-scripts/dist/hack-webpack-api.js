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
    if (utils_1.getCmdOptions().buildType !== 'lib' || !utils_1.getCmdOptions().watch) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFjay13ZWJwYWNrLWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhhY2std2VicGFjay1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHFHQUFxRztBQUNyRyxNQUFNLHNCQUFzQixHQUFHLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ2hGLG1DQUFzQztBQUN0QyxnREFBd0I7QUFFeEI7Ozs7R0FJRztBQUNILFNBQWdCLG9CQUFvQjtJQUNsQyxNQUFNLE9BQU8sR0FBb0IsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO0lBQy9FLElBQUkscUJBQWEsRUFBRSxDQUFDLFNBQVMsS0FBSyxLQUFLLElBQUksQ0FBQyxxQkFBYSxFQUFFLENBQUMsS0FBSyxFQUFFO1FBQ2pFLE9BQU8sT0FBTyxDQUFDO0tBQ2hCO0lBQ0QsTUFBTSxNQUFNLEdBQUc7UUFDYixNQUFNLHFCQUFxQixHQUFrQyxPQUFPLENBQUMsdUNBQXVDLENBQUMsQ0FBQztRQUM5RyxNQUFNLFFBQVEsR0FBK0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUUsZ0NBQWdDO1FBQ2hDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN6QixPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUN2QyxJQUFJLFFBQW1ELENBQUM7Z0JBQ3hELElBQUksR0FBRyxFQUFFO29CQUNQLElBQUksVUFBVSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUM7b0JBRTdCLGdEQUFnRDtvQkFDaEQsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxFQUFFO3dCQUM1RCxVQUFVOzRCQUNSLHlDQUF5QztnQ0FDeEMsR0FBVyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUM7cUJBQ3JDO29CQUNELFFBQVEsR0FBRyxxQkFBcUIsQ0FBQzt3QkFDL0IsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO3dCQUNwQixRQUFRLEVBQUUsRUFBRTtxQkFDTixDQUFDLENBQUM7aUJBQ1g7cUJBQU07b0JBQ0wsUUFBUSxHQUFHLHFCQUFxQixDQUM5QixLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUMzRCxDQUFDO2lCQUNIO2dCQUNELElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7b0JBQzFCLHlEQUF5RDtvQkFDekQsMERBQTBEO29CQUMxRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTt3QkFDOUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3FCQUM1QjtvQkFDRCxPQUFPLENBQUMsS0FBSyxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2RCxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO3dCQUM1QixzQ0FBc0M7d0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQ1QsZUFBSyxDQUFDLE1BQU0sQ0FDVixnRUFBZ0U7NEJBQzlELHlDQUF5QyxDQUM1QyxDQUNGLENBQUM7cUJBQ0g7aUJBQ0Y7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUNGLE9BQU8sUUFBUSxDQUFDO0lBQ2xCLENBQUMsQ0FBQztJQUNGLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQXBERCxvREFvREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgX3dlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gRG9uJ3QgaW5zdGFsbCBAdHlwZXMvcmVhY3QtZGV2LXV0aWxzLCBpdCBicmVha3MgbGF0ZXN0IGh0bWwtd2VicGFjay1wbHVnaW4ncyBvd24gdHlwZSBkZWZpbml0aW9ucyBcbmNvbnN0IF9mb3JtYXRXZWJwYWNrTWVzc2FnZXMgPSByZXF1aXJlKCdyZWFjdC1kZXYtdXRpbHMvZm9ybWF0V2VicGFja01lc3NhZ2VzJyk7XG5pbXBvcnQge2dldENtZE9wdGlvbnN9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbi8qKlxuICogQ1JBIG9ubHkgaGFzIFwiYnVpbGRcIiBjb21tYW5kIHdoaWNoIHJ1bnMgV2VicGFjayBjb21waWxlci5ydW4oKSBmdW5jdGlvbiwgYnV0IHdlIHdhbnQgdG9cbiAqIHN1cHBvcnQgXCJ3YXRjaFwiIGZ1bmN0aW9uLCBzbyBoYWNrIFdlYnBhY2sncyBjb21waWxlci5ydW4oKSBmdW5jdGlvbiBieSByZXBsYWNpbmcgaXQgd2l0aFxuICogY29tcGlsZXIud2F0Y2goKSBmdW5jdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFja1dlYnBhY2s0Q29tcGlsZXIoKSB7XG4gIGNvbnN0IHdlYnBhY2s6IHR5cGVvZiBfd2VicGFjayA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvd2VicGFjaycpKTtcbiAgaWYgKGdldENtZE9wdGlvbnMoKS5idWlsZFR5cGUgIT09ICdsaWInIHx8ICFnZXRDbWRPcHRpb25zKCkud2F0Y2gpIHtcbiAgICByZXR1cm4gd2VicGFjaztcbiAgfVxuICBjb25zdCBoYWNrZWQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmb3JtYXRXZWJwYWNrTWVzc2FnZXM6IHR5cGVvZiBfZm9ybWF0V2VicGFja01lc3NhZ2VzID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL2Zvcm1hdFdlYnBhY2tNZXNzYWdlcycpO1xuICAgIGNvbnN0IGNvbXBpbGVyOiBSZXR1cm5UeXBlPHR5cGVvZiB3ZWJwYWNrPiA9IHdlYnBhY2suYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpO1xuICAgIC8vIGNvbnN0IG9yaWdSdW4gPSBjb21waWxlci5ydW47XG4gICAgY29tcGlsZXIucnVuID0gKGhhbmRsZXIpID0+IHtcbiAgICAgIHJldHVybiBjb21waWxlci53YXRjaCh7fSwgKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgbGV0IG1lc3NhZ2VzOiBSZXR1cm5UeXBlPHR5cGVvZiBfZm9ybWF0V2VicGFja01lc3NhZ2VzPjtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxldCBlcnJNZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG5cbiAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBmb3IgcG9zdGNzcyBlcnJvcnNcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGVyciwgJ3Bvc3Rjc3NOb2RlJykpIHtcbiAgICAgICAgICAgIGVyck1lc3NhZ2UgKz1cbiAgICAgICAgICAgICAgJ1xcbkNvbXBpbGVFcnJvcjogQmVnaW5zIGF0IENTUyBzZWxlY3RvciAnICtcbiAgICAgICAgICAgICAgKGVyciBhcyBhbnkpLnBvc3Rjc3NOb2RlLnNlbGVjdG9yO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtZXNzYWdlcyA9IGZvcm1hdFdlYnBhY2tNZXNzYWdlcyh7XG4gICAgICAgICAgICBlcnJvcnM6IFtlcnJNZXNzYWdlXSxcbiAgICAgICAgICAgIHdhcm5pbmdzOiBbXVxuICAgICAgICAgIH0gYXMgYW55KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZXNzYWdlcyA9IGZvcm1hdFdlYnBhY2tNZXNzYWdlcyhcbiAgICAgICAgICAgIHN0YXRzLnRvSnNvbih7IGFsbDogZmFsc2UsIHdhcm5pbmdzOiB0cnVlLCBlcnJvcnM6IHRydWUgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gT25seSBrZWVwIHRoZSBmaXJzdCBlcnJvci4gT3RoZXJzIGFyZSBvZnRlbiBpbmRpY2F0aXZlXG4gICAgICAgICAgLy8gb2YgdGhlIHNhbWUgcHJvYmxlbSwgYnV0IGNvbmZ1c2UgdGhlIHJlYWRlciB3aXRoIG5vaXNlLlxuICAgICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgbWVzc2FnZXMuZXJyb3JzLmxlbmd0aCA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKG1lc3NhZ2VzLmVycm9ycy5qb2luKCdcXG5cXG4nKSkpO1xuICAgICAgICAgIGlmIChtZXNzYWdlcy53YXJuaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgY2hhbGsueWVsbG93KFxuICAgICAgICAgICAgICAgICdcXG5UcmVhdGluZyB3YXJuaW5ncyBhcyBlcnJvcnMgYmVjYXVzZSBwcm9jZXNzLmVudi5DSSA9IHRydWUuXFxuJyArXG4gICAgICAgICAgICAgICAgICAnTW9zdCBDSSBzZXJ2ZXJzIHNldCBpdCBhdXRvbWF0aWNhbGx5LlxcbidcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIGNvbXBpbGVyO1xuICB9O1xuICByZXR1cm4gT2JqZWN0LmFzc2lnbihoYWNrZWQsIHdlYnBhY2spO1xufVxuIl19