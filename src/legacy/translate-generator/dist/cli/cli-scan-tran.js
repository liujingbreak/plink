"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanTran = void 0;
// import {config} from '@wfh/plink';
const __plink_1 = __importDefault(require("__plink"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
// import { PackageInfo } from '@wfh/plink/wfh/dist/package-mgr';
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
function scanTran(locale, pkgName, rootDir, jsDir, metaDir, excludeJs = true) {
    return __awaiter(this, void 0, void 0, function* () {
        // let transByFile: {[file: string]: Translatables[]};
        const scanDirs = [];
        if (rootDir == null) {
            rootDir = jsDir;
        }
        if (jsDir) {
            scanDirs.push(jsDir);
            if (metaDir == null) {
                const pkg = __plink_1.default.findPackageByFile(jsDir);
                if (pkg == null) {
                    throw new Error(`${jsDir} is not inside any of linked source package, you have to specify a metadata output directory`);
                }
                metaDir = path_1.default.resolve(pkg.realPath, 'i18n');
            }
        }
        else if (pkgName) {
            const [pkg] = utils_1.findPackagesByNames([pkgName]);
            if (pkg != null) {
                if (rootDir == null)
                    rootDir = pkg.realPath;
                const pkgDirs = misc_1.getTscConfigOfPkg(pkg.json);
                scanDirs.push(pkgDirs.destDir);
                if (pkgDirs.isomDir) {
                    scanDirs.push(pkgDirs.isomDir);
                }
                if (metaDir == null) {
                    metaDir = path_1.default.resolve(pkg.realPath, 'i18n');
                }
            }
            else {
                throw new Error(`Can not found linked package for name like: ${pkgName}`);
            }
        }
        if (!fs_1.default.existsSync(metaDir)) {
            fs_extra_1.default.mkdirpSync(metaDir);
        }
        const pool = new thread_promise_pool_1.Pool();
        yield rx.from(scanDirs).pipe(op.filter(dir => {
            if (!fs_1.default.statSync(dir).isDirectory()) {
                __plink_1.default.logger.error(`${dir} is not a directory`);
                return false;
            }
            return true;
        }), op.mergeMap(dir => {
            return new rx.Observable(sub => {
                const pattern = path_1.default.relative(process.cwd(), dir).replace(/\\/g, '/') +
                    (excludeJs ? '/**/*.{ts,tsx,js,jsx}' : '/**/*.{js,jsx}');
                glob_1.default(pattern, { cwd: process.cwd(), nodir: true }, (err, matches) => {
                    if (err) {
                        return sub.error(err);
                    }
                    for (const file of matches) {
                        if (!file.endsWith('.d.ts'))
                            sub.next(file);
                    }
                    sub.complete();
                });
            });
        }), op.mergeMap(file => {
            return (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const relPath = path_1.default.relative(rootDir, file);
                    const metadataFile = path_1.default.resolve(metaDir, locale, relPath.replace(/\.[^./\\]+$/g, '.yaml'));
                    yield pool.submit({
                        file: path_1.default.resolve(__dirname, 'cli-scan-tran-worker.js'),
                        exportFn: 'scanFile',
                        args: [file, metadataFile]
                    });
                }
                catch (ex) {
                    __plink_1.default.logger.error(ex);
                }
            }))();
        })).toPromise();
        // plink.logger.info(`Found total ${files.length}`);
        // fsext.mkdirpSync(Path.dirname(output));
        // fs.promises.writeFile(output, JSON.stringify(transByFile, null, '  '));
        // plink.logger.info(output + ' is ' + (oldMetaFileExits ? 'updated' : 'written'));
    });
}
exports.scanTran = scanTran;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNjYW4tdHJhbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsaS1zY2FuLXRyYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHFDQUFxQztBQUNyQyxzREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLHdEQUE2QjtBQUM3QixnREFBd0I7QUFDeEIsZ0RBQXdCO0FBQ3hCLGtFQUE4QztBQUM5Qyx5REFBaUU7QUFDakUseURBQWtFO0FBQ2xFLGlFQUFpRTtBQUNqRSx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBdUJyQyxTQUFzQixRQUFRLENBQUMsTUFBYyxFQUFFLE9BQTJCLEVBQ3hFLE9BQWdCLEVBQUUsS0FBYyxFQUFFLE9BQWdCLEVBQUUsU0FBUyxHQUFHLElBQUk7O1FBQ3BFLHNEQUFzRDtRQUV0RCxNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7UUFDOUIsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ25CLE9BQU8sR0FBRyxLQUFLLENBQUM7U0FDakI7UUFDRCxJQUFJLEtBQUssRUFBRTtZQUNULFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckIsSUFBSSxPQUFPLElBQUksSUFBSSxFQUFFO2dCQUNuQixNQUFNLEdBQUcsR0FBRyxpQkFBSyxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7b0JBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLEtBQUssOEZBQThGLENBQUMsQ0FBQztpQkFDekg7Z0JBQ0QsT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUM5QztTQUVGO2FBQU0sSUFBSSxPQUFPLEVBQUU7WUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLDJCQUFtQixDQUFDLENBQUMsT0FBTyxDQUFD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RSxNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDOUYsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFlO3dCQUM5QixJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUseUJBQXlCLENBQUM7d0JBQ3hELFFBQVEsRUFBRSxVQUFVO3dCQUNwQixJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDO3FCQUMzQixDQUFDLENBQUM7aUJBQ0o7Z0JBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQ1gsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUN4QjtZQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFZCxvREFBb0Q7UUFDcEQsMENBQTBDO1FBQzFDLDBFQUEwRTtRQUMxRSxtRkFBbUY7SUFDckYsQ0FBQztDQUFBO0FBeEZELDRCQXdGQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZ2xvYiBmcm9tICdnbG9iJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sJztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kL3V0aWxzJztcbi8vIGltcG9ydCB7IFBhY2thZ2VJbmZvIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIENoYWxrIGlzIHVzZWZ1bCBmb3IgcHJpbnRpbmcgY29sb3JmdWwgdGV4dCBpbiBhIHRlcm1pbmFsXG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyYW5zbGF0YWJsZSB7XG4gIGtleTogc3RyaW5nO1xuICB0ZXh0OiBzdHJpbmcgfCBudWxsO1xuICBzdGFydDogbnVtYmVyO1xuICBlbmQ6IG51bWJlcjtcbiAgZGVzYzogc3RyaW5nO1xufVxuXG5leHBvcnQgdHlwZSBTdHJpbmdJbmZvID0gW1xuICBzdGFydDogbnVtYmVyLFxuICBlbmQ6IG51bWJlcixcbiAgdGV4dDogc3RyaW5nLFxuICAvKiogMSBiYXNlZCAqL1xuICBsaW5lOiBudW1iZXIsXG4gIC8qKiAxIGJhc2VkICovXG4gIGNvbDogbnVtYmVyLFxuICB0eXBlOiBzdHJpbmdcbl07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzY2FuVHJhbihsb2NhbGU6IHN0cmluZywgcGtnTmFtZTogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICByb290RGlyPzogc3RyaW5nLCBqc0Rpcj86IHN0cmluZywgbWV0YURpcj86IHN0cmluZywgZXhjbHVkZUpzID0gdHJ1ZSkge1xuICAvLyBsZXQgdHJhbnNCeUZpbGU6IHtbZmlsZTogc3RyaW5nXTogVHJhbnNsYXRhYmxlc1tdfTtcblxuICBjb25zdCBzY2FuRGlyczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKHJvb3REaXIgPT0gbnVsbCkge1xuICAgIHJvb3REaXIgPSBqc0RpcjtcbiAgfVxuICBpZiAoanNEaXIpIHtcbiAgICBzY2FuRGlycy5wdXNoKGpzRGlyKTtcbiAgICBpZiAobWV0YURpciA9PSBudWxsKSB7XG4gICAgICBjb25zdCBwa2cgPSBwbGluay5maW5kUGFja2FnZUJ5RmlsZShqc0Rpcik7XG4gICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2pzRGlyfSBpcyBub3QgaW5zaWRlIGFueSBvZiBsaW5rZWQgc291cmNlIHBhY2thZ2UsIHlvdSBoYXZlIHRvIHNwZWNpZnkgYSBtZXRhZGF0YSBvdXRwdXQgZGlyZWN0b3J5YCk7XG4gICAgICB9XG4gICAgICBtZXRhRGlyID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgJ2kxOG4nKTtcbiAgICB9XG5cbiAgfSBlbHNlIGlmIChwa2dOYW1lKSB7XG4gICAgY29uc3QgW3BrZ10gPSBmaW5kUGFja2FnZXNCeU5hbWVzKFtwa2dOYW1lXSk7XG4gICAgaWYgKHBrZyAhPSBudWxsKSB7XG4gICAgICBpZiAocm9vdERpciA9PSBudWxsKVxuICAgICAgICByb290RGlyID0gcGtnLnJlYWxQYXRoO1xuICAgICAgY29uc3QgcGtnRGlycyA9IGdldFRzY0NvbmZpZ09mUGtnKHBrZy5qc29uKTtcbiAgICAgIHNjYW5EaXJzLnB1c2gocGtnRGlycy5kZXN0RGlyKTtcbiAgICAgIGlmIChwa2dEaXJzLmlzb21EaXIpIHtcbiAgICAgICAgc2NhbkRpcnMucHVzaChwa2dEaXJzLmlzb21EaXIpO1xuICAgICAgfVxuICAgICAgaWYgKG1ldGFEaXIgPT0gbnVsbCkge1xuICAgICAgICBtZXRhRGlyID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgJ2kxOG4nKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IGZvdW5kIGxpbmtlZCBwYWNrYWdlIGZvciBuYW1lIGxpa2U6ICR7cGtnTmFtZX1gKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWZzLmV4aXN0c1N5bmMobWV0YURpciEpKSB7XG4gICAgZnNleHQubWtkaXJwU3luYyhtZXRhRGlyISk7XG4gIH1cblxuICBjb25zdCBwb29sID0gbmV3IFBvb2woKTtcbiAgYXdhaXQgcnguZnJvbShzY2FuRGlycykucGlwZShcbiAgICBvcC5maWx0ZXIoZGlyID0+IHtcbiAgICAgIGlmICghZnMuc3RhdFN5bmMoZGlyKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgIHBsaW5rLmxvZ2dlci5lcnJvcihgJHtkaXJ9IGlzIG5vdCBhIGRpcmVjdG9yeWApO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KSxcbiAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHN0cmluZz4oc3ViID0+IHtcbiAgICAgICAgY29uc3QgcGF0dGVybiA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgK1xuICAgICAgICAgIChleGNsdWRlSnMgPyAnLyoqLyoue3RzLHRzeCxqcyxqc3h9JyA6ICcvKiovKi57anMsanN4fScpO1xuXG4gICAgICAgIGdsb2IocGF0dGVybiwge2N3ZDogcHJvY2Vzcy5jd2QoKSwgbm9kaXI6IHRydWV9LCAoZXJyLCBtYXRjaGVzKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIHN1Yi5lcnJvcihlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgbWF0Y2hlcykge1xuICAgICAgICAgICAgaWYgKCFmaWxlLmVuZHNXaXRoKCcuZC50cycpKVxuICAgICAgICAgICAgICBzdWIubmV4dChmaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBvcC5tZXJnZU1hcChmaWxlID0+IHtcbiAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIhLCBmaWxlKTtcbiAgICAgICAgICBjb25zdCBtZXRhZGF0YUZpbGUgPSBQYXRoLnJlc29sdmUobWV0YURpciEsIGxvY2FsZSwgcmVsUGF0aC5yZXBsYWNlKC9cXC5bXi4vXFxcXF0rJC9nLCAnLnlhbWwnKSk7XG4gICAgICAgICAgYXdhaXQgcG9vbC5zdWJtaXQ8U3RyaW5nSW5mb1tdPih7XG4gICAgICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY2xpLXNjYW4tdHJhbi13b3JrZXIuanMnKSxcbiAgICAgICAgICAgIGV4cG9ydEZuOiAnc2NhbkZpbGUnLFxuICAgICAgICAgICAgYXJnczogW2ZpbGUsIG1ldGFkYXRhRmlsZV1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBwbGluay5sb2dnZXIuZXJyb3IoZXgpO1xuICAgICAgICB9XG4gICAgICB9KSgpO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgLy8gcGxpbmsubG9nZ2VyLmluZm8oYEZvdW5kIHRvdGFsICR7ZmlsZXMubGVuZ3RofWApO1xuICAvLyBmc2V4dC5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShvdXRwdXQpKTtcbiAgLy8gZnMucHJvbWlzZXMud3JpdGVGaWxlKG91dHB1dCwgSlNPTi5zdHJpbmdpZnkodHJhbnNCeUZpbGUsIG51bGwsICcgICcpKTtcbiAgLy8gcGxpbmsubG9nZ2VyLmluZm8ob3V0cHV0ICsgJyBpcyAnICsgKG9sZE1ldGFGaWxlRXhpdHMgPyAndXBkYXRlZCcgOiAnd3JpdHRlbicpKTtcbn1cblxuIl19