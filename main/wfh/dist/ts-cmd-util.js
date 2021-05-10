"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeBaseUrlAndPaths = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function mergeBaseUrlAndPaths(ts, fromTsconfigFile, mergeToTsconfigDir, mergeTo) {
    const mergingTscfg = ts.parseConfigFileTextToJson(fromTsconfigFile, fs_1.default.readFileSync(fromTsconfigFile, 'utf8'))
        .config.compilerOptions;
    if (mergeTo.paths == null) {
        if (mergeTo.baseUrl == null)
            mergeTo.baseUrl = './';
        mergeTo.paths = {};
    }
    if (mergingTscfg.paths) {
        const absBaseUrl = mergingTscfg.baseUrl ?
            path_1.default.resolve(path_1.default.dirname(fromTsconfigFile), mergingTscfg.baseUrl) :
            path_1.default.dirname(fromTsconfigFile);
        for (const [key, plist] of Object.entries(mergingTscfg.paths)) {
            mergeTo.paths[key] = plist.map(item => {
                return path_1.default.relative(path_1.default.resolve(mergeToTsconfigDir, mergeTo.baseUrl), path_1.default.resolve(absBaseUrl, item)).replace(/\\/g, '/');
            });
        }
    }
}
exports.mergeBaseUrlAndPaths = mergeBaseUrlAndPaths;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jbWQtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBSXhCLFNBQWdCLG9CQUFvQixDQUFDLEVBQWMsRUFBRSxnQkFBd0IsRUFDM0Usa0JBQTBCLEVBQzFCLE9BQWdDO0lBQ2hDLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFFLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1NBQzNHLE1BQU0sQ0FBQyxlQUFlLENBQUM7SUFFMUIsSUFBSSxPQUFPLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtRQUN6QixJQUFJLE9BQU8sQ0FBQyxPQUFPLElBQUksSUFBSTtZQUN6QixPQUFPLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUN6QixPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztLQUNwQjtJQUNELElBQUksWUFBWSxDQUFDLEtBQUssRUFBRTtRQUN0QixNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDcEUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxLQUFrQyxDQUFDLEVBQUc7WUFDM0YsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNwQyxPQUFPLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlILENBQUMsQ0FBQyxDQUFDO1NBQ0o7S0FDRjtBQUNILENBQUM7QUFyQkQsb0RBcUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuZXhwb3J0IHtSZXF1aXJlZENvbXBpbGVyT3B0aW9uc307XG5cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZUJhc2VVcmxBbmRQYXRocyh0czogdHlwZW9mIF90cywgZnJvbVRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBtZXJnZVRvVHNjb25maWdEaXI6IHN0cmluZyxcbiAgbWVyZ2VUbzogUmVxdWlyZWRDb21waWxlck9wdGlvbnMpIHtcbiAgY29uc3QgbWVyZ2luZ1RzY2ZnID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihmcm9tVHNjb25maWdGaWxlLCBmcy5yZWFkRmlsZVN5bmMoZnJvbVRzY29uZmlnRmlsZSwgJ3V0ZjgnKSlcbiAgICAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcblxuICBpZiAobWVyZ2VUby5wYXRocyA9PSBudWxsKSB7XG4gICAgaWYgKG1lcmdlVG8uYmFzZVVybCA9PSBudWxsKVxuICAgICAgbWVyZ2VUby5iYXNlVXJsID0gJy4vJztcbiAgICBtZXJnZVRvLnBhdGhzID0ge307XG4gIH1cbiAgaWYgKG1lcmdpbmdUc2NmZy5wYXRocykge1xuICAgIGNvbnN0IGFic0Jhc2VVcmwgPSBtZXJnaW5nVHNjZmcuYmFzZVVybCA/XG4gICAgICBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZyb21Uc2NvbmZpZ0ZpbGUpLCBtZXJnaW5nVHNjZmcuYmFzZVVybCkgOlxuICAgICAgUGF0aC5kaXJuYW1lKGZyb21Uc2NvbmZpZ0ZpbGUpO1xuICAgIGZvciAoY29uc3QgW2tleSwgcGxpc3RdIG9mIE9iamVjdC5lbnRyaWVzKG1lcmdpbmdUc2NmZy5wYXRocyBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nW119KSApIHtcbiAgICAgIG1lcmdlVG8ucGF0aHNba2V5XSA9IHBsaXN0Lm1hcChpdGVtID0+IHtcbiAgICAgICAgcmV0dXJuIFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKG1lcmdlVG9Uc2NvbmZpZ0RpciwgbWVyZ2VUby5iYXNlVXJsKSwgUGF0aC5yZXNvbHZlKGFic0Jhc2VVcmwsIGl0ZW0pKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==