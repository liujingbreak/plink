"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tsjs_replacement_1 = __importDefault(require("./tsjs-replacement"));
const __api_1 = __importDefault(require("__api"));
const typescript_1 = __importDefault(require("typescript"));
const lodash_1 = require("lodash");
let tsPreCompiler;
function replace(file, source, injector, tsConfigFile, compileExpContex) {
    injector.changeTsCompiler(typescript_1.default);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1hbmQtaW5qZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVwbGFjZS1hbmQtaW5qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMEVBQStDO0FBQy9DLGtEQUF3QjtBQUV4Qiw0REFBNEI7QUFDNUIsbUNBQXFDO0FBRXJDLElBQUksYUFBNEIsQ0FBQztBQUVqQyxTQUF3QixPQUFPLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxRQUFZLEVBQUUsWUFBb0IsRUFDOUYsZ0JBQTBDO0lBRTFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBRSxDQUFDLENBQUM7SUFDOUIsSUFBSSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFDLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNoRixJQUFJLGFBQWEsSUFBSSxJQUFJLEVBQUU7UUFDekIsYUFBYSxHQUFHLElBQUksMEJBQWEsQ0FBQyxZQUFZLEVBQUcsZUFBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3hHO0lBRUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRTtRQUM3QyxNQUFNLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUVuQixRQUFRLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTtRQUN4RSxNQUFNLEdBQUcsR0FBRyxzQkFBYSxDQUFDLE9BQU8sRUFBRSxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hHLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDeEMsT0FBTyxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzNCO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDZixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUF4QkQsMEJBd0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFRzUHJlQ29tcGlsZXIgZnJvbSAnLi90c2pzLXJlcGxhY2VtZW50JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFJKIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtzb3J0ZWRJbmRleEJ5fSBmcm9tICdsb2Rhc2gnO1xuXG5sZXQgdHNQcmVDb21waWxlcjogVHNQcmVDb21waWxlcjtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmVwbGFjZShmaWxlOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nLCBpbmplY3RvcjogUkosIHRzQ29uZmlnRmlsZTogc3RyaW5nLFxuICBjb21waWxlRXhwQ29udGV4OiB7W3Zhck5hbWU6IHN0cmluZ106IGFueX0pIHtcblxuICBpbmplY3Rvci5jaGFuZ2VUc0NvbXBpbGVyKHRzKTtcbiAgbGV0IHtyZXBsYWNlZCwgYXN0LCBwYXRjaGVzfSA9IGluamVjdG9yLmluamVjdFRvRmlsZVdpdGhQYXRjaEluZm8oZmlsZSwgc291cmNlKTtcbiAgaWYgKHRzUHJlQ29tcGlsZXIgPT0gbnVsbCkge1xuICAgIHRzUHJlQ29tcGlsZXIgPSBuZXcgVHNQcmVDb21waWxlcih0c0NvbmZpZ0ZpbGUsIChhcGkgYXMgYW55KS5zc3IsIGZpbGUgPT4gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpKTtcbiAgfVxuXG4gIGxldCBvZmZzZXQgPSAwO1xuICBjb25zdCBvZmZzZXRzID0gcGF0Y2hlcy5yZWR1Y2UoKG9mZnNldHMsIGVsKSA9PiB7XG4gICAgb2Zmc2V0ICs9IGVsLnJlcGxhY2VtZW50Lmxlbmd0aCAtIChlbC5lbmQgLSBlbC5zdGFydCk7XG4gICAgb2Zmc2V0cy5wdXNoKG9mZnNldCk7XG4gICAgcmV0dXJuIG9mZnNldHM7XG4gIH0sIFtdIGFzIG51bWJlcltdKTtcblxuICByZXBsYWNlZCA9IHRzUHJlQ29tcGlsZXIucGFyc2UoZmlsZSwgcmVwbGFjZWQsIGNvbXBpbGVFeHBDb250ZXgsIGFzdCwgcG9zID0+IHtcbiAgICAgIGNvbnN0IGlkeCA9IHNvcnRlZEluZGV4QnkocGF0Y2hlcywge3N0YXJ0OiBwb3MsIGVuZDogcG9zLCByZXBsYWNlbWVudDogJyd9LCBlbCA9PiBlbC5zdGFydCkgLSAxO1xuICAgICAgaWYgKGlkeCA+PSAwICYmIGlkeCA8IG9mZnNldHMubGVuZ3RoIC0gMSkge1xuICAgICAgICByZXR1cm4gcG9zICsgb2Zmc2V0c1tpZHhdO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBvcztcbiAgfSk7XG4gIHJldHVybiByZXBsYWNlZDtcbn1cbiJdfQ==