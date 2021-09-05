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
const log = (0, log4js_1.getLogger)('plink.template-gen');
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
    return (0, rxjs_1.from)(fs_1.promises.readdir(templDir)).pipe((0, operators_1.mergeMap)(files => (0, rxjs_1.from)(files)), (0, operators_1.mergeMap)(sub => {
        const absSub = path_1.default.resolve(templDir, sub);
        return (0, rxjs_1.from)(fs_1.promises.stat(absSub)).pipe((0, operators_1.mergeMap)(state => {
            if (state.isDirectory()) {
                let newDir = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newDir = newDir.replace(reg, repl);
                }
                newDir = path_1.default.resolve(targetDir, newDir);
                // console.log(newDir, absSub);
                const done$ = dryrun ? (0, rxjs_1.of)(undefined) :
                    (0, rxjs_1.from)(fs_extra_1.default.mkdirp(path_1.default.resolve(targetDir, newDir)));
                return done$.pipe((0, operators_1.mergeMap)(() => _recurseDir(absSub, newDir, replacement, opt, true)));
            }
            else {
                let newFile = sub;
                for (const [reg, repl] of replacement.fileMapping || []) {
                    newFile = newFile.replace(reg, repl);
                }
                newFile = path_1.default.resolve(targetDir, opt.keepFileSuffix ? newFile : newFile.replace(/\.([^./\\]+)$/, ''));
                return (() => __awaiter(this, void 0, void 0, function* () {
                    if (targetIsEmpty || !(0, fs_1.existsSync)(newFile)) {
                        if (!dryrun) {
                            if (!replacement.includeTextType.test(newFile)) {
                                yield fs_1.promises.copyFile(absSub, newFile);
                                // eslint-disable-next-line no-console
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
                                // eslint-disable-next-line no-console
                                log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is written`);
                            }
                        }
                        else {
                            // eslint-disable-next-line no-console
                            log.info(`${chalk_1.default.cyan(path_1.default.relative(path_1.default.resolve(), newFile))} is created`);
                        }
                    }
                    else {
                        // eslint-disable-next-line no-console
                        log.info('target file already exists:', path_1.default.relative(path_1.default.resolve(), newFile));
                    }
                }))();
            }
        }));
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQXNCNUMsTUFBTSxxQkFBcUIsR0FBa0Q7SUFDM0UsV0FBVyxFQUFFLHFCQUFxQjtJQUNsQyxRQUFRLEVBQUUseUJBQXlCO0lBQ25DLE1BQU0sRUFBRSxrQkFBa0I7SUFDMUIsK0JBQStCO0lBQy9CLG1DQUFtQztJQUNuQyxnQkFBZ0I7SUFDaEIsdUJBQXVCO0NBQ3hCLENBQUM7QUFDRjs7Ozs7Ozs7Ozs7Ozs7R0FjRztBQUNILFNBQXdCLGlCQUFpQixDQUN2QyxRQUFnQixFQUFFLFNBQWlCLEVBQUUsV0FBNkIsRUFBRSxNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7SUFDekcsSUFBSSxXQUFXLENBQUMsZUFBZSxJQUFJLElBQUksRUFBRTtRQUN2QyxXQUFXLENBQUMsZUFBZSxHQUFHLDJDQUEyQyxDQUFDO0tBQzNFO0lBQ0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNO1FBQ2Isa0JBQUcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDNUIsT0FBTyxXQUFXLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDeEUsQ0FBQztBQVJELG9DQVFDO0FBRUQsU0FBUyxXQUFXLENBQUMsUUFBZ0IsRUFBRSxTQUFpQixFQUFFLFdBQTZCLEVBQ3JGLE1BQXNCLEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQyxFQUFF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ZXhpc3RzU3luY30gZnJvbSAnZnMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2Zyb20sIE9ic2VydmFibGUsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWVyZ2VNYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnRlbXBsYXRlLWdlbicpO1xuZXhwb3J0IGludGVyZmFjZSBUZW1wbFJlcGxhY2VtZW50IHtcbiAgZmlsZU1hcHBpbmc/OiBbUmVnRXhwLCBzdHJpbmddW107XG4gIC8qKiBsb2RhaCB0ZW1wbGF0ZSAqL1xuICB0ZXh0TWFwcGluZz86IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuICAvKiogU3VmZml4IG5hbWUgb2YgdGFyZ2V0IGZpbGUsIGRlZmF1bHQ6IC8oPzpbdGpdc3g/fHM/Y3NzfGpzb258eWFtbHx5bWx8aHRtbHxzdmcpJC8gKi9cbiAgaW5jbHVkZVRleHRUeXBlPzogUmVnRXhwO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9uIHtcbiAgZHJ5cnVuPzogYm9vbGVhbjtcbiAgLyoqIEJ5IGRlZmF1bHQsIGFmdGVyIGNvcHlpbmcgYWxsIHRlbXBsYXRlIGZpbGVzIHRvIHRhcmdldCBkaXJlY3RvcnksIGZpbGUgbmFtZSBzdWZmaXggd2lsbCBiZSB0cmltZWQsXG4gICAqICBlLmcuXG4gICAqIFxuICAgKiAgSWYgdGhlIHRlbXBsYXRlIGZpbGUgaXMgbmFtZWQgXCJmb29iYXIudHMudHh0XCIsIHRoZW4gaXQgd2lsbCBiZWNvbWUgXCJmb29iYXIudHNcIiBpbiB0YXJnZXQgZGlyZWN0b3J5LlxuICAgKiBcbiAgICovXG4gIGtlZXBGaWxlU3VmZml4PzogYm9vbGVhbjtcbiAgLyoqIG92ZXJ3cml0ZSBleGlzdGluZyBmaWxlICovXG4gIC8vIG92ZXJ3cml0ZT86IGJvb2xlYW47XG59XG5cbmNvbnN0IGxvZGFzaFRlbXBsYXRlU2V0dGluZzogTm9uTnVsbGFibGU8UGFyYW1ldGVyczx0eXBlb2YgXy50ZW1wbGF0ZT5bMV0+ID0ge1xuICBpbnRlcnBvbGF0ZTogL1xcJF9fKFtcXHNcXFNdKz8pX19cXCQvZyxcbiAgZXZhbHVhdGU6IC9cXC9cXCo8JShbXFxzXFxTXSs/KSU+XFwqXFwvL2csXG4gIGVzY2FwZTogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgLy8gZXZhbHVhdGU6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gIC8vIGludGVycG9sYXRlOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gdmFyaWFibGU6ICcnLFxuICAvLyBpbXBvcnRzOiB7XzogbG9kYXNofVxufTtcbi8qKlxuICogVGhlIHRlbXBsYXRlIGZpbGUgbmFtZSBhbmQgZGlyZWN0b3J5IG5hbWUgaXMgcmVwbGFjZWQgYnkgcmVndWxhciBleHByZXNzaW9uLFxuICogZmlsZSBuYW1lIHN1ZmZpeCBpcyByZW1vdmVkLCB0aGVyZWZvciB5b3Ugc2hvdWxkIHVzZSBhIGRvdWJsZSBzdWZmaXggYXMgYSB0ZW1wbGF0ZVxuICogZmlsZSBuYW1lIChsaWtlICdoZWxsb3cudHMudHh0JyB3aWxsIGJlY29tZSAnaGVsbG93LnRzJykuXG4gKiBcbiAqIGxvZGFzaCB0ZW1wbGF0ZSBzZXR0aW5nOlxuICogLSBpbnRlcnBvbGF0ZTogL1xcJF9fKFtcXHNcXFNdKz8pX19cXCQvZyxcbiAqIC0gZXZhbHVhdGU6IC9cXC9cXCo8JShbXFxzXFxTXSs/KSU+XFwqXFwvL2csXG4gKiBcbiAqIFRoZSB0ZW1wbGF0ZSBmaWxlIGNvbnRlbnQgaXMgcmVwbGFjZSBieSBsb2Rhc2ggdGVtcGxhdGUgZnVuY3Rpb25cbiAqIEBwYXJhbSB0ZW1wbERpciBcbiAqIEBwYXJhbSB0YXJnZXREaXIgXG4gKiBAcGFyYW0gcmVwbGFjZW1lbnQgXG4gKiBAcGFyYW0gb3B0IFxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBnZW5lcmF0ZVN0cnVjdHVyZShcbiAgdGVtcGxEaXI6IHN0cmluZywgdGFyZ2V0RGlyOiBzdHJpbmcsIHJlcGxhY2VtZW50OiBUZW1wbFJlcGxhY2VtZW50LCBvcHQ6IEdlbmVyYXRlT3B0aW9uID0ge2RyeXJ1bjogZmFsc2V9KSB7XG4gIGlmIChyZXBsYWNlbWVudC5pbmNsdWRlVGV4dFR5cGUgPT0gbnVsbCkge1xuICAgIHJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSA9IC8oPzpbdGpdc3g/fHM/Y3NzfGpzb258eWFtbHx5bWx8aHRtbHxzdmcpJC87XG4gIH1cbiAgaWYgKCFvcHQuZHJ5cnVuKVxuICAgIGZzZS5ta2RpcnBTeW5jKHRhcmdldERpcik7XG4gIHJldHVybiBfcmVjdXJzZURpcih0ZW1wbERpciwgdGFyZ2V0RGlyLCByZXBsYWNlbWVudCwgb3B0KS50b1Byb21pc2UoKTtcbn1cblxuZnVuY3Rpb24gX3JlY3Vyc2VEaXIodGVtcGxEaXI6IHN0cmluZywgdGFyZ2V0RGlyOiBzdHJpbmcsIHJlcGxhY2VtZW50OiBUZW1wbFJlcGxhY2VtZW50LFxuICBvcHQ6IEdlbmVyYXRlT3B0aW9uID0ge2RyeXJ1bjogZmFsc2V9LCB0YXJnZXRJc0VtcHR5ID0gZmFsc2UpOiBPYnNlcnZhYmxlPGFueT4ge1xuICBjb25zdCBkcnlydW4gPSAhIW9wdC5kcnlydW47XG4gIHJldHVybiBmcm9tKHByb21pc2VzLnJlYWRkaXIodGVtcGxEaXIpKS5waXBlKFxuICAgIG1lcmdlTWFwKGZpbGVzID0+IGZyb20oZmlsZXMpKSxcbiAgICBtZXJnZU1hcChzdWIgPT4ge1xuICAgICAgY29uc3QgYWJzU3ViID0gUGF0aC5yZXNvbHZlKHRlbXBsRGlyLCBzdWIpO1xuICAgICAgcmV0dXJuIGZyb20ocHJvbWlzZXMuc3RhdChhYnNTdWIpKS5waXBlKFxuICAgICAgICBtZXJnZU1hcChzdGF0ZSA9PiB7XG4gICAgICAgICAgaWYgKHN0YXRlLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGxldCBuZXdEaXIgPSBzdWI7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxdIG9mIHJlcGxhY2VtZW50LmZpbGVNYXBwaW5nIHx8IFtdKSB7XG4gICAgICAgICAgICAgIG5ld0RpciA9IG5ld0Rpci5yZXBsYWNlKHJlZywgcmVwbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdEaXIgPSBQYXRoLnJlc29sdmUodGFyZ2V0RGlyLCBuZXdEaXIpO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2cobmV3RGlyLCBhYnNTdWIpO1xuICAgICAgICAgICAgY29uc3QgZG9uZSQgPSBkcnlydW4gPyBvZih1bmRlZmluZWQpIDpcbiAgICAgICAgICAgICAgZnJvbShmc2UubWtkaXJwKFBhdGgucmVzb2x2ZSh0YXJnZXREaXIsIG5ld0RpcikpKTtcbiAgICAgICAgICAgIHJldHVybiBkb25lJC5waXBlKFxuICAgICAgICAgICAgICBtZXJnZU1hcCgoKSA9PiBfcmVjdXJzZURpcihhYnNTdWIsIG5ld0RpciwgcmVwbGFjZW1lbnQsIG9wdCwgdHJ1ZSkpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZXQgbmV3RmlsZSA9IHN1YjtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3JlZywgcmVwbF0gb2YgcmVwbGFjZW1lbnQuZmlsZU1hcHBpbmcgfHwgW10pIHtcbiAgICAgICAgICAgICAgbmV3RmlsZSA9IG5ld0ZpbGUucmVwbGFjZShyZWcsIHJlcGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV3RmlsZSA9IFBhdGgucmVzb2x2ZSh0YXJnZXREaXIsXG4gICAgICAgICAgICAgIG9wdC5rZWVwRmlsZVN1ZmZpeCA/IG5ld0ZpbGUgOiBuZXdGaWxlLnJlcGxhY2UoL1xcLihbXi4vXFxcXF0rKSQvLCAnJylcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybiAoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICBpZiAodGFyZ2V0SXNFbXB0eSB8fCAhZXhpc3RzU3luYyhuZXdGaWxlKSkge1xuICAgICAgICAgICAgICAgIGlmICghZHJ5cnVuKSB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSEudGVzdChuZXdGaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwcm9taXNlcy5jb3B5RmlsZShhYnNTdWIsIG5ld0ZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY29waWVkYCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IGF3YWl0IHByb21pc2VzLnJlYWRGaWxlKGFic1N1YiwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IF8udGVtcGxhdGUoY29udGVudCwgbG9kYXNoVGVtcGxhdGVTZXR0aW5nKShyZXBsYWNlbWVudC50ZXh0TWFwcGluZyk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBJbiBmaWxlICR7YWJzU3VifWApO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcHJvbWlzZXMud3JpdGVGaWxlKG5ld0ZpbGUsIGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgJHtjaGFsay5jeWFuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgd3JpdHRlbmApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYCR7Y2hhbGsuY3lhbihQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSl9IGlzIGNyZWF0ZWRgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygndGFyZ2V0IGZpbGUgYWxyZWFkeSBleGlzdHM6JywgUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKTtcbn1cbiJdfQ==