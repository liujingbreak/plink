"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const drcpWorkdir = findDrcpWorkdir();
function paths() {
    const cmdPublicUrl = utils_1.getCmdOptions().argv.get('publicUrl') || utils_1.getCmdOptions().argv.get('public-url');
    if (cmdPublicUrl) {
        process.env.PUBLIC_URL = cmdPublicUrl + '';
    }
    const paths = require(path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    const cmdOption = utils_1.getCmdOptions();
    const { dir, packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
    // console.log('[debug] ', cmdOption);
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-build-entry', 'public_api.ts'));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appBuild = path_1.default.resolve(drcpWorkdir, 'dist/static');
        // const {dir} = findPackage(cmdOption.buildTarget);
        // changedPaths.appBuild = Path.resolve(dir, 'build');
        // changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-serve-entry', 'serve_index.ts'));
    }
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    return changedPaths;
}
exports.default = paths;
function findDrcpWorkdir() {
    let dir = path_1.default.resolve();
    let parent = null;
    while (true) {
        const testDir = path_1.default.resolve(dir, 'node_modules', 'dr-comp-package');
        if (fs_1.default.existsSync(testDir)) {
            return dir;
        }
        parent = path_1.default.dirname(dir);
        if (parent === dir || parent == null)
            throw new Error('Can not find DRCP workspace');
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvY3JhLXNjcmlwdHMvdHMvY3JhLXNjcmlwdHMtcGF0aHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXNDO0FBQ3RDLCtEQUFrRDtBQUNsRCx3REFBd0I7QUFDeEIsNERBQXVCO0FBQ3ZCLG9EQUFvQjtBQXlCcEIsTUFBTSxXQUFXLEdBQUcsZUFBZSxFQUFFLENBQUM7QUFFdEMsU0FBd0IsS0FBSztJQUMzQixNQUFNLFlBQVksR0FBRyxxQkFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxxQkFBYSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNyRyxJQUFJLFlBQVksRUFBRTtRQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxZQUFZLEdBQUcsRUFBRSxDQUFDO0tBQzVDO0lBQ0QsTUFBTSxLQUFLLEdBQW9CLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxDQUFDLENBQUMsQ0FBQztJQUNoRyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUM7SUFDM0IsTUFBTSxTQUFTLEdBQUcscUJBQWEsRUFBRSxDQUFDO0lBQ2xDLE1BQU0sRUFBQyxHQUFHLEVBQUUsV0FBVyxFQUFDLEdBQUcsaUNBQVcsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUQsc0NBQXNDO0lBQ3RDLElBQUksU0FBUyxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUU7UUFDakMsWUFBWSxDQUFDLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRCxZQUFZLENBQUMsVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGdCQUFDLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxvQkFBb0IsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO0tBQ3hHO1NBQU0sSUFBSSxTQUFTLENBQUMsU0FBUyxLQUFLLEtBQUssRUFBRTtRQUN4QyxZQUFZLENBQUMsUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2pFLG9EQUFvRDtRQUNwRCxzREFBc0Q7UUFDdEQsMkdBQTJHO0tBQzVHO0lBQ0MsdUNBQXVDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbEYsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQXRCRCx3QkFzQkM7QUFFRCxTQUFTLGVBQWU7SUFDdEIsSUFBSSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ3pCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQztJQUNsQixPQUFPLElBQUksRUFBRTtRQUNYLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3JFLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMxQixPQUFPLEdBQUcsQ0FBQztTQUNaO1FBQ0QsTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0IsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJLE1BQU0sSUFBSSxJQUFJO1lBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztLQUNsRDtBQUNILENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9jcmEtc2NyaXB0cy9kaXN0L2NyYS1zY3JpcHRzLXBhdGhzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRDbWRPcHRpb25zfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7ZmluZFBhY2thZ2V9IGZyb20gJy4vYnVpbGQtdGFyZ2V0LWhlbHBlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENyYVNjcmlwdHNQYXRocyB7XG4gIGRvdGVudjogc3RyaW5nO1xuICBhcHBQYXRoOiBzdHJpbmc7XG4gIGFwcEJ1aWxkOiBzdHJpbmc7XG4gIGFwcFB1YmxpYzogc3RyaW5nO1xuICBhcHBIdG1sOiBzdHJpbmc7XG4gIGFwcEluZGV4SnM6IHN0cmluZztcbiAgYXBwUGFja2FnZUpzb246IHN0cmluZztcbiAgYXBwU3JjOiBzdHJpbmc7XG4gIGFwcFRzQ29uZmlnOiBzdHJpbmc7XG4gIGFwcEpzQ29uZmlnOiBzdHJpbmc7XG4gIHlhcm5Mb2NrRmlsZTogc3RyaW5nO1xuICB0ZXN0c1NldHVwOiBzdHJpbmc7XG4gIHByb3h5U2V0dXA6IHN0cmluZztcbiAgYXBwTm9kZU1vZHVsZXM6IHN0cmluZztcbiAgcHVibGljVXJsT3JQYXRoOiBzdHJpbmc7XG4gIC8vIFRoZXNlIHByb3BlcnRpZXMgb25seSBleGlzdCBiZWZvcmUgZWplY3Rpbmc6XG4gIG93blBhdGg6IHN0cmluZztcbiAgb3duTm9kZU1vZHVsZXM6IHN0cmluZzsgLy8gVGhpcyBpcyBlbXB0eSBvbiBucG0gM1xuICBhcHBUeXBlRGVjbGFyYXRpb25zOiBzdHJpbmc7XG4gIG93blR5cGVEZWNsYXJhdGlvbnM6IHN0cmluZztcbn1cblxuY29uc3QgZHJjcFdvcmtkaXIgPSBmaW5kRHJjcFdvcmtkaXIoKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGF0aHMoKSB7XG4gIGNvbnN0IGNtZFB1YmxpY1VybCA9IGdldENtZE9wdGlvbnMoKS5hcmd2LmdldCgncHVibGljVXJsJykgfHwgZ2V0Q21kT3B0aW9ucygpLmFyZ3YuZ2V0KCdwdWJsaWMtdXJsJyk7XG4gIGlmIChjbWRQdWJsaWNVcmwpIHtcbiAgICBwcm9jZXNzLmVudi5QVUJMSUNfVVJMID0gY21kUHVibGljVXJsICsgJyc7XG4gIH1cbiAgY29uc3QgcGF0aHM6IENyYVNjcmlwdHNQYXRocyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvcmVhY3Qtc2NyaXB0cy9jb25maWcvcGF0aHMnKSk7XG4gIGNvbnN0IGNoYW5nZWRQYXRocyA9IHBhdGhzO1xuICBjb25zdCBjbWRPcHRpb24gPSBnZXRDbWRPcHRpb25zKCk7XG4gIGNvbnN0IHtkaXIsIHBhY2thZ2VKc29ufSA9IGZpbmRQYWNrYWdlKGNtZE9wdGlvbi5idWlsZFRhcmdldCk7XG4gIC8vIGNvbnNvbGUubG9nKCdbZGVidWddICcsIGNtZE9wdGlvbik7XG4gIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnbGliJykge1xuICAgIGNoYW5nZWRQYXRocy5hcHBCdWlsZCA9IFBhdGgucmVzb2x2ZShkaXIsICdidWlsZCcpO1xuICAgIGNoYW5nZWRQYXRocy5hcHBJbmRleEpzID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGFja2FnZUpzb24sICdkci5jcmEtYnVpbGQtZW50cnknLCAncHVibGljX2FwaS50cycpKTtcbiAgfSBlbHNlIGlmIChjbWRPcHRpb24uYnVpbGRUeXBlID09PSAnYXBwJykge1xuICAgIGNoYW5nZWRQYXRocy5hcHBCdWlsZCA9IFBhdGgucmVzb2x2ZShkcmNwV29ya2RpciwgJ2Rpc3Qvc3RhdGljJyk7XG4gICAgLy8gY29uc3Qge2Rpcn0gPSBmaW5kUGFja2FnZShjbWRPcHRpb24uYnVpbGRUYXJnZXQpO1xuICAgIC8vIGNoYW5nZWRQYXRocy5hcHBCdWlsZCA9IFBhdGgucmVzb2x2ZShkaXIsICdidWlsZCcpO1xuICAgIC8vIGNoYW5nZWRQYXRocy5hcHBJbmRleEpzID0gUGF0aC5yZXNvbHZlKGRpciwgXy5nZXQocGFja2FnZUpzb24sICdkci5jcmEtc2VydmUtZW50cnknLCAnc2VydmVfaW5kZXgudHMnKSk7XG4gIH1cbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2NyYS1zY3JpcHRzLXBhdGhzXSBjaGFuZ2VkIHJlYWN0LXNjcmlwdHMgcGF0aHM6XFxuJywgY2hhbmdlZFBhdGhzKTtcbiAgcmV0dXJuIGNoYW5nZWRQYXRocztcbn1cblxuZnVuY3Rpb24gZmluZERyY3BXb3JrZGlyKCkge1xuICBsZXQgZGlyID0gUGF0aC5yZXNvbHZlKCk7XG4gIGxldCBwYXJlbnQgPSBudWxsO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHRlc3REaXIgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJywgJ2RyLWNvbXAtcGFja2FnZScpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3REaXIpKSB7XG4gICAgICByZXR1cm4gZGlyO1xuICAgIH1cbiAgICBwYXJlbnQgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50ID09PSBkaXIgfHwgcGFyZW50ID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBEUkNQIHdvcmtzcGFjZScpO1xuICB9XG59XG5cbiJdfQ==
