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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFvQjVDLE1BQU0scUJBQXFCLEdBQWtEO0lBQzNFLFdBQVcsRUFBRSxxQkFBcUI7SUFDbEMsUUFBUSxFQUFFLHlCQUF5QjtDQU1wQyxDQUFDO0FBQ0Y7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxTQUF3QixpQkFBaUIsQ0FDdkMsUUFBZ0IsRUFBRSxTQUFpQixFQUFFLFdBQTZCLEVBQUUsTUFBc0IsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDO0lBQ3pHLElBQUksV0FBVyxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7UUFDdkMsV0FBVyxDQUFDLGVBQWUsR0FBRywyQ0FBMkMsQ0FBQztLQUMzRTtJQUNELGtCQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzFCLE9BQU8sV0FBVyxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3hFLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsU0FBaUIsRUFBRSxXQUE2QixFQUNyRixNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsRUFBRSxhQUFhLEdBQUcsS0FBSztJQUM1RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUM1QixPQUFPLFdBQUksQ0FBQyxhQUFRLENBQUMsT0FBTyxDQUFDLFFB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SyxDQUFDLFdBQVcsTUFBTSxFQUFFLENBQUMsQ0FBQztvQ0FDbkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQ0FDbEI7Z0NBQ0QsTUFBTSxhQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDM0MsdUNBQXVDO2dDQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzs2QkFDOUU7eUJBQ0Y7NkJBQU07NEJBQ0wsdUNBQXVDOzRCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzt5QkFDOUU7cUJBQ0Y7eUJBQU07d0JBQ0wsdUNBQXVDO3dCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2pGO2dCQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQzthQUNOO1FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge3Byb21pc2VzLCBleGlzdHNTeW5jfSBmcm9tICdmcyc7XG5pbXBvcnQgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7ZnJvbSwgT2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttZXJnZU1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsudGVtcGxhdGUtZ2VuJyk7XG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsUmVwbGFjZW1lbnQge1xuICBmaWxlTWFwcGluZz86IFtSZWdFeHAsIHN0cmluZ11bXTtcbiAgLyoqIGxvZGFoIHRlbXBsYXRlICovXG4gIHRleHRNYXBwaW5nPzoge1trZXk6IHN0cmluZ106IHN0cmluZ307XG4gIC8qKiBTdWZmaXggbmFtZSBvZiB0YXJnZXQgZmlsZSwgZGVmYXVsdDogLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLyAqL1xuICBpbmNsdWRlVGV4dFR5cGU/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2VuZXJhdGVPcHRpb24ge1xuICBkcnlydW4/OiBib29sZWFuO1xuICAvKiogQnkgZGVmYXVsdCwgYWZ0ZXIgY29weWluZyBhbGwgdGVtcGxhdGUgZmlsZXMgdG8gdGFyZ2V0IGRpcmVjdG9yeSwgZmlsZSBuYW1lIHN1ZmZpeCB3aWxsIGJlIHRyaW1lZCxcbiAgICogIGUuZy5cbiAgICogXG4gICAqICBJZiB0aGUgdGVtcGxhdGUgZmlsZSBpcyBuYW1lZCBcImZvb2Jhci50cy50eHRcIiwgdGhlbiBpdCB3aWxsIGJlY29tZSBcImZvb2Jhci50c1wiIGluIHRhcmdldCBkaXJlY3RvcnkuXG4gICAqIFxuICAgKi9cbiAga2VlcEZpbGVTdWZmaXg/OiBib29sZWFuO1xufVxuXG5jb25zdCBsb2Rhc2hUZW1wbGF0ZVNldHRpbmc6IE5vbk51bGxhYmxlPFBhcmFtZXRlcnM8dHlwZW9mIF8udGVtcGxhdGU+WzFdPiA9IHtcbiAgaW50ZXJwb2xhdGU6IC9cXCRfXyhbXFxzXFxTXSs/KV9fXFwkL2csXG4gIGV2YWx1YXRlOiAvXFwvXFwqPCUoW1xcc1xcU10rPyklPlxcKlxcLy9nLFxuICAvLyBlc2NhcGU6IC88JS0oW1xcc1xcU10rPyklPi9nLFxuICAvLyBldmFsdWF0ZTogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gaW50ZXJwb2xhdGU6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAvLyB2YXJpYWJsZTogJycsXG4gIC8vIGltcG9ydHM6IHtfOiBsb2Rhc2h9XG59O1xuLyoqXG4gKiBUaGUgdGVtcGxhdGUgZmlsZSBuYW1lIGFuZCBkaXJlY3RvcnkgbmFtZSBpcyByZXBsYWNlZCBieSByZWd1bGFyIGV4cHJlc3Npb24sXG4gKiBmaWxlIG5hbWUgc3VmZml4IGlzIHJlbW92ZWQsIHRoZXJlZm9yIHlvdSBzaG91bGQgdXNlIGEgZG91YmxlIHN1ZmZpeCBhcyBhIHRlbXBsYXRlXG4gKiBmaWxlIG5hbWUgKGxpa2UgJ2hlbGxvdy50cy50eHQnIHdpbGwgYmVjb21lICdoZWxsb3cudHMnKS5cbiAqIFxuICogbG9kYXNoIHRlbXBsYXRlIHNldHRpbmc6XG4gKiAtIGludGVycG9sYXRlOiAvXFwkX18oW1xcc1xcU10rPylfX1xcJC9nLFxuICogLSBldmFsdWF0ZTogL1xcL1xcKjwlKFtcXHNcXFNdKz8pJT5cXCpcXC8vZyxcbiAqIFxuICogVGhlIHRlbXBsYXRlIGZpbGUgY29udGVudCBpcyByZXBsYWNlIGJ5IGxvZGFzaCB0ZW1wbGF0ZSBmdW5jdGlvblxuICogQHBhcmFtIHRlbXBsRGlyIFxuICogQHBhcmFtIHRhcmdldERpciBcbiAqIEBwYXJhbSByZXBsYWNlbWVudCBcbiAqIEBwYXJhbSBvcHQgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdlbmVyYXRlU3RydWN0dXJlKFxuICB0ZW1wbERpcjogc3RyaW5nLCB0YXJnZXREaXI6IHN0cmluZywgcmVwbGFjZW1lbnQ6IFRlbXBsUmVwbGFjZW1lbnQsIG9wdDogR2VuZXJhdGVPcHRpb24gPSB7ZHJ5cnVuOiBmYWxzZX0pIHtcbiAgaWYgKHJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSA9PSBudWxsKSB7XG4gICAgcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlID0gLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLztcbiAgfVxuICBmc2UubWtkaXJwU3luYyh0YXJnZXREaXIpO1xuICByZXR1cm4gX3JlY3Vyc2VEaXIodGVtcGxEaXIsIHRhcmdldERpciwgcmVwbGFjZW1lbnQsIG9wdCkudG9Qcm9taXNlKCk7XG59XG5cbmZ1bmN0aW9uIF9yZWN1cnNlRGlyKHRlbXBsRGlyOiBzdHJpbmcsIHRhcmdldERpcjogc3RyaW5nLCByZXBsYWNlbWVudDogVGVtcGxSZXBsYWNlbWVudCxcbiAgb3B0OiBHZW5lcmF0ZU9wdGlvbiA9IHtkcnlydW46IGZhbHNlfSwgdGFyZ2V0SXNFbXB0eSA9IGZhbHNlKTogT2JzZXJ2YWJsZTxhbnk+IHtcbiAgY29uc3QgZHJ5cnVuID0gISFvcHQuZHJ5cnVuO1xuICByZXR1cm4gZnJvbShwcm9taXNlcy5yZWFkZGlyKHRlbXBsRGlyKSkucGlwZShcbiAgICBtZXJnZU1hcChmaWxlcyA9PiBmcm9tKGZpbGVzKSksXG4gICAgbWVyZ2VNYXAoc3ViID0+IHtcbiAgICAgIGNvbnN0IGFic1N1YiA9IFBhdGgucmVzb2x2ZSh0ZW1wbERpciwgc3ViKTtcbiAgICAgIHJldHVybiBmcm9tKHByb21pc2VzLnN0YXQoYWJzU3ViKSkucGlwZShcbiAgICAgICAgbWVyZ2VNYXAoc3RhdGUgPT4ge1xuICAgICAgICAgIGlmIChzdGF0ZS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICBsZXQgbmV3RGlyID0gc3ViO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbcmVnLCByZXBsXSBvZiByZXBsYWNlbWVudC5maWxlTWFwcGluZyB8fCBbXSkge1xuICAgICAgICAgICAgICBuZXdEaXIgPSBuZXdEaXIucmVwbGFjZShyZWcsIHJlcGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3RGlyID0gUGF0aC5yZXNvbHZlKHRhcmdldERpciwgbmV3RGlyKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5ld0RpciwgYWJzU3ViKTtcbiAgICAgICAgICAgIGNvbnN0IGRvbmUkID0gZHJ5cnVuID8gb2YodW5kZWZpbmVkKSA6XG4gICAgICAgICAgICAgIGZyb20oZnNlLm1rZGlycChQYXRoLnJlc29sdmUodGFyZ2V0RGlyLCBuZXdEaXIpKSk7XG4gICAgICAgICAgICByZXR1cm4gZG9uZSQucGlwZShcbiAgICAgICAgICAgICAgbWVyZ2VNYXAoKCkgPT4gX3JlY3Vyc2VEaXIoYWJzU3ViLCBuZXdEaXIsIHJlcGxhY2VtZW50LCBvcHQsIHRydWUpKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IG5ld0ZpbGUgPSBzdWI7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxdIG9mIHJlcGxhY2VtZW50LmZpbGVNYXBwaW5nIHx8IFtdKSB7XG4gICAgICAgICAgICAgIG5ld0ZpbGUgPSBuZXdGaWxlLnJlcGxhY2UocmVnLCByZXBsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld0ZpbGUgPSBQYXRoLnJlc29sdmUodGFyZ2V0RGlyLFxuICAgICAgICAgICAgICBvcHQua2VlcEZpbGVTdWZmaXggPyBuZXdGaWxlIDogbmV3RmlsZS5yZXBsYWNlKC9cXC4oW14uL1xcXFxdKykkLywgJycpXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICByZXR1cm4gKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgaWYgKHRhcmdldElzRW1wdHkgfHwgIWV4aXN0c1N5bmMobmV3RmlsZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRyeXJ1bikge1xuICAgICAgICAgICAgICAgICAgaWYgKCFyZXBsYWNlbWVudC5pbmNsdWRlVGV4dFR5cGUhLnRlc3QobmV3RmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZXMuY29weUZpbGUoYWJzU3ViLCBuZXdGaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKGAke2NoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpfSBpcyBjb3BpZWRgKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gYXdhaXQgcHJvbWlzZXMucmVhZEZpbGUoYWJzU3ViLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gXy50ZW1wbGF0ZShjb250ZW50LCBsb2Rhc2hUZW1wbGF0ZVNldHRpbmcpKHJlcGxhY2VtZW50LnRleHRNYXBwaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEluIGZpbGUgJHthYnNTdWJ9YCk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlcy53cml0ZUZpbGUobmV3RmlsZSwgY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgd3JpdHRlbmApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKGAke2NoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpfSBpcyBjcmVhdGVkYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgIGxvZy5pbmZvKCd0YXJnZXQgZmlsZSBhbHJlYWR5IGV4aXN0czonLCBQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KVxuICApO1xufVxuIl19