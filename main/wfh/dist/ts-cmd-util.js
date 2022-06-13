"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseConfigFileToJson = exports.mergeBaseUrlAndPaths = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 *
 * @param ts
 * @param fromTsconfigFile
 * @param mergeToTsconfigDir
 * @param mergeTo
 * @return json of fromTsconfigFile
 */
function mergeBaseUrlAndPaths(ts, fromTsconfigFile, mergeToTsconfigDir, mergeTo) {
    const mergingTsCfg = ts.parseConfigFileTextToJson(fromTsconfigFile, fs_1.default.readFileSync(fromTsconfigFile, 'utf8')).config;
    const mergingTsCo = mergingTsCfg.compilerOptions;
    if (mergeTo.paths == null) {
        if (mergeTo.baseUrl == null)
            mergeTo.baseUrl = './';
        mergeTo.paths = {};
    }
    if (mergingTsCo.paths) {
        const absBaseUrl = mergingTsCo.baseUrl ?
            path_1.default.resolve(path_1.default.dirname(fromTsconfigFile), mergingTsCo.baseUrl) :
            path_1.default.dirname(fromTsconfigFile);
        const mergeToBaseUrlAbsPath = path_1.default.resolve(mergeToTsconfigDir, mergeTo.baseUrl);
        for (const [key, plist] of Object.entries(mergingTsCo.paths)) {
            mergeTo.paths[key] = plist.map(item => {
                return path_1.default.relative(mergeToBaseUrlAbsPath, path_1.default.resolve(absBaseUrl, item)).replace(/\\/g, '/');
            });
        }
    }
    return mergingTsCfg;
}
exports.mergeBaseUrlAndPaths = mergeBaseUrlAndPaths;
/**
 * typescript's parseConfigFileTextToJson() does not read "extends" property, I have to write my own implementation
 * @param ts
 * @param file
 */
