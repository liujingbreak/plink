"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tsjs_replacement_1 = __importDefault(require("./tsjs-replacement"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = require("lodash");
let tsPreCompiler;
function replace(file, source, injector, tsConfigFile, compileExpContex) {
    let { replaced, ast, patches } = injector.injectToFileWithPatchInfo(file, source);
    if (tsPreCompiler == null) {
        tsPreCompiler = new tsjs_replacement_1.default(tsConfigFile, __api_1.default.ssr, file => __api_1.default.findPackageByFile(file));
    }
    let offset = 0;
    const offsets = patches.reduce((offsets, el) => {
        offset += el.replacement.length - (el.end - el.start);
        offsets.push(offset);
        return offsets;
    }, []);
    replaced = tsPreCompiler.parse(file, replaced, compileExpContex, ast, pos => {
        const idx = lodash_1.sortedIndexBy(patches, { start: pos, end: pos, replacement: '' }, el => el.start) - 1;
        if (idx >= 0 && idx < offsets.length - 1) {
            return pos + offsets[idx];
        }
        return pos;
    });
    return replaced;
}
exports.default = replace;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL3RzanMvcmVwbGFjZS1hbmQtaW5qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMEVBQStDO0FBQy9DLGtEQUF3QjtBQUV4QixtQ0FBcUM7QUFFckMsSUFBSSxhQUE0QixDQUFDO0FBRWpDLFNBQXdCLE9BQU8sQ0FBQyxJQUFZLEVBQUUsTUFBYyxFQUFFLFFBQVksRUFBRSxZQUFvQixFQUM5RixnQkFBMEM7SUFDMUMsSUFBSSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFDLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNoRixJQUFJLGFBQWEsSUFBSSxJQUFJLEVBQUU7UUFDekIsYUFBYSxHQUFHLElBQUksMEJBQWEsQ0FBQyxZQUFZLEVBQUcsZUFBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3hHO0lBRUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRTtRQUM3QyxNQUFNLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUVuQixRQUFRLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTtRQUN4RSxNQUFNLEdBQUcsR0FBRyxzQkFBYSxDQUFDLE9BQU8sRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDeEMsT0FBTyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUF0QkQsMEJBc0JDIiwiZmlsZSI6ImludGVybmFsL3dlYnBhY2stY29tbW9uL2Rpc3QvdHNqcy9yZXBsYWNlLWFuZC1pbmplY3QuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
