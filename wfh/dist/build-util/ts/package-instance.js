"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-classes-per-file */
const _ = __importStar(require("lodash"));
class PackageBrowserInstance {
    constructor(attrs) {
        if (!(this instanceof PackageBrowserInstance)) {
            return new PackageBrowserInstance(attrs);
        }
        if (attrs) {
            this.init(attrs);
        }
    }
    init(attrs) {
        _.assign(this, attrs);
        const parsedName = this.parsedName;
        if (parsedName) {
            this.shortName = parsedName.name;
            this.scopeName = parsedName.scope;
        }
    }
    toString() {
        return 'Package: ' + this.longName;
    }
}
exports.default = PackageBrowserInstance;
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
class LazyPackageFactory {
    constructor() {
        this.packagePathMap = new dir_tree_1.DirTree();
    }
    getPackageByPath(file) {
        let currPath = file;
        let found;
        found = this.packagePathMap.getAllData(file);
        if (found.length > 0)
            return found[found.length - 1];
        while (true) {
            const dir = Path.dirname(currPath);
            if (dir === currPath)
                break; // Has reached root
            if (fs.existsSync(Path.join(dir, 'package.json'))) {
                const pkjson = require(Path.join(dir, 'package.json'));
                const pk = createPackage(dir, pkjson);
                this.packagePathMap.putData(dir, pk);
                return pk;
            }
            currPath = dir;
        }
        return null;
    }
}
exports.LazyPackageFactory = LazyPackageFactory;
function createPackage(packagePath, pkJson) {
    const name = pkJson.name;
    const instance = new PackageBrowserInstance({
        isVendor: false,
        bundle: null,
        longName: pkJson.name,
        shortName: packageUtils.parseName(pkJson.name).name,
        packagePath,
        realPackagePath: fs.realpathSync(packagePath)
    });
    let entryViews, entryPages;
    let isEntryServerTemplate = true;
    let noParseFiles;
    if (pkJson.dr) {
        if (pkJson.dr.entryPage) {
            isEntryServerTemplate = false;
            entryPages = [].concat(pkJson.dr.entryPage);
        }
        else if (pkJson.dr.entryView) {
            isEntryServerTemplate = true;
            entryViews = [].concat(pkJson.dr.entryView);
        }
        if (pkJson.dr.noParse) {
            noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
        }
        if (pkJson.dr.browserifyNoParse) {
            noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
        }
    }
    const mainFile = pkJson.browser || pkJson.main;
    instance.init({
        file: mainFile ? fs.realpathSync(Path.resolve(packagePath, mainFile)) : undefined,
        main: pkJson.main,
        // style: pkJson.style ? resolveStyle(name, nodePaths) : null,
        parsedName: packageUtils.parseName(name),
        entryPages,
        entryViews,
        browserifyNoParse: noParseFiles,
        isEntryServerTemplate,
        translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
        dr: pkJson.dr,
        json: pkJson,
        compiler: _.get(pkJson, 'dr.compiler'),
        browser: pkJson.browser,
        i18n: pkJson.dr && pkJson.dr.i18n ? pkJson.dr.i18n : null,
        appType: _.get(pkJson, 'dr.appType')
    });
    return instance;
}
function trimNoParseSetting(p) {
    p = p.replace(/\\/g, '/');
    if (p.startsWith('./')) {
        p = p.substring(2);
    }
    return p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbnN0YW5jZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSx5Q0FBeUM7QUFDekMsMENBQTRCO0FBRTVCLE1BQXFCLHNCQUFzQjtJQXdCMUMsWUFBWSxLQUFVO1FBQ3JCLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxzQkFBc0IsQ0FBQyxFQUFFO1lBQzlDLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN6QztRQUNELElBQUksS0FBSyxFQUFFO1lBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNqQjtJQUNGLENBQUM7SUFDRCxJQUFJLENBQUMsS0FBNEU7UUFDaEYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNuQyxJQUFJLFVBQVUsRUFBRTtZQUNmLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7U0FDbEM7SUFDRixDQUFDO0lBQ0QsUUFBUTtRQUNQLE9BQU8sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDcEMsQ0FBQztDQUNEO0FBM0NELHlDQTJDQztBQUNELDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFDekIsNkRBQXVEO0FBQ3ZELE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0FBQ2hGLE1BQWEsa0JBQWtCO0lBQS9CO1FBQ0MsbUJBQWMsR0FBRyxJQUFJLGtCQUFPLEVBQTBCLENBQUM7SUFzQnhELENBQUM7SUFwQkEsZ0JBQWdCLENBQUMsSUFBWTtRQUM1QixJQUFJLFFB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QUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxDQUFDLENBQUM7QUFDVixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB7XG5cdGJ1bmRsZTogc3RyaW5nO1xuXHRsb25nTmFtZTogc3RyaW5nO1xuXHRzaG9ydE5hbWU6IHN0cmluZztcblx0ZmlsZT86IHN0cmluZztcblx0cGFyc2VkTmFtZToge3Njb3BlOiBzdHJpbmcsIG5hbWU6IHN0cmluZ307XG5cdHNjb3BlTmFtZTogc3RyaW5nO1xuXHRlbnRyeVBhZ2VzPzogc3RyaW5nW107XG5cdGkxOG46IHN0cmluZztcblx0cGFja2FnZVBhdGg6IHN0cmluZztcblx0cmVhbFBhY2thZ2VQYXRoOiBzdHJpbmc7XG5cdG1haW46IHN0cmluZztcblx0c3R5bGU/OiBzdHJpbmcgfCBudWxsO1xuXHRlbnRyeVZpZXdzPzogc3RyaW5nW107XG5cdGJyb3dzZXJpZnlOb1BhcnNlPzogYW55W107XG5cdGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZTogYm9vbGVhbjtcblx0dHJhbnNsYXRhYmxlOiBzdHJpbmc7XG5cdGRyOiBhbnk7XG5cdGpzb246IGFueTtcblx0YnJvd3Nlcjogc3RyaW5nO1xuXHRpc1ZlbmRvcjogYm9vbGVhbjtcblx0YXBwVHlwZTogc3RyaW5nO1xuXHRjb21waWxlcj86IGFueTtcblxuXHRjb25zdHJ1Y3RvcihhdHRyczogYW55KSB7XG5cdFx0aWYgKCEodGhpcyBpbnN0YW5jZW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2UpKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2UoYXR0cnMpO1xuXHRcdH1cblx0XHRpZiAoYXR0cnMpIHtcblx0XHRcdHRoaXMuaW5pdChhdHRycyk7XG5cdFx0fVxuXHR9XG5cdGluaXQoYXR0cnM6IHtba2V5IGluIGtleW9mIFBhY2thZ2VCcm93c2VySW5zdGFuY2VdPzogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtrZXldfSkge1xuXHRcdF8uYXNzaWduKHRoaXMsIGF0dHJzKTtcblx0XHRjb25zdCBwYXJzZWROYW1lID0gdGhpcy5wYXJzZWROYW1lO1xuXHRcdGlmIChwYXJzZWROYW1lKSB7XG5cdFx0XHR0aGlzLnNob3J0TmFtZSA9IHBhcnNlZE5hbWUubmFtZTtcblx0XHRcdHRoaXMuc2NvcGVOYW1lID0gcGFyc2VkTmFtZS5zY29wZTtcblx0XHR9XG5cdH1cblx0dG9TdHJpbmcoKSB7XG5cdFx0cmV0dXJuICdQYWNrYWdlOiAnICsgdGhpcy5sb25nTmFtZTtcblx0fVxufVxuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5leHBvcnQgY2xhc3MgTGF6eVBhY2thZ2VGYWN0b3J5IHtcblx0cGFja2FnZVBhdGhNYXAgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuXG5cdGdldFBhY2thZ2VCeVBhdGgoZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IG51bGwge1xuXHRcdGxldCBjdXJyUGF0aCA9IGZpbGU7XG5cdFx0bGV0IGZvdW5kOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW107XG5cdFx0Zm91bmQgPSB0aGlzLnBhY2thZ2VQYXRoTWFwLmdldEFsbERhdGEoZmlsZSk7XG5cdFx0aWYgKGZvdW5kLmxlbmd0aCA+IDApXG5cdFx0XHRyZXR1cm4gZm91bmRbZm91bmQubGVuZ3RoIC0gMV07XG5cdFx0d2hpbGUgKHRydWUpIHtcblx0XHRcdGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShjdXJyUGF0aCk7XG5cdFx0XHRpZiAoZGlyID09PSBjdXJyUGF0aClcblx0XHRcdFx0YnJlYWs7IC8vIEhhcyByZWFjaGVkIHJvb3Rcblx0XHRcdGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihkaXIsICdwYWNrYWdlLmpzb24nKSkpIHtcblx0XHRcdFx0Y29uc3QgcGtqc29uID0gcmVxdWlyZShQYXRoLmpvaW4oZGlyLCAncGFja2FnZS5qc29uJykpO1xuXHRcdFx0XHRjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2UoZGlyLCBwa2pzb24pO1xuXHRcdFx0XHR0aGlzLnBhY2thZ2VQYXRoTWFwLnB1dERhdGEoZGlyLCBwayk7XG5cdFx0XHRcdHJldHVybiBwaztcblx0XHRcdH1cblx0XHRcdGN1cnJQYXRoID0gZGlyO1xuXHRcdH1cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlKHBhY2thZ2VQYXRoOiBzdHJpbmcsIHBrSnNvbjogYW55KSB7XG5cdGNvbnN0IG5hbWU6IHN0cmluZyA9IHBrSnNvbi5uYW1lO1xuXHRjb25zdCBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKHtcblx0XHRpc1ZlbmRvcjogZmFsc2UsXG5cdFx0YnVuZGxlOiBudWxsLFxuXHRcdGxvbmdOYW1lOiBwa0pzb24ubmFtZSxcblx0XHRzaG9ydE5hbWU6IHBhY2thZ2VVdGlscy5wYXJzZU5hbWUocGtKc29uLm5hbWUpLm5hbWUsXG5cdFx0cGFja2FnZVBhdGgsXG5cdFx0cmVhbFBhY2thZ2VQYXRoOiBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpXG5cdH0pO1xuXHRsZXQgZW50cnlWaWV3czogc3RyaW5nW10gfCB1bmRlZmluZWQsIGVudHJ5UGFnZXM6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xuXHRsZXQgaXNFbnRyeVNlcnZlclRlbXBsYXRlID0gdHJ1ZTtcblx0bGV0IG5vUGFyc2VGaWxlczogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG5cdFx0aWYgKHBrSnNvbi5kcikge1xuXHRcdGlmIChwa0pzb24uZHIuZW50cnlQYWdlKSB7XG5cdFx0XHRpc0VudHJ5U2VydmVyVGVtcGxhdGUgPSBmYWxzZTtcblx0XHRcdGVudHJ5UGFnZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLmVudHJ5UGFnZSk7XG5cdFx0fSBlbHNlIGlmIChwa0pzb24uZHIuZW50cnlWaWV3KSB7XG5cdFx0XHRpc0VudHJ5U2VydmVyVGVtcGxhdGUgPSB0cnVlO1xuXHRcdFx0ZW50cnlWaWV3cyA9IFtdLmNvbmNhdChwa0pzb24uZHIuZW50cnlWaWV3KTtcblx0XHR9XG5cdFx0aWYgKHBrSnNvbi5kci5ub1BhcnNlKSB7XG5cdFx0XHRub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLm5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuXHRcdH1cblx0XHRpZiAocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKSB7XG5cdFx0XHRub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcblx0XHR9XG5cdH1cblx0Y29uc3QgbWFpbkZpbGU6IHN0cmluZyA9IHBrSnNvbi5icm93c2VyIHx8IHBrSnNvbi5tYWluO1xuXHRpbnN0YW5jZS5pbml0KHtcblx0XHRmaWxlOiBtYWluRmlsZSA/IGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIG1haW5GaWxlKSkgOiB1bmRlZmluZWQsIC8vIHBhY2thZ2UuanNvbiBcImJyb3dzZXJcIlxuXHRcdG1haW46IHBrSnNvbi5tYWluLCAvLyBwYWNrYWdlLmpzb24gXCJtYWluXCJcblx0XHQvLyBzdHlsZTogcGtKc29uLnN0eWxlID8gcmVzb2x2ZVN0eWxlKG5hbWUsIG5vZGVQYXRocykgOiBudWxsLFxuXHRcdHBhcnNlZE5hbWU6IHBhY2thZ2VVdGlscy5wYXJzZU5hbWUobmFtZSksXG5cdFx0ZW50cnlQYWdlcyxcblx0XHRlbnRyeVZpZXdzLFxuXHRcdGJyb3dzZXJpZnlOb1BhcnNlOiBub1BhcnNlRmlsZXMsXG5cdFx0aXNFbnRyeVNlcnZlclRlbXBsYXRlLFxuXHRcdHRyYW5zbGF0YWJsZTogIV8uaGFzKHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpIHx8IF8uZ2V0KHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpLFxuXHRcdGRyOiBwa0pzb24uZHIsXG5cdFx0anNvbjogcGtKc29uLFxuXHRcdGNvbXBpbGVyOiBfLmdldChwa0pzb24sICdkci5jb21waWxlcicpLFxuXHRcdGJyb3dzZXI6IHBrSnNvbi5icm93c2VyLFxuXHRcdGkxOG46IHBrSnNvbi5kciAmJiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcblx0XHRhcHBUeXBlOiBfLmdldChwa0pzb24sICdkci5hcHBUeXBlJylcblx0fSk7XG5cdHJldHVybiBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuXHRwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcblx0XHRwID0gcC5zdWJzdHJpbmcoMik7XG5cdH1cblx0cmV0dXJuIHA7XG59XG4iXX0=