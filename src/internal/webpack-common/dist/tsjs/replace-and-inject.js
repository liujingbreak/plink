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
        const idx = (0, lodash_1.sortedIndexBy)(patches, { start: pos, end: pos, replacement: '' }, el => el.start) - 1;
        if (idx >= 0 && idx < offsets.length - 1) {
            return pos + offsets[idx];
        }
        return pos;
    });
    return replaced;
}
exports.default = replace;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZS1hbmQtaW5qZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVwbGFjZS1hbmQtaW5qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMEVBQStDO0FBQy9DLGtEQUF3QjtBQUV4Qiw0REFBNEI7QUFDNUIsbUNBQXFDO0FBRXJDLElBQUksYUFBNEIsQ0FBQztBQUVqQyxTQUF3QixPQUFPLENBQUMsSUFBWSxFQUFFLE1BQWMsRUFBRSxRQUFZLEVBQUUsWUFBb0IsRUFDOUYsZ0JBQTBDO0lBRTFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBRSxDQUFDLENBQUM7SUFDOUIsSUFBSSxFQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFDLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNoRixJQUFJLGFBQWEsSUFBSSxJQUFJLEVBQUU7UUFDekIsYUFBYSxHQUFHLElBQUksMEJBQWEsQ0FBQyxZQUFZLEVBQUcsZUFBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3hHO0lBRUQsSUFBSSxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRTtRQUM3QyxNQUFNLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN0RCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUMsRUFBRSxFQUFjLENBQUMsQ0FBQztJQUVuQixRQUFRLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTtRQUN4RSxNQUFNLEdBQUcsR0FBRyxJQUFBLHNCQUFhLEVBQUMsT0FBTyxFQUFFLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN4QyxPQUFPLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDM0I7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQztBQXhCRCwwQkF3QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVHNQcmVDb21waWxlciBmcm9tICcuL3RzanMtcmVwbGFjZW1lbnQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgUkogZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3NvcnRlZEluZGV4Qnl9IGZyb20gJ2xvZGFzaCc7XG5cbmxldCB0c1ByZUNvbXBpbGVyOiBUc1ByZUNvbXBpbGVyO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiByZXBsYWNlKGZpbGU6IHN0cmluZywgc291cmNlOiBzdHJpbmcsIGluamVjdG9yOiBSSiwgdHNDb25maWdGaWxlOiBzdHJpbmcsXG4gIGNvbXBpbGVFeHBDb250ZXg6IHtbdmFyTmFtZTogc3RyaW5nXTogYW55fSkge1xuXG4gIGluamVjdG9yLmNoYW5nZVRzQ29tcGlsZXIodHMpO1xuICBsZXQge3JlcGxhY2VkLCBhc3QsIHBhdGNoZXN9ID0gaW5qZWN0b3IuaW5qZWN0VG9GaWxlV2l0aFBhdGNoSW5mbyhmaWxlLCBzb3VyY2UpO1xuICBpZiAodHNQcmVDb21waWxlciA9PSBudWxsKSB7XG4gICAgdHNQcmVDb21waWxlciA9IG5ldyBUc1ByZUNvbXBpbGVyKHRzQ29uZmlnRmlsZSwgKGFwaSBhcyBhbnkpLnNzciwgZmlsZSA9PiBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSkpO1xuICB9XG5cbiAgbGV0IG9mZnNldCA9IDA7XG4gIGNvbnN0IG9mZnNldHMgPSBwYXRjaGVzLnJlZHVjZSgob2Zmc2V0cywgZWwpID0+IHtcbiAgICBvZmZzZXQgKz0gZWwucmVwbGFjZW1lbnQubGVuZ3RoIC0gKGVsLmVuZCAtIGVsLnN0YXJ0KTtcbiAgICBvZmZzZXRzLnB1c2gob2Zmc2V0KTtcbiAgICByZXR1cm4gb2Zmc2V0cztcbiAgfSwgW10gYXMgbnVtYmVyW10pO1xuXG4gIHJlcGxhY2VkID0gdHNQcmVDb21waWxlci5wYXJzZShmaWxlLCByZXBsYWNlZCwgY29tcGlsZUV4cENvbnRleCwgYXN0LCBwb3MgPT4ge1xuICAgICAgY29uc3QgaWR4ID0gc29ydGVkSW5kZXhCeShwYXRjaGVzLCB7c3RhcnQ6IHBvcywgZW5kOiBwb3MsIHJlcGxhY2VtZW50OiAnJ30sIGVsID0+IGVsLnN0YXJ0KSAtIDE7XG4gICAgICBpZiAoaWR4ID49IDAgJiYgaWR4IDwgb2Zmc2V0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgIHJldHVybiBwb3MgKyBvZmZzZXRzW2lkeF07XG4gICAgICB9XG4gICAgICByZXR1cm4gcG9zO1xuICB9KTtcbiAgcmV0dXJuIHJlcGxhY2VkO1xufVxuIl19