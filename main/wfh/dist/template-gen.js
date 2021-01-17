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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVtcGxhdGUtZ2VuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvdGVtcGxhdGUtZ2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDJCQUF3QztBQUN4Qyx3REFBMkI7QUFDM0IsK0JBQTBDO0FBQzFDLDhDQUF3QztBQUN4QyxrREFBMEI7QUFDMUIsb0RBQXVCO0FBY3ZCLE1BQU0scUJBQXFCLEdBQWtEO0lBQzNFLFdBQVcsRUFBRSxxQkFBcUI7SUFDbEMsUUFBUSxFQUFFLHlCQUF5QjtDQU1wQyxDQUFDO0FBQ0Y7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxTQUF3QixpQkFBaUIsQ0FDdkMsUUFBZ0IsRUFBRSxVQUFrQixFQUFFLFdBQTZCLEVBQUUsTUFBc0IsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDO0lBQzFHLElBQUksV0FBVyxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7UUFDdkMsV0FBVyxDQUFDLGVBQWUsR0FBRywyQ0FBMkMsQ0FBQztLQUMzRTtJQUNELE9BQU8sV0FBVyxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pFLENBQUM7QUFORCxvQ0FNQztBQUVELFNBQVMsV0FBVyxDQUFDLFFBQWdCLEVBQUUsVUFBa0IsRUFBRSxXQUE2QixFQUN0RixNQUFzQixFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUMsRUFBRSxhQUFhLEdBQUcsS0FBSztJQUM1RCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUM1QixPQUFPLFdBQUksQ0FBQyxhQUFRLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUMxQyxvQkFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsV0FBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQzlCLG9CQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDYixNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzQyxPQUFPLFdBQUksQ0FBQyxhQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNyQyxvQkFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ2YsSUFBSSxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQ3ZCLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQztnQkFDakIsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLFdBQVcsQ0FBQyxXQUFXLElBQUksRUFBRSxFQUFFO29CQUN2RCxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7aUJBQ3BDO2dCQUNELE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDMUMsK0JBQStCO2dCQUMvQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUNwQyxXQUFJLENBQUMsa0JBQUcsQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCxPQUFPLEtBQUssQ0FBQyxJQUFJLENBQ2Ysb0JBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQ3BFLENBQUM7YUFDSDtpQkFBTTtnQkFDTCxJQUFJLE9BQU8sR0FBRyxHQUFHLENBQUM7Z0JBQ2xCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxXQUFXLENBQUMsV0FBVyxJQUFJLEVBQUUsRUFBRTtvQkFDdkQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUN0QztnQkFDRCxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztxQkFDMUUsT0FBTyxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUVwQyxPQUFPLFdBQUksQ0FBQyxDQUFDLEdBQVMsRUFBRTtvQkFDdEIsSUFBSSxhQUFhLElBQUksQ0FBQyxlQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7d0JBQ3pDLElBQUksQ0FBQyxNQUFNLEVBQUU7NEJBQ1gsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFnQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQ0FDL0MsTUFBTSxhQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDekMsdUNBQXVDO2dDQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQzs2QkFDN0Y7aUNBQU07Z0NBQ0wsSUFBSSxPQUFPLEdBQUcsTUFBTSxhQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDdkQsSUFBSTtvQ0FDRixPQUFPLEdBQUcsZ0JBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLHFCQUFxQixDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lDQUMvRTtnQ0FBQyxPQUFPLENBQUMsRUFBRTtvQ0FDVixPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsTUFBTSxFQUFFLENBQUMsQ0FBQztvQ0FDbkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQ0FDbEI7Z0NBQ0QsTUFBTSxhQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQ0FDM0MsdUNBQXVDO2dDQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzs2QkFDOUY7eUJBQ0Y7NkJBQU07NEJBQ0wsdUNBQXVDOzRCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsZUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQzt5QkFDOUY7cUJBQ0Y7eUJBQU07d0JBQ0wsdUNBQXVDO3dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxFQUFFLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7cUJBQ2hHO2dCQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ1A7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7cHJvbWlzZXMsIGV4aXN0c1N5bmN9IGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtmcm9tLCBPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGludGVyZmFjZSBUZW1wbFJlcGxhY2VtZW50IHtcbiAgZmlsZU1hcHBpbmc/OiBbUmVnRXhwLCBzdHJpbmddW107XG4gIC8qKiBsb2RhaCB0ZW1wbGF0ZSAqL1xuICB0ZXh0TWFwcGluZz86IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9O1xuICAvKiogU3VmZml4IG5hbWUgb2YgdGFyZ2V0IGZpbGUsIGRlZmF1bHQ6IC8oPzpbdGpdc3g/fHM/Y3NzfGpzb258eWFtbHx5bWx8aHRtbHxzdmcpJC8gKi9cbiAgaW5jbHVkZVRleHRUeXBlPzogUmVnRXhwO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdlbmVyYXRlT3B0aW9uIHtcbiAgZHJ5cnVuPzogYm9vbGVhbjtcbn1cblxuY29uc3QgbG9kYXNoVGVtcGxhdGVTZXR0aW5nOiBOb25OdWxsYWJsZTxQYXJhbWV0ZXJzPHR5cGVvZiBfLnRlbXBsYXRlPlsxXT4gPSB7XG4gIGludGVycG9sYXRlOiAvXFwkX18oW1xcc1xcU10rPylfX1xcJC9nLFxuICBldmFsdWF0ZTogL1xcL1xcKjwlKFtcXHNcXFNdKz8pJT5cXCpcXC8vZyxcbiAgLy8gZXNjYXBlOiAvPCUtKFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gZXZhbHVhdGU6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gIC8vIGludGVycG9sYXRlOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgLy8gdmFyaWFibGU6ICcnLFxuICAvLyBpbXBvcnRzOiB7XzogbG9kYXNofVxufTtcbi8qKlxuICogVGhlIHRlbXBsYXRlIGZpbGUgbmFtZSBhbmQgZGlyZWN0b3J5IG5hbWUgaXMgcmVwbGFjZWQgYnkgcmVndWxhciBleHByZXNzaW9uLFxuICogZmlsZSBuYW1lIHN1ZmZpeCBpcyByZW1vdmVkLCB0aGVyZWZvciB5b3Ugc2hvdWxkIHVzZSBhIGRvdWJsZSBzdWZmaXggYXMgYSB0ZW1wbGF0ZVxuICogZmlsZSBuYW1lIChsaWtlICdoZWxsb3cudHMudHh0JyB3aWxsIGJlY29tZSAnaGVsbG93LnRzJykuXG4gKiBcbiAqIGxvZGFzaCB0ZW1wbGF0ZSBzZXR0aW5nOlxuICogLSBpbnRlcnBvbGF0ZTogL1xcJF9fKFtcXHNcXFNdKz8pX19cXCQvZyxcbiAqIC0gZXZhbHVhdGU6IC9cXC9cXCo8JShbXFxzXFxTXSs/KSU+XFwqXFwvL2csXG4gKiBcbiAqIFRoZSB0ZW1wbGF0ZSBmaWxlIGNvbnRlbnQgaXMgcmVwbGFjZSBieSBsb2Rhc2ggdGVtcGxhdGUgZnVuY3Rpb25cbiAqIEBwYXJhbSB0ZW1wbERpciBcbiAqIEBwYXJhbSB0YXJnZXRQYXRoIFxuICogQHBhcmFtIHJlcGxhY2VtZW50IFxuICogQHBhcmFtIG9wdCBcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2VuZXJhdGVTdHJ1Y3R1cmUoXG4gIHRlbXBsRGlyOiBzdHJpbmcsIHRhcmdldFBhdGg6IHN0cmluZywgcmVwbGFjZW1lbnQ6IFRlbXBsUmVwbGFjZW1lbnQsIG9wdDogR2VuZXJhdGVPcHRpb24gPSB7ZHJ5cnVuOiBmYWxzZX0pIHtcbiAgaWYgKHJlcGxhY2VtZW50LmluY2x1ZGVUZXh0VHlwZSA9PSBudWxsKSB7XG4gICAgcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlID0gLyg/Olt0al1zeD98cz9jc3N8anNvbnx5YW1sfHltbHxodG1sfHN2ZykkLztcbiAgfVxuICByZXR1cm4gX3JlY3Vyc2VEaXIodGVtcGxEaXIsIHRhcmdldFBhdGgsIHJlcGxhY2VtZW50LCBvcHQpLnRvUHJvbWlzZSgpO1xufVxuXG5mdW5jdGlvbiBfcmVjdXJzZURpcih0ZW1wbERpcjogc3RyaW5nLCB0YXJnZXRQYXRoOiBzdHJpbmcsIHJlcGxhY2VtZW50OiBUZW1wbFJlcGxhY2VtZW50LFxuICBvcHQ6IEdlbmVyYXRlT3B0aW9uID0ge2RyeXJ1bjogZmFsc2V9LCB0YXJnZXRJc0VtcHR5ID0gZmFsc2UpOiBPYnNlcnZhYmxlPGFueT4ge1xuICBjb25zdCBkcnlydW4gPSAhIW9wdC5kcnlydW47XG4gIHJldHVybiBmcm9tKHByb21pc2VzLnJlYWRkaXIodGVtcGxEaXIpKS5waXBlKFxuICAgIG1lcmdlTWFwKGZpbGVzID0+IGZyb20oZmlsZXMpKSxcbiAgICBtZXJnZU1hcChzdWIgPT4ge1xuICAgICAgY29uc3QgYWJzU3ViID0gUGF0aC5yZXNvbHZlKHRlbXBsRGlyLCBzdWIpO1xuICAgICAgcmV0dXJuIGZyb20ocHJvbWlzZXMuc3RhdChhYnNTdWIpKS5waXBlKFxuICAgICAgICBtZXJnZU1hcChzdGF0ZSA9PiB7XG4gICAgICAgICAgaWYgKHN0YXRlLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGxldCBuZXdEaXIgPSBzdWI7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtyZWcsIHJlcGxdIG9mIHJlcGxhY2VtZW50LmZpbGVNYXBwaW5nIHx8IFtdKSB7XG4gICAgICAgICAgICAgIG5ld0RpciA9IG5ld0Rpci5yZXBsYWNlKHJlZywgcmVwbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdEaXIgPSBQYXRoLnJlc29sdmUodGFyZ2V0UGF0aCwgbmV3RGlyKTtcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKG5ld0RpciwgYWJzU3ViKTtcbiAgICAgICAgICAgIGNvbnN0IGRvbmUkID0gZHJ5cnVuID8gb2YodW5kZWZpbmVkKSA6XG4gICAgICAgICAgICAgIGZyb20oZnNlLm1rZGlycChQYXRoLnJlc29sdmUodGFyZ2V0UGF0aCwgbmV3RGlyKSkpO1xuICAgICAgICAgICAgcmV0dXJuIGRvbmUkLnBpcGUoXG4gICAgICAgICAgICAgIG1lcmdlTWFwKCgpID0+IF9yZWN1cnNlRGlyKGFic1N1YiwgbmV3RGlyLCByZXBsYWNlbWVudCwgb3B0LCB0cnVlKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBuZXdGaWxlID0gc3ViO1xuICAgICAgICAgICAgZm9yIChjb25zdCBbcmVnLCByZXBsXSBvZiByZXBsYWNlbWVudC5maWxlTWFwcGluZyB8fCBbXSkge1xuICAgICAgICAgICAgICBuZXdGaWxlID0gbmV3RmlsZS5yZXBsYWNlKHJlZywgcmVwbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdGaWxlID0gUGF0aC5yZXNvbHZlKHRhcmdldFBhdGgsIG5ld0ZpbGUuc2xpY2UoMCwgbmV3RmlsZS5sYXN0SW5kZXhPZignLicpKVxuICAgICAgICAgICAgICAucmVwbGFjZSgvXFwuKFteLi9cXFxcXSspJC8sICcuJDEnKSk7XG5cbiAgICAgICAgICAgIHJldHVybiBmcm9tKChhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgIGlmICh0YXJnZXRJc0VtcHR5IHx8ICFleGlzdHNTeW5jKG5ld0ZpbGUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkcnlydW4pIHtcbiAgICAgICAgICAgICAgICAgIGlmICghcmVwbGFjZW1lbnQuaW5jbHVkZVRleHRUeXBlIS50ZXN0KG5ld0ZpbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2VzLmNvcHlGaWxlKGFic1N1YiwgbmV3RmlsZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW3BsaW5rIGdlbl0gJHtjaGFsay5ncmVlbihQYXRoLnJlbGF0aXZlKFBhdGgucmVzb2x2ZSgpLCBuZXdGaWxlKSl9IGlzIGNvcGllZGApO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBhd2FpdCBwcm9taXNlcy5yZWFkRmlsZShhYnNTdWIsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBfLnRlbXBsYXRlKGNvbnRlbnQsIGxvZGFzaFRlbXBsYXRlU2V0dGluZykocmVwbGFjZW1lbnQudGV4dE1hcHBpbmcpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgSW4gZmlsZSAke2Fic1N1Yn1gKTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHByb21pc2VzLndyaXRlRmlsZShuZXdGaWxlLCBjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbcGxpbmsgZ2VuXSAke2NoYWxrLmdyZWVuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgd3JpdHRlbmApO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbcGxpbmsgZ2VuXSAke2NoYWxrLmdyZWVuKFBhdGgucmVsYXRpdmUoUGF0aC5yZXNvbHZlKCksIG5ld0ZpbGUpKX0gaXMgY3JlYXRlZGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3BsaW5rIGdlbl0gdGFyZ2V0IGZpbGUgYWxyZWFkeSBleGlzdHM6JywgUGF0aC5yZWxhdGl2ZShQYXRoLnJlc29sdmUoKSwgbmV3RmlsZSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pXG4gICk7XG59XG4iXX0=