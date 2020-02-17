"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const paths = require('react-scripts/config/paths');
function factory() {
    let changedPaths;
    return () => {
        if (changedPaths == null) {
            changedPaths = paths;
            const cmdOption = utils_1.getCmdOptions();
            const { dir, packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
            // console.log('[debug] ', cmdOption);
            if (cmdOption.buildType === 'lib') {
                changedPaths.appBuild = path_1.default.resolve(dir, 'build');
                changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-build-entry', 'public_api.ts'));
            }
            else if (cmdOption.buildType === 'app') {
                // const {dir} = findPackage(cmdOption.buildTarget);
                // changedPaths.appBuild = Path.resolve(dir, 'build');
                // changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-serve-entry', 'serve_index.ts'));
            }
            // tslint:disable-next-line: no-console
            console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
        }
        if (changedPaths == null) {
            changedPaths = paths;
        }
        // console.log(changedPaths);
        return changedPaths;
    };
}
exports.default = factory;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvY3JhLXNjcmlwdHMtcGF0aHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXNDO0FBQ3RDLCtEQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsNERBQXVCO0FBQ3ZCLE1BQU0sS0FBSyxHQUFvQixPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQXlCckUsU0FBd0IsT0FBTztJQUM3QixJQUFJLFlBQXlDLENBQUM7SUFDOUMsT0FBTyxHQUFvQixFQUFFO1FBQzNCLElBQUksWUFBWSxJQUFJLElBQUksRUFBRTtZQUN4QixZQUFZLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLE1BQU0sU0FBUyxHQUFHLHFCQUFhLEVBQUUsQ0FBQztZQUNsQyxNQUFNLEVBQUMsR0FBRyxFQUFFLFdBQVcsRUFBQyxHQUFHLGlDQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzlELHNDQUFzQztZQUN0QyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEtBQUssS0FBSyxFQUFFO2dCQUNqQyxZQUFZLENBQUMsUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNuRCxZQUFZLENBQUMsVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGdCQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO2FBQ3hHO2lCQUFNLElBQUksU0FBUyxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUU7Z0JBQ3hDLG9EQUFvRDtnQkFDcEQsc0RBQXNEO2dCQUN0RCwyR0FBMkc7YUFDNUc7WUFDRCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvREFBb0QsRUFBRSxZQUFZLENBQUMsQ0FBQztTQUNqRjtRQUVELElBQUksWUFBWSxJQUFJLElBQUksRUFBRTtZQUN4QixZQUFZLEdBQUcsS0FBSyxDQUFDO1NBQ3RCO1FBQ0QsNkJBQTZCO1FBQzdCLE9BQU8sWUFBWSxDQUFDO0lBQ3RCLENBQUMsQ0FBQztBQUNKLENBQUM7QUExQkQsMEJBMEJDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvZGlzdC9jcmEtc2NyaXB0cy1wYXRocy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Z2V0Q21kT3B0aW9uc30gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlfSBmcm9tICcuL2J1aWxkLXRhcmdldC1oZWxwZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuY29uc3QgcGF0aHM6IENyYVNjcmlwdHNQYXRocyA9IHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvY29uZmlnL3BhdGhzJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JhU2NyaXB0c1BhdGhzIHtcbiAgZG90ZW52OiBzdHJpbmc7XG4gIGFwcFBhdGg6IHN0cmluZztcbiAgYXBwQnVpbGQ6IHN0cmluZztcbiAgYXBwUHVibGljOiBzdHJpbmc7XG4gIGFwcEh0bWw6IHN0cmluZztcbiAgYXBwSW5kZXhKczogc3RyaW5nO1xuICBhcHBQYWNrYWdlSnNvbjogc3RyaW5nO1xuICBhcHBTcmM6IHN0cmluZztcbiAgYXBwVHNDb25maWc6IHN0cmluZztcbiAgYXBwSnNDb25maWc6IHN0cmluZztcbiAgeWFybkxvY2tGaWxlOiBzdHJpbmc7XG4gIHRlc3RzU2V0dXA6IHN0cmluZztcbiAgcHJveHlTZXR1cDogc3RyaW5nO1xuICBhcHBOb2RlTW9kdWxlczogc3RyaW5nO1xuICBwdWJsaWNVcmxPclBhdGg6IHN0cmluZztcbiAgLy8gVGhlc2UgcHJvcGVydGllcyBvbmx5IGV4aXN0IGJlZm9yZSBlamVjdGluZzpcbiAgb3duUGF0aDogc3RyaW5nO1xuICBvd25Ob2RlTW9kdWxlczogc3RyaW5nOyAvLyBUaGlzIGlzIGVtcHR5IG9uIG5wbSAzXG4gIGFwcFR5cGVEZWNsYXJhdGlvbnM6IHN0cmluZztcbiAgb3duVHlwZURlY2xhcmF0aW9uczogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmYWN0b3J5KCkge1xuICBsZXQgY2hhbmdlZFBhdGhzOiBDcmFTY3JpcHRzUGF0aHMgfCB1bmRlZmluZWQ7XG4gIHJldHVybiAoKTogQ3JhU2NyaXB0c1BhdGhzID0+IHtcbiAgICBpZiAoY2hhbmdlZFBhdGhzID09IG51bGwpIHtcbiAgICAgIGNoYW5nZWRQYXRocyA9IHBhdGhzO1xuICAgICAgY29uc3QgY21kT3B0aW9uID0gZ2V0Q21kT3B0aW9ucygpO1xuICAgICAgY29uc3Qge2RpciwgcGFja2FnZUpzb259ID0gZmluZFBhY2thZ2UoY21kT3B0aW9uLmJ1aWxkVGFyZ2V0KTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdbZGVidWddICcsIGNtZE9wdGlvbik7XG4gICAgICBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2xpYicpIHtcbiAgICAgICAgY2hhbmdlZFBhdGhzLmFwcEJ1aWxkID0gUGF0aC5yZXNvbHZlKGRpciwgJ2J1aWxkJyk7XG4gICAgICAgIGNoYW5nZWRQYXRocy5hcHBJbmRleEpzID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGFja2FnZUpzb24sICdkci5jcmEtYnVpbGQtZW50cnknLCAncHVibGljX2FwaS50cycpKTtcbiAgICAgIH0gZWxzZSBpZiAoY21kT3B0aW9uLmJ1aWxkVHlwZSA9PT0gJ2FwcCcpIHtcbiAgICAgICAgLy8gY29uc3Qge2Rpcn0gPSBmaW5kUGFja2FnZShjbWRPcHRpb24uYnVpbGRUYXJnZXQpO1xuICAgICAgICAvLyBjaGFuZ2VkUGF0aHMuYXBwQnVpbGQgPSBQYXRoLnJlc29sdmUoZGlyLCAnYnVpbGQnKTtcbiAgICAgICAgLy8gY2hhbmdlZFBhdGhzLmFwcEluZGV4SnMgPSBQYXRoLnJlc29sdmUoZGlyLCBfLmdldChwYWNrYWdlSnNvbiwgJ2RyLmNyYS1zZXJ2ZS1lbnRyeScsICdzZXJ2ZV9pbmRleC50cycpKTtcbiAgICAgIH1cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ1tjcmEtc2NyaXB0cy1wYXRoc10gY2hhbmdlZCByZWFjdC1zY3JpcHRzIHBhdGhzOlxcbicsIGNoYW5nZWRQYXRocyk7XG4gICAgfVxuXG4gICAgaWYgKGNoYW5nZWRQYXRocyA9PSBudWxsKSB7XG4gICAgICBjaGFuZ2VkUGF0aHMgPSBwYXRocztcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coY2hhbmdlZFBhdGhzKTtcbiAgICByZXR1cm4gY2hhbmdlZFBhdGhzO1xuICB9O1xufVxuIl19
