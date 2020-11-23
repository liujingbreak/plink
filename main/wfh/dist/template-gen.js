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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBY3ZCLE1BQU0scUJBQXFCLEdBQWtEO0lBQzNFLFdBQVcsRUFBRSxxQkFBcUI7Q0FDbkMsQ0FBQztBQUNGOzs7Ozs7Ozs7O0dBVUc7QUFDSCxTQUF3QixpQkFBaUIsQ0FDdkMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLFdBQTZCLEVBQUUsTUFBc0IsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDO0lBQzFHLElBQUksV0FBVyxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7UUFDdkMsV0FBVyxDQUFDLGVBQWUsR0FBRywyQ0FBMkMsQ0FBQztLQUMzRTtJQUNELE9BQU8sV0FBVyxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pFLENBQUM7QUFORCxvQ0FNQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsVUFBa0IsRUFBRSxXQUE2QixFQUN0RixNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsRUFBRSxhQUFhLEdBQUcsS0FBSztJQUM1RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUM1QixPQUFPLFdBQUksQ0FBQyxhQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUMxQyxvQkFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsV0FBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzlCLG9CQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDYixNQUFNLE1BQU0s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LE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDM0MsdUNBQXVDO2dDQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzs2QkFDOUY7eUJBQ0Y7NkJBQU07NEJBQ0wsdUNBQXVDOzRCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzt5QkFDOUY7cUJBQ0Y7eUJBQU07d0JBQ0wsdUNBQXVDO3dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2hHO2dCQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ1A7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzZXMsIGV4aXN0c1N5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbFJlcGxhY2VtZW50IHtcbiAgZmlsZU1hcHBpbmc/OiBbUmVnRXhwLCBzdHJpbmddW107XG4gIC8qKiBsb2RhaCB0ZW1wbGF0ZSAqL1xuICB0ZXh0TWFwcGluZz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogZGVmYXVsdDogLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLyAqL1xuICBpbmNsdWRlVGV4dFR5cGU/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVPcHRpb24ge1xuICBkcnlydW4/OiBib29sZWFuO1xufVxuXG5jb25zdCBsb2Rhc2hUZW1wbGF0ZVNldHRpbmc6IE5vbk51bGxhYmxlPFBhcmFtZXRlcnM8dHlwZW9mIF8udGVtcGxhdGU+WzFdPiA9IHtcbiAgaW50ZXJwb2xhdGU6IC9cXCRfXyhbXFxzXFxTXSs/KV9fXFwkL2dcbn07XG4vKipcbiAqIFRoZSB0ZW1wbGF0ZSBmaWxlIG5hbWUgYW5kIGRpcmVjdG9yeSBuYW1lIGlzIHJlcGxhY2VkIGJ5IHJlZ3VsYXIgZXhwcmVzc2lvbixcbiAqIGZpbGUgbmFtZSBzdWZmaXggaXMgcmVtb3ZlZCwgdGhlcmVmb3IgeW91IHNob3VsZCB1c2UgYSBkb3VibGUgc3VmZml4IGFzIGEgdGVtcGxhdGVcbiAqIGZpbGUgbmFtZSAobGlrZSAnaGVsbG93LnRzLnR4dCcgd2lsbCBiZWNvbWUgJ2hlbGxvdy50cycpLlxuICogXG4gKiBUaGUgdGVtcGxhdGUgZmlsZSBjb250ZW50IGlzIHJlcGxhY2UgYnkgbG9kYXNoIHRlbXBsYXRlIGZ1bmN0aW9uXG4gKiBAcGFyYW0gdGVtcGxEaXIgXG4gKiBAcGFyYW0gdGFyZ2V0UGF0aCBcbiAqIEBwYXJhbSByZXBsYWNlbWVudCBcbiAqIEBwYXJhbSBvcHQgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdlbmVyYXRlU3RydWN0dXJlKFxuICB0ZW1wbERpcjogc3RyaW5nLCB0YXJnZXRQYXRoOiBzdHJpbmcsIHJlcGxhY2VtZW50OiBUZW1wbFJlcGxhY2VtZW50LCBvcHQ6IEdlbmVyYXRlT3B0aW9uID0ge2RyeXJ1bjogZmFsc2V9KSB7XG4gIGlmIChyZXBsYWNlbWVudC5pbmNsdWRlVGV4dFR5cGUgPT0gbnVsbCkge1xuICAgIHJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSA9IC8oPzpbdGpdc3g/fHM/Y3NzfGpzb258eWFtbHx5bWx8aHRtbHxzdmcpJC87XG4gIH1cbiAgcmV0dXJuIF9yZWN1cnNlRGlyKHRlbXBsRGlyLCB0YXJnZXRQYXRoLCByZXBsYWNlbWVudCwgb3B0KS50b1Byb21pc2UoKTtcbn1cblxuZnVuY3Rpb24gX3JlY3Vyc2VEaXIodGVtcGxEaXI6IHN0cmluZywgdGFyZ2V0UGF0aDogc3RyaW5nLCByZXBsYWNlbWVudDogVGVtcGxSZXBsYWNlbWVudCxcbiAgb3B0OiBHZW5lcmF0ZU9wdGlvbiA9IHtkcnlydW46IGZhbHNlfSwgdGFyZ2V0SXNFbXB0eSA9IGZhbHNlKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgY29uc3QgZHJ5cnVuID0gISFvcHQuZHJ5cnVuO1xuICByZXR1cm4gZnJvbShwcm9taXNlcy5yZWFkZGlyKHRlbXBsRGlyKSkucGlwZShcbiAgICBtZXJnZU1hcChmaWxlcyA9PiBmcm9tKGZpbGVzKSksXG4gICAgbWVyZ2VNYXAoc3ViID0+IHtcbiAgICAgIGNvbnN0IGFic1N1YiA9IFBhdGgucmVzb2x2ZSh0ZW1wbERpciwgc3ViKTtcbiAgICAgIHJldHVybiBmcm9tKHByb21pc2VzLnN0YXQoYWJzU3ViKSkucGlwZShcbiAgICAgICAgbWVyZ2VNYXAoc3RhdGUgPT4ge1xuICAgICAgICAgIGlmIChzdGF0ZS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBsZXQgbmV3RGlyID0gc3ViO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbcmVnLCByZXBsXSBvZiByZXBsYWNlbWVudC5maWxlTWFwcGluZyB8fCBbXSkge1xuICAgICAgICAgICAgICBuZXdEaXIgPSBuZXdEaXIucmVwbGFjZShyZWcsIHJlcGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3RGlyID0gUGF0aC5yZXNvbHZlKHRhcmdldFBhdGgsIG5ld0Rpcik7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhuZXdEaXIsIGFic1N1Yik7XG4gICAgICAgICAgICBjb25zdCBkb25lJCA9IGRyeXJ1biA/IG9mKHVuZGVmaW5lZCkgOlxuICAgICAgICAgICAgICBmcm9tKGZzZS5ta2RpcnAoUGF0aC5yZXNvbHZlKHRhcmdldFBhdGgsIG5ld0RpcikpKTtcbiAgICAgICAgICAgIHJldHVybiBkb25lJC5waXBlKFxuICAgICAgICAgICAgICBtZXJnZU1hcCgoKSA9PiBfcmVjdXJzZURpcihhYnNTdWIsIG5ld0RpciwgcmVwbGFjZW1lbnQsIG9wdCwgdHJ1ZSkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV3RmlsZSA9IHN1YjtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3JlZywgcmVwbF0gb2YgcmVwbGFjZW1lbnQuZmlsZU1hcHBpbmcgfHwgW10pIHtcbiAgICAgICAgICAgICAgbmV3RmlsZSA9IG5ld0ZpbGUucmVwbGFjZShyZWcsIHJlcGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3RmlsZSA9IFBhdGgucmVzb2x2ZSh0YXJnZXRQYXRoLCBuZXdGaWxlLnNsaWNlKDAsIG5ld0ZpbGUubGFzdEluZGV4T2YoJy4nKSlcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcLihbXi4vXFxcXF0rKSQvLCAnLiQxJykpO1xuXG4gICAgICAgICAgICByZXR1cm4gZnJvbSgoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAodGFyZ2V0SXNFbXB0eSB8fCAhZXhpc3RzU3luYyhuZXdGaWxlKSkge1xuICAgICAgICAgICAgICAgIGlmICghZHJ5cnVuKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSEudGVzdChuZXdGaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlcy5jb3B5RmlsZShhYnNTdWIsIG5ld0ZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtwbGluayBnZW5dICR7Y2hhbGsuZ3JlZW4oUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpfSBpcyBjb3BpZWRgKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gYXdhaXQgcHJvbWlzZXMucmVhZEZpbGUoYWJzU3ViLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gXy50ZW1wbGF0ZShjb250ZW50LCBsb2Rhc2hUZW1wbGF0ZVNldHRpbmcpKHJlcGxhY2VtZW50LnRleHRNYXBwaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEluIGZpbGUgJHthYnNTdWJ9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlcy53cml0ZUZpbGUobmV3RmlsZSwgY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3BsaW5rIGdlbl0gJHtjaGFsay5ncmVlbihQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSl9IGlzIHdyaXR0ZW5gKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3BsaW5rIGdlbl0gJHtjaGFsay5ncmVlbihQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSl9IGlzIGNyZWF0ZWRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1twbGluayBnZW5dIHRhcmdldCBmaWxlIGFscmVhZHkgZXhpc3RzOicsIFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KVxuICApO1xufVxuIl19