function parseConfigFileToJson(ts, file) {
    const { config, error } = ts.parseConfigFileTextToJson(file, fs_1.default.readFileSync(file, 'utf8'));
    if (error) {
        console.error(error);
        throw new Error('Incorrect tsconfig file: ' + file);
    }
    const json = config;
    if (json.extends) {
        const extendsFile = path_1.default.resolve(path_1.default.dirname(file), json.extends);
        const pJson = parseConfigFileToJson(ts, extendsFile);
        for (const [prop, value] of Object.entries(pJson.compilerOptions)) {
            if (prop !== 'baseUrl' && prop !== 'paths' && !Object.prototype.hasOwnProperty.call(json.compilerOptions, prop)) {
                json.compilerOptions[prop] = value;
            }
        }
        if (pJson.compilerOptions.paths) {
            const absBaseUrl = pJson.compilerOptions.baseUrl ?
                path_1.default.resolve(path_1.default.dirname(extendsFile), pJson.compilerOptions.baseUrl) :
                path_1.default.dirname(extendsFile);
            const mergeToBaseUrlAbsPath = path_1.default.resolve(path_1.default.dirname(file), json.compilerOptions.baseUrl);
            for (const [key, plist] of Object.entries(pJson.compilerOptions.paths)) {
                if (json.compilerOptions.paths == null) {
                    json.compilerOptions.paths = {};
                }
                json.compilerOptions.paths[key] = plist.map(item => {
                    return path_1.default.relative(mergeToBaseUrlAbsPath, path_1.default.resolve(absBaseUrl, item))
                        .replace(/\\/g, '/');
                });
            }
        }
    }
    return json;
}
exports.parseConfigFileToJson = parseConfigFileToJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtY21kLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy90cy1jbWQtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBS3hCOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixvQkFBb0IsQ0FBQyxFQUFjLEVBQUUsZ0JBQXdCLEVBQzNFLGtCQUEwQixFQUMxQixPQUFnQztJQUNoQyxNQUFNLFlBQVksR0FBRyxFQUFFLENBQUMseUJBQXlCLENBQUMsZ0JBQWdCLEVBQUUsWUFBRSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUN0SCxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsZUFBMEMsQ0FBQztJQUU1RSxJQUFJLE9BQU8sQ0FBQyxLQUFLLElBQUksSUFBSSxFQUFFO1FBQ3pCLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxJQUFJO1lBQ3pCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0tBQ3BCO0lBRUQsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFO1FBQ3JCLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNuRSxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFakMsTUFBTSxxQkFBcUIsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVoRixLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFX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QUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQzt5QkFDeEUsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDekIsQ0FBQyxDQUFDLENBQUM7YUFDSjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFwQ0Qsc0RBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7Q29tcGlsZXJPcHRpb25zIGFzIFJlcXVpcmVkQ29tcGlsZXJPcHRpb25zfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuZXhwb3J0IHtSZXF1aXJlZENvbXBpbGVyT3B0aW9uc307XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gdHMgXG4gKiBAcGFyYW0gZnJvbVRzY29uZmlnRmlsZSBcbiAqIEBwYXJhbSBtZXJnZVRvVHNjb25maWdEaXIgXG4gKiBAcGFyYW0gbWVyZ2VUbyBcbiAqIEByZXR1cm4ganNvbiBvZiBmcm9tVHNjb25maWdGaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZUJhc2VVcmxBbmRQYXRocyh0czogdHlwZW9mIF90cywgZnJvbVRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBtZXJnZVRvVHNjb25maWdEaXI6IHN0cmluZyxcbiAgbWVyZ2VUbzogUmVxdWlyZWRDb21waWxlck9wdGlvbnMpOiB7Y29tcGlsZXJPcHRpb25zOiBSZXF1aXJlZENvbXBpbGVyT3B0aW9uc30ge1xuICBjb25zdCBtZXJnaW5nVHNDZmcgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGZyb21Uc2NvbmZpZ0ZpbGUsIGZzLnJlYWRGaWxlU3luYyhmcm9tVHNjb25maWdGaWxlLCAndXRmOCcpKS5jb25maWc7XG4gIGNvbnN0IG1lcmdpbmdUc0NvID0gbWVyZ2luZ1RzQ2ZnLmNvbXBpbGVyT3B0aW9ucyBhcyBSZXF1aXJlZENvbXBpbGVyT3B0aW9ucztcblxuICBpZiAobWVyZ2VUby5wYXRocyA9PSBudWxsKSB7XG4gICAgaWYgKG1lcmdlVG8uYmFzZVVybCA9PSBudWxsKVxuICAgICAgbWVyZ2VUby5iYXNlVXJsID0gJy4vJztcbiAgICBtZXJnZVRvLnBhdGhzID0ge307XG4gIH1cblxuICBpZiAobWVyZ2luZ1RzQ28ucGF0aHMpIHtcbiAgICBjb25zdCBhYnNCYXNlVXJsID0gbWVyZ2luZ1RzQ28uYmFzZVVybCA/XG4gICAgICBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZyb21Uc2NvbmZpZ0ZpbGUpLCBtZXJnaW5nVHNDby5iYXNlVXJsKSA6XG4gICAgICBQYXRoLmRpcm5hbWUoZnJvbVRzY29uZmlnRmlsZSk7XG5cbiAgICBjb25zdCBtZXJnZVRvQmFzZVVybEFic1BhdGggPSBQYXRoLnJlc29sdmUobWVyZ2VUb1RzY29uZmlnRGlyLCBtZXJnZVRvLmJhc2VVcmwpO1xuXG4gICAgZm9yIChjb25zdCBba2V5LCBwbGlzdF0gb2YgT2JqZWN0LmVudHJpZXMobWVyZ2luZ1RzQ28ucGF0aHMgYXMge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSkgKSB7XG4gICAgICBtZXJnZVRvLnBhdGhzW2tleV0gPSBwbGlzdC5tYXAoaXRlbSA9PiB7XG4gICAgICAgIHJldHVybiBQYXRoLnJlbGF0aXZlKG1lcmdlVG9CYXNlVXJsQWJzUGF0aCwgUGF0aC5yZXNvbHZlKGFic0Jhc2VVcmwsIGl0ZW0pKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1lcmdpbmdUc0NmZztcbn1cblxuLyoqXG4gKiB0eXBlc2NyaXB0J3MgcGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbigpIGRvZXMgbm90IHJlYWQgXCJleHRlbmRzXCIgcHJvcGVydHksIEkgaGF2ZSB0byB3cml0ZSBteSBvd24gaW1wbGVtZW50YXRpb25cbiAqIEBwYXJhbSB0cyBcbiAqIEBwYXJhbSBmaWxlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzOiB0eXBlb2YgX3RzLCBmaWxlOiBzdHJpbmcpIHtcbiAgY29uc3Qge2NvbmZpZywgZXJyb3J9ID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihmaWxlLCBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbmNvcnJlY3QgdHNjb25maWcgZmlsZTogJyArIGZpbGUpO1xuICB9XG4gIGNvbnN0IGpzb24gPSBjb25maWcgYXMge2NvbXBpbGVyT3B0aW9uczogUmVxdWlyZWRDb21waWxlck9wdGlvbnM7IGV4dGVuZHM/OiBzdHJpbmd9O1xuICBpZiAoanNvbi5leHRlbmRzKSB7XG4gICAgY29uc3QgZXh0ZW5kc0ZpbGUgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBqc29uLmV4dGVuZHMpO1xuICAgIGNvbnN0IHBKc29uID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBleHRlbmRzRmlsZSk7XG4gICAgZm9yIChjb25zdCBbcHJvcCwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHBKc29uLmNvbXBpbGVyT3B0aW9ucykpIHtcbiAgICAgIGlmIChwcm9wICE9PSAnYmFzZVVybCcgJiYgcHJvcCAhPT0gJ3BhdGhzJyAmJiAhT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGpzb24uY29tcGlsZXJPcHRpb25zLCBwcm9wKSkge1xuICAgICAgICBqc29uLmNvbXBpbGVyT3B0aW9uc1twcm9wXSA9IHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwSnNvbi5jb21waWxlck9wdGlvbnMucGF0aHMpIHtcbiAgICAgIGNvbnN0IGFic0Jhc2VVcmwgPSBwSnNvbi5jb21waWxlck9wdGlvbnMuYmFzZVVybCA/XG4gICAgICAgIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoZXh0ZW5kc0ZpbGUpLCBwSnNvbi5jb21waWxlck9wdGlvbnMuYmFzZVVybCkgOlxuICAgICAgICBQYXRoLmRpcm5hbWUoZXh0ZW5kc0ZpbGUpO1xuXG4gICAgICBjb25zdCBtZXJnZVRvQmFzZVVybEFic1BhdGggPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBqc29uLmNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsKTtcblxuICAgICAgZm9yIChjb25zdCBba2V5LCBwbGlzdF0gb2YgT2JqZWN0LmVudHJpZXMocEpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzIGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0pICkge1xuICAgICAgICBpZiAoanNvbi5jb21waWxlck9wdGlvbnMucGF0aHMgPT0gbnVsbCkge1xuICAgICAgICAgIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzID0ge307XG4gICAgICAgIH1cbiAgICAgICAganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNba2V5XSA9IHBsaXN0Lm1hcChpdGVtID0+IHtcbiAgICAgICAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZShtZXJnZVRvQmFzZVVybEFic1BhdGgsIFBhdGgucmVzb2x2ZShhYnNCYXNlVXJsLCBpdGVtKSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4ganNvbjtcbn1cbiJdfQ==