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
const log4js_1 = require("log4js");
const log = log4js_1.getLogger('plink.template-gen');
const lodashTemplateSetting = {
    interpolate: /\$__([\s\S]+?)__\$/g,
    evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
    escape: /<%-([\s\S]+?)%>/g
    // evaluate: /<%([\s\S]+?)%>/g,
    // interpolate: /<%=([\s\S]+?)%>/g,
    // variable: '',
    // imports: {_: lodash}
};
/**
 * The template file name and directory name is replaced by regular expression,
 * file name suffix is removed, therefor you should use a double suffix as a template
 * file name (like 'hellow.ts.txt' will become 'hellow.ts').
 *
 * lodash template setting:
 * - interpolate: /\$__([\s\S]+?)__\$/g,
 * - evaluate: /\/\*<%([\s\S]+?)%>\*\//g,
 *
 * The template file content is replace by lodash template function
 * @param templDir
 * @param targetDir
 * @param replacement
 * @param opt
 */
function generateStructure(templDir, targetDir, replacement, opt = { dryrun: false }) {
    if (replacement.includeTextType == null) {
        replacement.includeTextType = /(?:[tj]sx?|s?css|json|yaml|yml|html|svg)$/;
    }
    if (!opt.dryrun)
        fs_extra_1.default.mkdirpSync(targetDir);
    return _recurseDir(templDir, targetDir, replacement, opt).toPromise();
}
exports.default = generateStructure;
function _recurseDir(templDir, targetDir, replacement, opt = { dryrun: false }, targetIsEmpty = false) {
    const dryrun = !!opt.dryrun;
    return rxjs_1.from(fs_1.promises.readdir(templDir)).pipe(operators_1.mergeMap(files => rxjs_1.from(files)), operators_1.mergeMap(sub => {
        const absSub = path_1.default.resolve(templDir, sub);
        return rxjs_1.from(fs_1.promises.stat(absSub)).pipe(operators_1.mergeMap(state => {
            if (state.isDirectory()) {
                let newDir = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newDir = newDir.replace(reg, repl);
                }
                newDir = path_1.default.resolve(targetDir, newDir);
                // console.log(newDir, absSub);
                const done$ = dryrun ? rxjs_1.of(undefined) :
                    rxjs_1.from(fs_extra_1.default.mkdirp(path_1.default.resolve(targetDir, newDir)));
                return done$.pipe(operators_1.mergeMap(() => _recurseDir(absSub, newDir, replacement, opt, true)));
            }
            else {
                let newFile = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newFile = newFile.replace(reg, repl);
                }
                newFile = path_1.default.resolve(targetDir, opt.keepFileSuffix ? newFile : newFile.replace(/\.([^./\\]+)$/, ''));
                return (() => __awaiter(this, void 0, void 0, function* () {
                    if (targetIsEmpty || !fs_1.existsSync(newFile)) {
                        if (!dryrun) {
                            if (!replacement.includeTextType.test(newFile)) {
                                yield fs_1.promises.copyFile(absSub, newFile);
                                // tslint:disable-next-line: no-console
                                log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is copied`);
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
                                log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is written`);
                            }
                        }
                        else {
                            // tslint:disable-next-line: no-console
                            log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
                        }
                    }
                    else {
                        // tslint:disable-next-line: no-console
                        log.info('target file already exists:', path_1.default.relative(path_1.default.resolve(), newFile));
                    }
                }))();
            }
        }));
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFzQjVDLE1BQU0scUJBQXFCLEdBQWtEO0lBQzNFLFdBQVcsRUFBRSxxQkFBcUI7SUFDbEMsUUFBUSxFQUFFLHlCQUF5QjtJQUNuQyxNQUFNLEVBQUUsa0JBQWtCO0lBQzFCLCtCQUErQjtJQUMvQixtQ0FBbUM7SUFDbkMsZ0JBQWdCO0lBQ2hCLHVCQUF1QjtDQUN4QixDQUFDO0FBQ0Y7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxTQUF3QixpQkFBaUIsQ0FDdkMsUUFBZ0IsRUFBRSxTQUFpQixFQUFFLFdBQTZCLEVBQUUsTUFBc0IsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDO0lBQ3pHLElBQUksV0FBVyxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7UUFDdkMsV0FBVyxDQUFDLGVBQWUsR0FBRywyQ0FBMkMsQ0FBQztLQUMzRTtJQUNELElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTTtRQUNiLGtCQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVCLE9BQU8sV0FBVyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3hFLENBQUM7QUFSRCxvQ0FRQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsU0FBaUIsRUFBRSxXQUE2QixFQUNyRixNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsRUFBRSxhQUFh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LENBQUMsT0FBTyxFQUFFLHFCQUFxQixDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lDQUMvRTtnQ0FBQyxPQUFPLENBQUMsRUFBRTtvQ0FDVixPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsTUFBTSxFQUFFLENBQUMsQ0FBQztvQ0FDbkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQ0FDbEI7Z0NBQ0QsTUFBTSxhQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDM0MsdUNBQXVDO2dDQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzs2QkFDOUU7eUJBQ0Y7NkJBQU07NEJBQ0wsdUNBQXVDOzRCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzt5QkFDOUU7cUJBQ0Y7eUJBQU07d0JBQ0wsdUNBQXVDO3dCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2pGO2dCQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQzthQUNOO1FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Byb21pc2VzLCBleGlzdHNTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsudGVtcGxhdGUtZ2VuJyk7XG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsUmVwbGFjZW1lbnQge1xuICBmaWxlTWFwcGluZz86IFtSZWdFeHAsIHN0cmluZ11bXTtcbiAgLyoqIGxvZGFoIHRlbXBsYXRlICovXG4gIHRleHRNYXBwaW5nPzoge1trZXk6IHN0cmluZ106IGFueX07XG4gIC8qKiBTdWZmaXggbmFtZSBvZiB0YXJnZXQgZmlsZSwgZGVmYXVsdDogLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLyAqL1xuICBpbmNsdWRlVGV4dFR5cGU/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVPcHRpb24ge1xuICBkcnlydW4/OiBib29sZWFuO1xuICAvKiogQnkgZGVmYXVsdCwgYWZ0ZXIgY29weWluZyBhbGwgdGVtcGxhdGUgZmlsZXMgdG8gdGFyZ2V0IGRpcmVjdG9yeSwgZmlsZSBuYW1lIHN1ZmZpeCB3aWxsIGJlIHRyaW1lZCxcbiAgICogIGUuZy5cbiAgICogXG4gICAqICBJZiB0aGUgdGVtcGxhdGUgZmlsZSBpcyBuYW1lZCBcImZvb2Jhci50cy50eHRcIiwgdGhlbiBpdCB3aWxsIGJlY29tZSBcImZvb2Jhci50c1wiIGluIHRhcmdldCBkaXJlY3RvcnkuXG4gICAqIFxuICAgKi9cbiAga2VlcEZpbGVTdWZmaXg/OiBib29sZWFuO1xuICAvKiogb3ZlcndyaXRlIGV4aXN0aW5nIGZpbGUgKi9cbiAgLy8gb3ZlcndyaXRlPzogYm9vbGVhbjtcbn1cblxuY29uc3QgbG9kYXNoVGVtcGxhdGVTZXR0aW5nOiBOb25OdWxsYWJsZTxQYXJhbWV0ZXJzPHR5cGVvZiBfLnRlbXBsYXRlPlsxXT4gPSB7XG4gIGludGVycG9sYXRlOiAvXFwkX18oW1xcc1xcU10rPylfX1xcJC9nLFxuICBldmFsdWF0ZTogL1xcL1xcKjwlKFtcXHNcXFNdKz8pJT5cXCpcXC8vZyxcbiAgZXNjYXBlOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICAvLyBldmFsdWF0ZTogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gaW50ZXJwb2xhdGU6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAvLyB2YXJpYWJsZTogJycsXG4gIC8vIGltcG9ydHM6IHtfOiBsb2Rhc2h9XG59O1xuLyoqXG4gKiBUaGUgdGVtcGxhdGUgZmlsZSBuYW1lIGFuZCBkaXJlY3RvcnkgbmFtZSBpcyByZXBsYWNlZCBieSByZWd1bGFyIGV4cHJlc3Npb24sXG4gKiBmaWxlIG5hbWUgc3VmZml4IGlzIHJlbW92ZWQsIHRoZXJlZm9yIHlvdSBzaG91bGQgdXNlIGEgZG91YmxlIHN1ZmZpeCBhcyBhIHRlbXBsYXRlXG4gKiBmaWxlIG5hbWUgKGxpa2UgJ2hlbGxvdy50cy50eHQnIHdpbGwgYmVjb21lICdoZWxsb3cudHMnKS5cbiAqIFxuICogbG9kYXNoIHRlbXBsYXRlIHNldHRpbmc6XG4gKiAtIGludGVycG9sYXRlOiAvXFwkX18oW1xcc1xcU10rPylfX1xcJC9nLFxuICogLSBldmFsdWF0ZTogL1xcL1xcKjwlKFtcXHNcXFNdKz8pJT5cXCpcXC8vZyxcbiAqIFxuICogVGhlIHRlbXBsYXRlIGZpbGUgY29udGVudCBpcyByZXBsYWNlIGJ5IGxvZGFzaCB0ZW1wbGF0ZSBmdW5jdGlvblxuICogQHBhcmFtIHRlbXBsRGlyIFxuICogQHBhcmFtIHRhcmdldERpciBcbiAqIEBwYXJhbSByZXBsYWNlbWVudCBcbiAqIEBwYXJhbSBvcHQgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdlbmVyYXRlU3RydWN0dXJlKFxuICB0ZW1wbERpcjogc3RyaW5nLCB0YXJnZXREaXI6IHN0cmluZywgcmVwbGFjZW1lbnQ6IFRlbXBsUmVwbGFjZW1lbnQsIG9wdDogR2VuZXJhdGVPcHRpb24gPSB7ZHJ5cnVuOiBmYWxzZX0pIHtcbiAgaWYgKHJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSA9PSBudWxsKSB7XG4gICAgcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlID0gLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLztcbiAgfVxuICBpZiAoIW9wdC5kcnlydW4pXG4gICAgZnNlLm1rZGlycFN5bmModGFyZ2V0RGlyKTtcbiAgcmV0dXJuIF9yZWN1cnNlRGlyKHRlbXBsRGlyLCB0YXJnZXREaXIsIHJlcGxhY2VtZW50LCBvcHQpLnRvUHJvbWlzZSgpO1xufVxuXG5mdW5jdGlvbiBfcmVjdXJzZURpcih0ZW1wbERpcjogc3RyaW5nLCB0YXJnZXREaXI6IHN0cmluZywgcmVwbGFjZW1lbnQ6IFRlbXBsUmVwbGFjZW1lbnQsXG4gIG9wdDogR2VuZXJhdGVPcHRpb24gPSB7ZHJ5cnVuOiBmYWxzZX0sIHRhcmdldElzRW1wdHkgPSBmYWxzZSk6IE9ic2VydmFibGU8YW55PiB7XG4gIGNvbnN0IGRyeXJ1biA9ICEhb3B0LmRyeXJ1bjtcbiAgcmV0dXJuIGZyb20ocHJvbWlzZXMucmVhZGRpcih0ZW1wbERpcikpLnBpcGUoXG4gICAgbWVyZ2VNYXAoZmlsZXMgPT4gZnJvbShmaWxlcykpLFxuICAgIG1lcmdlTWFwKHN1YiA9PiB7XG4gICAgICBjb25zdCBhYnNTdWIgPSBQYXRoLnJlc29sdmUodGVtcGxEaXIsIHN1Yik7XG4gICAgICByZXR1cm4gZnJvbShwcm9taXNlcy5zdGF0KGFic1N1YikpLnBpcGUoXG4gICAgICAgIG1lcmdlTWFwKHN0YXRlID0+IHtcbiAgICAgICAgICBpZiAoc3RhdGUuaXNEaXJlY3RvcnkoKSkge1xuICAgICAgICAgICAgbGV0IG5ld0RpciA9IHN1YjtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3JlZywgcmVwbF0gb2YgcmVwbGFjZW1lbnQuZmlsZU1hcHBpbmcgfHwgW10pIHtcbiAgICAgICAgICAgICAgbmV3RGlyID0gbmV3RGlyLnJlcGxhY2UocmVnLCByZXBsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld0RpciA9IFBhdGgucmVzb2x2ZSh0YXJnZXREaXIsIG5ld0Rpcik7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhuZXdEaXIsIGFic1N1Yik7XG4gICAgICAgICAgICBjb25zdCBkb25lJCA9IGRyeXJ1biA/IG9mKHVuZGVmaW5lZCkgOlxuICAgICAgICAgICAgICBmcm9tKGZzZS5ta2RpcnAoUGF0aC5yZXNvbHZlKHRhcmdldERpciwgbmV3RGlyKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGRvbmUkLnBpcGUoXG4gICAgICAgICAgICAgIG1lcmdlTWFwKCgpID0+IF9yZWN1cnNlRGlyKGFic1N1YiwgbmV3RGlyLCByZXBsYWNlbWVudCwgb3B0LCB0cnVlKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBuZXdGaWxlID0gc3ViO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbcmVnLCByZXBsXSBvZiByZXBsYWNlbWVudC5maWxlTWFwcGluZyB8fCBbXSkge1xuICAgICAgICAgICAgICBuZXdGaWxlID0gbmV3RmlsZS5yZXBsYWNlKHJlZywgcmVwbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdGaWxlID0gUGF0aC5yZXNvbHZlKHRhcmdldERpcixcbiAgICAgICAgICAgICAgb3B0LmtlZXBGaWxlU3VmZml4ID8gbmV3RmlsZSA6IG5ld0ZpbGUucmVwbGFjZSgvXFwuKFteLi9cXFxcXSspJC8sICcnKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgcmV0dXJuIChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0YXJnZXRJc0VtcHR5IHx8ICFleGlzdHNTeW5jKG5ld0ZpbGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkcnlydW4pIHtcbiAgICAgICAgICAgICAgICAgIGlmICghcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlIS50ZXN0KG5ld0ZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2VzLmNvcHlGaWxlKGFic1N1YiwgbmV3RmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY29waWVkYCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHByb21pc2VzLnJlYWRGaWxlKGFic1N1YiwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IF8udGVtcGxhdGUoY29udGVudCwgbG9kYXNoVGVtcGxhdGVTZXR0aW5nKShyZXBsYWNlbWVudC50ZXh0TWFwcGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBJbiBmaWxlICR7YWJzU3VifWApO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZXMud3JpdGVGaWxlKG5ld0ZpbGUsIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYCR7Y2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSl9IGlzIHdyaXR0ZW5gKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY3JlYXRlZGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygndGFyZ2V0IGZpbGUgYWxyZWFkeSBleGlzdHM6JywgUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKTtcbn1cbiJdfQ==