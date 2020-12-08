"use strict";
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
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const fs_extra_1 = __importDefault(require("fs-extra"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const chalk_1 = __importDefault(require("chalk"));
const lodash_1 = __importDefault(require("lodash"));
const lodashTemplateSetting = {
    interpolate: /\$__([\s\S]+?)__\$/g
};
/**
 * The template file name and directory name is replaced by regular expression,
 * file name suffix is removed, therefor you should use a double suffix as a template
 * file name (like 'hellow.ts.txt' will become 'hellow.ts').
 *
 * The template file content is replace by lodash template function
 * @param templDir
 * @param targetPath
 * @param replacement
 * @param opt
 */
function generateStructure(templDir, targetPath, replacement, opt = { dryrun: false }) {
    if (replacement.includeTextType == null) {
        replacement.includeTextType = /(?:[tj]sx?|s?css|json|yaml|yml|html|svg)$/;
    }
    return _recurseDir(templDir, targetPath, replacement, opt).toPromise();
}
exports.default = generateStructure;
function _recurseDir(templDir, targetPath, replacement, opt = { dryrun: false }, targetIsEmpty = false) {
    const dryrun = !!opt.dryrun;
    return rxjs_1.from(fs_1.promises.readdir(templDir)).pipe(operators_1.mergeMap(files => rxjs_1.from(files)), operators_1.mergeMap(sub => {
        const absSub = path_1.default.resolve(templDir, sub);
        return rxjs_1.from(fs_1.promises.stat(absSub)).pipe(operators_1.mergeMap(state => {
            if (state.isDirectory()) {
                let newDir = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newDir = newDir.replace(reg, repl);
                }
                newDir = path_1.default.resolve(targetPath, newDir);
                // console.log(newDir, absSub);
                const done$ = dryrun ? rxjs_1.of(undefined) :
                    rxjs_1.from(fs_extra_1.default.mkdirp(path_1.default.resolve(targetPath, newDir)));
                return done$.pipe(operators_1.mergeMap(() => _recurseDir(absSub, newDir, replacement, opt, true)));
            }
            else {
                let newFile = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newFile = newFile.replace(reg, repl);
                }
                newFile = path_1.default.resolve(targetPath, newFile.slice(0, newFile.lastIndexOf('.'))
                    .replace(/\.([^./\\]+)$/, '.$1'));
                return rxjs_1.from((() => __awaiter(this, void 0, void 0, function* () {
                    if (targetIsEmpty || !fs_1.existsSync(newFile)) {
                        if (!dryrun) {
                            if (!replacement.includeTextType.test(newFile)) {
                                yield fs_1.promises.copyFile(absSub, newFile);
                                // tslint:disable-next-line: no-console
                                console.log(`[plink gen] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is copied`);
                            }
                            else {
                                let content = yield fs_1.promises.readFile(absSub, 'utf-8');
                                try {
                                    content = lodash_1.default.template(content, lodashTemplateSetting)(replacement.textMapping);
                                }
                                catch (e) {
                                    console.error(`In file ${absSub}`);
                                    console.error(e);
                                }
                                yield fs_1.promises.writeFile(newFile, content);
                                // tslint:disable-next-line: no-console
                                console.log(`[plink gen] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is written`);
                            }
                        }
                        else {
                            // tslint:disable-next-line: no-console
                            console.log(`[plink gen] ${chalk_1.default.green(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
                        }
                    }
                    else {
                        // tslint:disable-next-line: no-console
                        console.log('[plink gen] target file already exists:', path_1.default.relative(path_1.default.resolve(), newFile));
                    }
                }))());
            }
        }));
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBY3ZCLE1BQU0scUJBQXFCLEdBQWtEO0lBQzNFLFdBQVcsRUFBRSxxQkFBcUI7Q0FDbkMsQ0FBQztBQUNGOzs7Ozs7Ozs7O0dBVUc7QUFDSCxTQUF3QixpQkFBaUIsQ0FDdkMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLFdBQTZCLEVBQUUsTUFBc0IsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDO0lBQzFHLElBQUksV0FBVyxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7UUFDdkMsV0FBVyxDQUFDLGVBQWUsR0FBRywyQ0FBMkMsQ0FBQztLQUMzRTtJQUNELE9BQU8sV0FBVyxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pFLENBQUM7QUFORCxvQ0FNQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsVUFBa0IsRUFBRSxXQUE2QixFQUN0RixNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsRUFBRSxhQUFhLEdBQUcsS0FBSztJQUM1RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUM1QixPQUFPLFdBQUksQ0FBQyxhQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUMxQyxvQkFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsV0FBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzlCLG9CQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDYixNQUFNLE1BQU0s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LE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDM0MsdUNBQXVDO2dDQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzs2QkFDOUY7eUJBQ0Y7NkJBQU07NEJBQ0wsdUNBQXVDOzRCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzt5QkFDOUY7cUJBQ0Y7eUJBQU07d0JBQ0wsdUNBQXVDO3dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2hHO2dCQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ1A7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzZXMsIGV4aXN0c1N5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbFJlcGxhY2VtZW50IHtcbiAgZmlsZU1hcHBpbmc/OiBbUmVnRXhwLCBzdHJpbmddW107XG4gIC8qKiBsb2RhaCB0ZW1wbGF0ZSAqL1xuICB0ZXh0TWFwcGluZz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogU3VmZml4IG5hbWUgb2YgdGFyZ2V0IGZpbGUsIGRlZmF1bHQ6IC8oPzpbdGpdc3g/fHM/Y3NzfGpzb258eWFtbHx5bWx8aHRtbHxzdmcpJC8gKi9cbiAgaW5jbHVkZVRleHRUeXBlPzogUmVnRXhwO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9uIHtcbiAgZHJ5cnVuPzogYm9vbGVhbjtcbn1cblxuY29uc3QgbG9kYXNoVGVtcGxhdGVTZXR0aW5nOiBOb25OdWxsYWJsZTxQYXJhbWV0ZXJzPHR5cGVvZiBfLnRlbXBsYXRlPlsxXT4gPSB7XG4gIGludGVycG9sYXRlOiAvXFwkX18oW1xcc1xcU10rPylfX1xcJC9nXG59O1xuLyoqXG4gKiBUaGUgdGVtcGxhdGUgZmlsZSBuYW1lIGFuZCBkaXJlY3RvcnkgbmFtZSBpcyByZXBsYWNlZCBieSByZWd1bGFyIGV4cHJlc3Npb24sXG4gKiBmaWxlIG5hbWUgc3VmZml4IGlzIHJlbW92ZWQsIHRoZXJlZm9yIHlvdSBzaG91bGQgdXNlIGEgZG91YmxlIHN1ZmZpeCBhcyBhIHRlbXBsYXRlXG4gKiBmaWxlIG5hbWUgKGxpa2UgJ2hlbGxvdy50cy50eHQnIHdpbGwgYmVjb21lICdoZWxsb3cudHMnKS5cbiAqIFxuICogVGhlIHRlbXBsYXRlIGZpbGUgY29udGVudCBpcyByZXBsYWNlIGJ5IGxvZGFzaCB0ZW1wbGF0ZSBmdW5jdGlvblxuICogQHBhcmFtIHRlbXBsRGlyIFxuICogQHBhcmFtIHRhcmdldFBhdGggXG4gKiBAcGFyYW0gcmVwbGFjZW1lbnQgXG4gKiBAcGFyYW0gb3B0IFxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZW5lcmF0ZVN0cnVjdHVyZShcbiAgdGVtcGxEaXI6IHN0cmluZywgdGFyZ2V0UGF0aDogc3RyaW5nLCByZXBsYWNlbWVudDogVGVtcGxSZXBsYWNlbWVudCwgb3B0OiBHZW5lcmF0ZU9wdGlvbiA9IHtkcnlydW46IGZhbHNlfSkge1xuICBpZiAocmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlID09IG51bGwpIHtcbiAgICByZXBsYWNlbWVudC5pbmNsdWRlVGV4dFR5cGUgPSAvKD86W3RqXXN4P3xzP2Nzc3xqc29ufHlhbWx8eW1sfGh0bWx8c3ZnKSQvO1xuICB9XG4gIHJldHVybiBfcmVjdXJzZURpcih0ZW1wbERpciwgdGFyZ2V0UGF0aCwgcmVwbGFjZW1lbnQsIG9wdCkudG9Qcm9taXNlKCk7XG59XG5cbmZ1bmN0aW9uIF9yZWN1cnNlRGlyKHRlbXBsRGlyOiBzdHJpbmcsIHRhcmdldFBhdGg6IHN0cmluZywgcmVwbGFjZW1lbnQ6IFRlbXBsUmVwbGFjZW1lbnQsXG4gIG9wdDogR2VuZXJhdGVPcHRpb24gPSB7ZHJ5cnVuOiBmYWxzZX0sIHRhcmdldElzRW1wdHkgPSBmYWxzZSk6IE9ic2VydmFibGU8YW55PiB7XG4gIGNvbnN0IGRyeXJ1biA9ICEhb3B0LmRyeXJ1bjtcbiAgcmV0dXJuIGZyb20ocHJvbWlzZXMucmVhZGRpcih0ZW1wbERpcikpLnBpcGUoXG4gICAgbWVyZ2VNYXAoZmlsZXMgPT4gZnJvbShmaWxlcykpLFxuICAgIG1lcmdlTWFwKHN1YiA9PiB7XG4gICAgICBjb25zdCBhYnNTdWIgPSBQYXRoLnJlc29sdmUodGVtcGxEaXIsIHN1Yik7XG4gICAgICByZXR1cm4gZnJvbShwcm9taXNlcy5zdGF0KGFic1N1YikpLnBpcGUoXG4gICAgICAgIG1lcmdlTWFwKHN0YXRlID0+IHtcbiAgICAgICAgICBpZiAoc3RhdGUuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgbGV0IG5ld0RpciA9IHN1YjtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3JlZywgcmVwbF0gb2YgcmVwbGFjZW1lbnQuZmlsZU1hcHBpbmcgfHwgW10pIHtcbiAgICAgICAgICAgICAgbmV3RGlyID0gbmV3RGlyLnJlcGxhY2UocmVnLCByZXBsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld0RpciA9IFBhdGgucmVzb2x2ZSh0YXJnZXRQYXRoLCBuZXdEaXIpO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobmV3RGlyLCBhYnNTdWIpO1xuICAgICAgICAgICAgY29uc3QgZG9uZSQgPSBkcnlydW4gPyBvZih1bmRlZmluZWQpIDpcbiAgICAgICAgICAgICAgZnJvbShmc2UubWtkaXJwKFBhdGgucmVzb2x2ZSh0YXJnZXRQYXRoLCBuZXdEaXIpKSk7XG4gICAgICAgICAgICByZXR1cm4gZG9uZSQucGlwZShcbiAgICAgICAgICAgICAgbWVyZ2VNYXAoKCkgPT4gX3JlY3Vyc2VEaXIoYWJzU3ViLCBuZXdEaXIsIHJlcGxhY2VtZW50LCBvcHQsIHRydWUpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5ld0ZpbGUgPSBzdWI7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxdIG9mIHJlcGxhY2VtZW50LmZpbGVNYXBwaW5nIHx8IFtdKSB7XG4gICAgICAgICAgICAgIG5ld0ZpbGUgPSBuZXdGaWxlLnJlcGxhY2UocmVnLCByZXBsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld0ZpbGUgPSBQYXRoLnJlc29sdmUodGFyZ2V0UGF0aCwgbmV3RmlsZS5zbGljZSgwLCBuZXdGaWxlLmxhc3RJbmRleE9mKCcuJykpXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9cXC4oW14uL1xcXFxdKykkLywgJy4kMScpKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZyb20oKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHRhcmdldElzRW1wdHkgfHwgIWV4aXN0c1N5bmMobmV3RmlsZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRyeXJ1bikge1xuICAgICAgICAgICAgICAgICAgaWYgKCFyZXBsYWNlbWVudC5pbmNsdWRlVGV4dFR5cGUhLnRlc3QobmV3RmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZXMuY29weUZpbGUoYWJzU3ViLCBuZXdGaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbcGxpbmsgZ2VuXSAke2NoYWxrLmdyZWVuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY29waWVkYCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHByb21pc2VzLnJlYWRGaWxlKGFic1N1YiwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IF8udGVtcGxhdGUoY29udGVudCwgbG9kYXNoVGVtcGxhdGVTZXR0aW5nKShyZXBsYWNlbWVudC50ZXh0TWFwcGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBJbiBmaWxlICR7YWJzU3VifWApO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZXMud3JpdGVGaWxlKG5ld0ZpbGUsIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtwbGluayBnZW5dICR7Y2hhbGsuZ3JlZW4oUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpfSBpcyB3cml0dGVuYCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtwbGluayBnZW5dICR7Y2hhbGsuZ3JlZW4oUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpfSBpcyBjcmVhdGVkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbcGxpbmsgZ2VuXSB0YXJnZXQgZmlsZSBhbHJlYWR5IGV4aXN0czonLCBQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKTtcbn1cbiJdfQ==