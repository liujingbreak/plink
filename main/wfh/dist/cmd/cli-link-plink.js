"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reinstallWithLinkedPlink = void 0;
const path_1 = __importDefault(require("path"));
const misc_1 = require("../utils/misc");
const fs_1 = __importDefault(require("fs"));
const json_sync_parser_1 = __importDefault(require("../utils/json-sync-parser"));
// import replaceCode from '../utils/patch-text';
function reinstallWithLinkedPlink(plinkRepoPath, deletedSymlinks) {
    // const plinkRepo = Path.resolve(plinkRepoPath);
    const rootDir = misc_1.getRootDir();
    const nmDir = path_1.default.resolve(rootDir, 'node_modules');
    const pkJsonStr = fs_1.default.readFileSync(path_1.default.resolve(rootDir, 'package.json'), 'utf8');
    const packageNamesToCheck = new Set(deletedSymlinks.map(file => path_1.default.relative(nmDir, file).replace(/\\/g, '/')));
    const ast = json_sync_parser_1.default(pkJsonStr);
    const depsAst = ast.properties.find(prop => prop.name.text === '"dependencies"');
    console.log(depsAst);
    if (depsAst) {
        for (const prop of depsAst.value.properties) {
            const name = prop.name.text.slice(1, -2);
            if (packageNamesToCheck.has(name) || name === '@wfh/plink') {
                console.log('::', name);
            }
        }
    }
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWxpbmstcGxpbmsuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jbWQvY2xpLWxpbmstcGxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLHdDQUF5QztBQUN6Qyw0Q0FBb0I7QUFDcEIsaUZBQTJEO0FBQzNELGlEQUFpRDtBQUVqRCxTQUFnQix3QkFBd0IsQ0FBQyxhQUFxQixFQUFFLGVBQXlCO0lBQ3ZGLGlEQUFpRDtJQUNqRCxNQUFNLE9BQU8sR0FBRyxpQkFBVSxFQUFFLENBQUM7SUFDN0IsTUFBTSxLQUFLLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDcEQsTUFBTSxTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqRixNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxDQUNqQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFL0UsTUFBTSxHQUFHLEdBQUcsMEJBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLGdCQUFnQixDQUFDLENBQUM7SUFDakYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNwQixJQUFJLE9BQU8sRUFBRTtRQUNYLEtBQUssTUFBTSxJQUFJLElBQUssT0FBTyxDQUFDLEtBQW1CLENBQUMsVUFBVSxFQUFFO1lBQzFELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssWUFBWSxFQUFFO2dCQUMxRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQTthQUN4QjtTQUNGO0tBQ0Y7QUFDSCxDQUFDO0FBbkJELDREQW1CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGFyc2UsIHtPYmplY3RBc3R9IGZyb20gJy4uL3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuLy8gaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuXG5leHBvcnQgZnVuY3Rpb24gcmVpbnN0YWxsV2l0aExpbmtlZFBsaW5rKHBsaW5rUmVwb1BhdGg6IHN0cmluZywgZGVsZXRlZFN5bWxpbmtzOiBzdHJpbmdbXSkge1xuICAvLyBjb25zdCBwbGlua1JlcG8gPSBQYXRoLnJlc29sdmUocGxpbmtSZXBvUGF0aCk7XG4gIGNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG4gIGNvbnN0IG5tRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgcGtKc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG4gIGNvbnN0IHBhY2thZ2VOYW1lc1RvQ2hlY2sgPSBuZXcgU2V0PHN0cmluZz4oXG4gICAgZGVsZXRlZFN5bWxpbmtzLm1hcChmaWxlID0+IFBhdGgucmVsYXRpdmUobm1EaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpO1xuXG4gIGNvbnN0IGFzdCA9IHBhcnNlKHBrSnNvblN0cik7XG4gIGNvbnN0IGRlcHNBc3QgPSBhc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcImRlcGVuZGVuY2llc1wiJyk7XG4gIGNvbnNvbGUubG9nKGRlcHNBc3QpXG4gIGlmIChkZXBzQXN0KSB7XG4gICAgZm9yIChjb25zdCBwcm9wIG9mIChkZXBzQXN0LnZhbHVlIGFzIE9iamVjdEFzdCkucHJvcGVydGllcykge1xuICAgICAgY29uc3QgbmFtZSA9IHByb3AubmFtZS50ZXh0LnNsaWNlKDEsIC0yKTtcbiAgICAgIGlmIChwYWNrYWdlTmFtZXNUb0NoZWNrLmhhcyhuYW1lKSB8fCBuYW1lID09PSAnQHdmaC9wbGluaycpIHtcbiAgICAgICAgY29uc29sZS5sb2coJzo6JywgbmFtZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==