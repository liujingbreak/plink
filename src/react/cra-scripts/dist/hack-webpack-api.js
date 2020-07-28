"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const utils_1 = require("./utils");
const path_1 = tslib_1.__importDefault(require("path"));
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
                        // tslint:disable-next-line: no-console
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvaGFjay13ZWJwYWNrLWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSwwREFBMEI7QUFFMUIsbUNBQXNDO0FBQ3RDLHdEQUF3QjtBQUV4QixTQUFnQixvQkFBb0I7SUFDbEMsTUFBTSxPQUFPLEdBQW9CLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQUMvRSxJQUFJLHFCQUFhLEVBQUUsQ0FBQyxTQUFTLEtBQUssS0FBSyxJQUFJLENBQUMscUJBQWEsRUFBRSxDQUFDLEtBQUssRUFBRTtRQUNqRSxPQUFPLE9BQU8sQ0FBQztLQUNoQjtJQUNELE1BQU0sTUFBTSxHQUFHO1FBQ2IsTUFBTSxxQkFBcUIsR0FBa0MsT0FBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7UUFDOUcsTUFBTSxRQUFRLEdBQStCLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlFLGdDQUFnQztRQUNoQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDekIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDdkMsSUFBSSxRQUFtRCxDQUFDO2dCQUN4RCxJQUFJLEdBQUcsRUFBRTtvQkFDUCxJQUFJLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDO29CQUU3QixnREFBZ0Q7b0JBQ2hELElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsRUFBRTt3QkFDNUQsVUFBVTs0QkFDUix5Q0FBeUM7Z0NBQ3hDLEdBQVcsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO3FCQUNyQztvQkFDRCxRQUFRLEdBQUcscUJBQXFCLENBQUM7d0JBQy9CLE1BQU0sRUFBRSxDQUFDLFVBQVUsQ0FBQzt3QkFDcEIsUUFBUSxFQUFFLEVBQUU7cUJBQ04sQ0FBQyxDQUFDO2lCQUNYO3FCQUFNO29CQUNMLFFBQVEsR0FBRyxxQkFBcUIsQ0FDOUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDM0QsQ0FBQztpQkFDSDtnQkFDRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO29CQUMxQix5REFBeUQ7b0JBQ3pELDBEQUEwRDtvQkFDMUQsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7d0JBQzlCLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztxQkFDNUI7b0JBQ0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkQsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTt3QkFDNUIsdUNBQXVDO3dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUNULGVBQUssQ0FBQyxNQUFNLENBQ1YsZ0VBQWdFOzRCQUM5RCx5Q0FBeUMsQ0FDNUMsQ0FDRixDQUFDO3FCQUNIO2lCQUNGO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7UUFDRixPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDLENBQUM7SUFDRixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFwREQsb0RBb0RDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC9oYWNrLXdlYnBhY2stYXBpLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF93ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBfZm9ybWF0V2VicGFja01lc3NhZ2VzID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL2Zvcm1hdFdlYnBhY2tNZXNzYWdlcycpO1xuaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZnVuY3Rpb24gaGFja1dlYnBhY2s0Q29tcGlsZXIoKSB7XG4gIGNvbnN0IHdlYnBhY2s6IHR5cGVvZiBfd2VicGFjayA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvd2VicGFjaycpKTtcbiAgaWYgKGdldENtZE9wdGlvbnMoKS5idWlsZFR5cGUgIT09ICdsaWInIHx8ICFnZXRDbWRPcHRpb25zKCkud2F0Y2gpIHtcbiAgICByZXR1cm4gd2VicGFjaztcbiAgfVxuICBjb25zdCBoYWNrZWQgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBmb3JtYXRXZWJwYWNrTWVzc2FnZXM6IHR5cGVvZiBfZm9ybWF0V2VicGFja01lc3NhZ2VzID0gcmVxdWlyZSgncmVhY3QtZGV2LXV0aWxzL2Zvcm1hdFdlYnBhY2tNZXNzYWdlcycpO1xuICAgIGNvbnN0IGNvbXBpbGVyOiBSZXR1cm5UeXBlPHR5cGVvZiB3ZWJwYWNrPiA9IHdlYnBhY2suYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpO1xuICAgIC8vIGNvbnN0IG9yaWdSdW4gPSBjb21waWxlci5ydW47XG4gICAgY29tcGlsZXIucnVuID0gKGhhbmRsZXIpID0+IHtcbiAgICAgIHJldHVybiBjb21waWxlci53YXRjaCh7fSwgKGVyciwgc3RhdHMpID0+IHtcbiAgICAgICAgbGV0IG1lc3NhZ2VzOiBSZXR1cm5UeXBlPHR5cGVvZiBfZm9ybWF0V2VicGFja01lc3NhZ2VzPjtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIGxldCBlcnJNZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG5cbiAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBpbmZvcm1hdGlvbiBmb3IgcG9zdGNzcyBlcnJvcnNcbiAgICAgICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGVyciwgJ3Bvc3Rjc3NOb2RlJykpIHtcbiAgICAgICAgICAgIGVyck1lc3NhZ2UgKz1cbiAgICAgICAgICAgICAgJ1xcbkNvbXBpbGVFcnJvcjogQmVnaW5zIGF0IENTUyBzZWxlY3RvciAnICtcbiAgICAgICAgICAgICAgKGVyciBhcyBhbnkpLnBvc3Rjc3NOb2RlLnNlbGVjdG9yO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtZXNzYWdlcyA9IGZvcm1hdFdlYnBhY2tNZXNzYWdlcyh7XG4gICAgICAgICAgICBlcnJvcnM6IFtlcnJNZXNzYWdlXSxcbiAgICAgICAgICAgIHdhcm5pbmdzOiBbXVxuICAgICAgICAgIH0gYXMgYW55KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBtZXNzYWdlcyA9IGZvcm1hdFdlYnBhY2tNZXNzYWdlcyhcbiAgICAgICAgICAgIHN0YXRzLnRvSnNvbih7IGFsbDogZmFsc2UsIHdhcm5pbmdzOiB0cnVlLCBlcnJvcnM6IHRydWUgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcnMubGVuZ3RoKSB7XG4gICAgICAgICAgLy8gT25seSBrZWVwIHRoZSBmaXJzdCBlcnJvci4gT3RoZXJzIGFyZSBvZnRlbiBpbmRpY2F0aXZlXG4gICAgICAgICAgLy8gb2YgdGhlIHNhbWUgcHJvYmxlbSwgYnV0IGNvbmZ1c2UgdGhlIHJlYWRlciB3aXRoIG5vaXNlLlxuICAgICAgICAgIGlmIChtZXNzYWdlcy5lcnJvcnMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgbWVzc2FnZXMuZXJyb3JzLmxlbmd0aCA9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKG1lc3NhZ2VzLmVycm9ycy5qb2luKCdcXG5cXG4nKSkpO1xuICAgICAgICAgIGlmIChtZXNzYWdlcy53YXJuaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgIGNoYWxrLnllbGxvdyhcbiAgICAgICAgICAgICAgICAnXFxuVHJlYXRpbmcgd2FybmluZ3MgYXMgZXJyb3JzIGJlY2F1c2UgcHJvY2Vzcy5lbnYuQ0kgPSB0cnVlLlxcbicgK1xuICAgICAgICAgICAgICAgICAgJ01vc3QgQ0kgc2VydmVycyBzZXQgaXQgYXV0b21hdGljYWxseS5cXG4nXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBjb21waWxlcjtcbiAgfTtcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oaGFja2VkLCB3ZWJwYWNrKTtcbn1cbiJdfQ==
