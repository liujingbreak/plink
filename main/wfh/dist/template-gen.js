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
                }))());
            }
        }));
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFhNUMsTUFBTSxxQkFBcUIsR0FBa0Q7SUFDM0UsV0FBVyxFQUFFLHFCQUFxQjtJQUNsQyxRQUFRLEVBQUUseUJBQXlCO0NBTXBDLENBQUM7QUFDRjs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILFNBQXdCLGlCQUFpQixDQUN2QyxRQUFnQixFQUFFLFVBQWtCLEVBQUUsV0FBNkIsRUFBRSxNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7SUFDMUcsSUFBSSxXQUFXLENBQUMsZUFBZSxJQUFJLElBQUksRUFBRTtRQUN2QyxXQUFXLENBQUMsZUFBZSxHQUFHLDJDQUEyQyxDQUFDO0tBQzNFO0lBQ0QsT0FBTyxXQUFXLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDekUsQ0FBQztBQU5ELG9DQU1DO0FBRUQsU0FBUyxXQUFXLENBQUMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLFdBQTZCLEVBQ3RGLE1BQXNCLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxFQUFFLGFBQWEsR0FBRyxLQUFLO0lBQzVELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQzVCLE9BQU8sV0FBSSxDQUFDLGFBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzFDLG9CQUFRLENBQUMsS0FB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Q0FBQyxDQUFDO29DQUNuQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lDQUNsQjtnQ0FDRCxNQUFNLGFBQVEsQ0FBQyxTQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dDQUMzQyx1Q0FBdUM7Z0NBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDOzZCQUM5RTt5QkFDRjs2QkFBTTs0QkFDTCx1Q0FBdUM7NEJBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO3lCQUM5RTtxQkFDRjt5QkFBTTt3QkFDTCx1Q0FBdUM7d0JBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUUsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztxQkFDakY7Z0JBQ0gsQ0FBQyxDQUFBLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDUDtRQUNILENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtwcm9taXNlcywgZXhpc3RzU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2Zyb20sIE9ic2VydmFibGUsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnRlbXBsYXRlLWdlbicpO1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbFJlcGxhY2VtZW50IHtcbiAgZmlsZU1hcHBpbmc/OiBbUmVnRXhwLCBzdHJpbmddW107XG4gIC8qKiBsb2RhaCB0ZW1wbGF0ZSAqL1xuICB0ZXh0TWFwcGluZz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogU3VmZml4IG5hbWUgb2YgdGFyZ2V0IGZpbGUsIGRlZmF1bHQ6IC8oPzpbdGpdc3g/fHM/Y3NzfGpzb258eWFtbHx5bWx8aHRtbHxzdmcpJC8gKi9cbiAgaW5jbHVkZVRleHRUeXBlPzogUmVnRXhwO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9uIHtcbiAgZHJ5cnVuPzogYm9vbGVhbjtcbn1cblxuY29uc3QgbG9kYXNoVGVtcGxhdGVTZXR0aW5nOiBOb25OdWxsYWJsZTxQYXJhbWV0ZXJzPHR5cGVvZiBfLnRlbXBsYXRlPlsxXT4gPSB7XG4gIGludGVycG9sYXRlOiAvXFwkX18oW1xcc1xcU10rPylfX1xcJC9nLFxuICBldmFsdWF0ZTogL1xcL1xcKjwlKFtcXHNcXFNdKz8pJT5cXCpcXC8vZyxcbiAgLy8gZXNjYXBlOiAvPCUtKFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gZXZhbHVhdGU6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gIC8vIGludGVycG9sYXRlOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gdmFyaWFibGU6ICcnLFxuICAvLyBpbXBvcnRzOiB7XzogbG9kYXNofVxufTtcbi8qKlxuICogVGhlIHRlbXBsYXRlIGZpbGUgbmFtZSBhbmQgZGlyZWN0b3J5IG5hbWUgaXMgcmVwbGFjZWQgYnkgcmVndWxhciBleHByZXNzaW9uLFxuICogZmlsZSBuYW1lIHN1ZmZpeCBpcyByZW1vdmVkLCB0aGVyZWZvciB5b3Ugc2hvdWxkIHVzZSBhIGRvdWJsZSBzdWZmaXggYXMgYSB0ZW1wbGF0ZVxuICogZmlsZSBuYW1lIChsaWtlICdoZWxsb3cudHMudHh0JyB3aWxsIGJlY29tZSAnaGVsbG93LnRzJykuXG4gKiBcbiAqIGxvZGFzaCB0ZW1wbGF0ZSBzZXR0aW5nOlxuICogLSBpbnRlcnBvbGF0ZTogL1xcJF9fKFtcXHNcXFNdKz8pX19cXCQvZyxcbiAqIC0gZXZhbHVhdGU6IC9cXC9cXCo8JShbXFxzXFxTXSs/KSU+XFwqXFwvL2csXG4gKiBcbiAqIFRoZSB0ZW1wbGF0ZSBmaWxlIGNvbnRlbnQgaXMgcmVwbGFjZSBieSBsb2Rhc2ggdGVtcGxhdGUgZnVuY3Rpb25cbiAqIEBwYXJhbSB0ZW1wbERpciBcbiAqIEBwYXJhbSB0YXJnZXRQYXRoIFxuICogQHBhcmFtIHJlcGxhY2VtZW50IFxuICogQHBhcmFtIG9wdCBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2VuZXJhdGVTdHJ1Y3R1cmUoXG4gIHRlbXBsRGlyOiBzdHJpbmcsIHRhcmdldFBhdGg6IHN0cmluZywgcmVwbGFjZW1lbnQ6IFRlbXBsUmVwbGFjZW1lbnQsIG9wdDogR2VuZXJhdGVPcHRpb24gPSB7ZHJ5cnVuOiBmYWxzZX0pIHtcbiAgaWYgKHJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSA9PSBudWxsKSB7XG4gICAgcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlID0gLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLztcbiAgfVxuICByZXR1cm4gX3JlY3Vyc2VEaXIodGVtcGxEaXIsIHRhcmdldFBhdGgsIHJlcGxhY2VtZW50LCBvcHQpLnRvUHJvbWlzZSgpO1xufVxuXG5mdW5jdGlvbiBfcmVjdXJzZURpcih0ZW1wbERpcjogc3RyaW5nLCB0YXJnZXRQYXRoOiBzdHJpbmcsIHJlcGxhY2VtZW50OiBUZW1wbFJlcGxhY2VtZW50LFxuICBvcHQ6IEdlbmVyYXRlT3B0aW9uID0ge2RyeXJ1bjogZmFsc2V9LCB0YXJnZXRJc0VtcHR5ID0gZmFsc2UpOiBPYnNlcnZhYmxlPGFueT4ge1xuICBjb25zdCBkcnlydW4gPSAhIW9wdC5kcnlydW47XG4gIHJldHVybiBmcm9tKHByb21pc2VzLnJlYWRkaXIodGVtcGxEaXIpKS5waXBlKFxuICAgIG1lcmdlTWFwKGZpbGVzID0+IGZyb20oZmlsZXMpKSxcbiAgICBtZXJnZU1hcChzdWIgPT4ge1xuICAgICAgY29uc3QgYWJzU3ViID0gUGF0aC5yZXNvbHZlKHRlbXBsRGlyLCBzdWIpO1xuICAgICAgcmV0dXJuIGZyb20ocHJvbWlzZXMuc3RhdChhYnNTdWIpKS5waXBlKFxuICAgICAgICBtZXJnZU1hcChzdGF0ZSA9PiB7XG4gICAgICAgICAgaWYgKHN0YXRlLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGxldCBuZXdEaXIgPSBzdWI7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxdIG9mIHJlcGxhY2VtZW50LmZpbGVNYXBwaW5nIHx8IFtdKSB7XG4gICAgICAgICAgICAgIG5ld0RpciA9IG5ld0Rpci5yZXBsYWNlKHJlZywgcmVwbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdEaXIgPSBQYXRoLnJlc29sdmUodGFyZ2V0UGF0aCwgbmV3RGlyKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5ld0RpciwgYWJzU3ViKTtcbiAgICAgICAgICAgIGNvbnN0IGRvbmUkID0gZHJ5cnVuID8gb2YodW5kZWZpbmVkKSA6XG4gICAgICAgICAgICAgIGZyb20oZnNlLm1rZGlycChQYXRoLnJlc29sdmUodGFyZ2V0UGF0aCwgbmV3RGlyKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGRvbmUkLnBpcGUoXG4gICAgICAgICAgICAgIG1lcmdlTWFwKCgpID0+IF9yZWN1cnNlRGlyKGFic1N1YiwgbmV3RGlyLCByZXBsYWNlbWVudCwgb3B0LCB0cnVlKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBuZXdGaWxlID0gc3ViO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbcmVnLCByZXBsXSBvZiByZXBsYWNlbWVudC5maWxlTWFwcGluZyB8fCBbXSkge1xuICAgICAgICAgICAgICBuZXdGaWxlID0gbmV3RmlsZS5yZXBsYWNlKHJlZywgcmVwbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdGaWxlID0gUGF0aC5yZXNvbHZlKHRhcmdldFBhdGgsIG5ld0ZpbGUuc2xpY2UoMCwgbmV3RmlsZS5sYXN0SW5kZXhPZignLicpKVxuICAgICAgICAgICAgICAucmVwbGFjZSgvXFwuKFteLi9cXFxcXSspJC8sICcuJDEnKSk7XG5cbiAgICAgICAgICAgIHJldHVybiBmcm9tKChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0YXJnZXRJc0VtcHR5IHx8ICFleGlzdHNTeW5jKG5ld0ZpbGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkcnlydW4pIHtcbiAgICAgICAgICAgICAgICAgIGlmICghcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlIS50ZXN0KG5ld0ZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2VzLmNvcHlGaWxlKGFic1N1YiwgbmV3RmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY29waWVkYCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHByb21pc2VzLnJlYWRGaWxlKGFic1N1YiwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IF8udGVtcGxhdGUoY29udGVudCwgbG9kYXNoVGVtcGxhdGVTZXR0aW5nKShyZXBsYWNlbWVudC50ZXh0TWFwcGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBJbiBmaWxlICR7YWJzU3VifWApO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZXMud3JpdGVGaWxlKG5ld0ZpbGUsIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYCR7Y2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSl9IGlzIHdyaXR0ZW5gKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY3JlYXRlZGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygndGFyZ2V0IGZpbGUgYWxyZWFkeSBleGlzdHM6JywgUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pXG4gICk7XG59XG4iXX0=