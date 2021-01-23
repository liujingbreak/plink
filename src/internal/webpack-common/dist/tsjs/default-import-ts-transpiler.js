"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = require("typescript");
/**
 * Angular builder has a problem in compile server sider rendering appliaction
 * it uses Webpack to pack TS files, but it does not respect tsconfig.json compiler option:
 *  "allowSyntheticDefaultImports",
 * it can not resolve `import get from 'lodash/get';` like import clause.
 * This module helps to replace `lodash` import statement with `require` statement.
 */
const _ = __importStar(require("lodash"));
const __api_1 = __importDefault(require("__api"));
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.transpiler');
class ImportClauseTranspile {
    constructor(opts = {}) {
        this.moduleSet = new Set();
        this.moduleRegs = [];
        this.options = Object.assign({}, opts);
        if (this.options.modules) {
            this.options.modules.forEach(name => {
                if (name instanceof RegExp)
                    this.moduleRegs.push(name);
                else
                    this.moduleSet.add(name);
            });
        }
    }
    parse(ast, replacements) {
        for (const stm of ast.statements) {
            if (stm.kind === typescript_1.SyntaxKind.ImportDeclaration) {
                const node = stm;
                const from = node.moduleSpecifier.text;
                if (this.moduleSet.has(from) || this.moduleRegs.some(reg => reg.test(from))) {
                    if (_.get(node, 'importClause.name')) {
                        const defaultName = node.importClause.name.text;
                        log.info(`Replace: "import ${defaultName} from ${from}" in ` + ast.fileName);
                        replacements.push({
                            start: stm.getStart(ast),
                            end: stm.getEnd(),
                            text: `const ${defaultName} = require('${from}');`
                        });
                    }
                }
            }
        }
    }
}
exports.default = ImportClauseTranspile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1pbXBvcnQtdHMtdHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMkNBQTRDO0FBRTVDOzs7Ozs7R0FNRztBQUNILDBDQUE0QjtBQUM1QixrREFBd0I7QUFDeEIsb0RBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFROUQsTUFBcUIscUJBQXFCO0lBS3hDLFlBQVksT0FBTyxFQUFrQztRQUhyRCxjQUFTLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDbkMsZUFBVSxHQUFhLEVBQUUsQ0FBQztRQUd4QixJQUFJLENBQUMsT0FBTyxxQkFFUCxJQUFJLENBQ1IsQ0FBQztRQUNGLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUU7WUFDeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUNsQyxJQUFJLElBQUksWUFBWSxNQUFNO29CQUN4QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7b0JBRTNCLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQWtCLEVBQUUsWUFBOEI7UUFDdEQsS0FBSSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsVUFBVSxFQUFFO1lBQy9CLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyx1QkFBRSxDQUFDLGlCQUFpQixFQUFFO2dCQUNyQyxNQUFNLElBQUksR0FBRyxHQUEyQixDQUFDO2dCQUN6QyxNQUFNLElBQUksR0FBSSxJQUFJLENBQUMsZUFBb0MsQ0FBQyxJQUFJLENBQUM7Z0JBQzdELElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7b0JBQzNFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsRUFBRTt3QkFDcEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQWEsQ0FBQyxJQUFLLENBQUMsSUFBSSxDQUFDO3dCQUNsRCxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixXQUFXLFNBQVMsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUM3RSxZQUFZLENBQUMsSUFBSSxDQUFDOzRCQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7NEJBQ3hCLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFOzRCQUNqQixJQUFJLEVBQUUsU0FBUyxXQUFXLGVBQWUsSUFBSSxLQUFLO3lCQUNuRCxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7YUFDRjtTQUNGO0lBQ0gsQ0FBQztDQUNGO0FBdkNELHdDQXVDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtTeW50YXhLaW5kIGFzIHNrfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG4vKipcbiAqIEFuZ3VsYXIgYnVpbGRlciBoYXMgYSBwcm9ibGVtIGluIGNvbXBpbGUgc2VydmVyIHNpZGVyIHJlbmRlcmluZyBhcHBsaWFjdGlvblxuICogaXQgdXNlcyBXZWJwYWNrIHRvIHBhY2sgVFMgZmlsZXMsIGJ1dCBpdCBkb2VzIG5vdCByZXNwZWN0IHRzY29uZmlnLmpzb24gY29tcGlsZXIgb3B0aW9uOlxuICogIFwiYWxsb3dTeW50aGV0aWNEZWZhdWx0SW1wb3J0c1wiLFxuICogaXQgY2FuIG5vdCByZXNvbHZlIGBpbXBvcnQgZ2V0IGZyb20gJ2xvZGFzaC9nZXQnO2AgbGlrZSBpbXBvcnQgY2xhdXNlLlxuICogVGhpcyBtb2R1bGUgaGVscHMgdG8gcmVwbGFjZSBgbG9kYXNoYCBpbXBvcnQgc3RhdGVtZW50IHdpdGggYHJlcXVpcmVgIHN0YXRlbWVudC5cbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudHJhbnNwaWxlcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydENsYXVzZVRyYW5zcGlsZU9wdGlvbnMge1xuICAvLyBkZWZhdWx0SW1wb3J0MnJlcXVpcmU/OiBib29sZWFuO1xuICAvLyBmaWxlOiBzdHJpbmc7XG4gIG1vZHVsZXM6IEFycmF5PFJlZ0V4cHxzdHJpbmc+O1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbXBvcnRDbGF1c2VUcmFuc3BpbGUge1xuICBvcHRpb25zOiBJbXBvcnRDbGF1c2VUcmFuc3BpbGVPcHRpb25zO1xuICBtb2R1bGVTZXQ6IFNldDxzdHJpbmc+ID0gbmV3IFNldCgpO1xuICBtb2R1bGVSZWdzOiBSZWdFeHBbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKG9wdHMgPSB7fSBhcyBJbXBvcnRDbGF1c2VUcmFuc3BpbGVPcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0ge1xuICAgICAgLy8gZGVmYXVsdEltcG9ydDJyZXF1aXJlOiB0cnVlLFxuICAgICAgLi4ub3B0c1xuICAgIH07XG4gICAgaWYgKHRoaXMub3B0aW9ucy5tb2R1bGVzKSB7XG4gICAgICB0aGlzLm9wdGlvbnMubW9kdWxlcy5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICBpZiAobmFtZSBpbnN0YW5jZW9mIFJlZ0V4cClcbiAgICAgICAgICB0aGlzLm1vZHVsZVJlZ3MucHVzaChuYW1lKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRoaXMubW9kdWxlU2V0LmFkZChuYW1lKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHBhcnNlKGFzdDogdHMuU291cmNlRmlsZSwgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdKSB7XG4gICAgZm9yKGNvbnN0IHN0bSBvZiBhc3Quc3RhdGVtZW50cykge1xuICAgICAgaWYgKHN0bS5raW5kID09PSBzay5JbXBvcnREZWNsYXJhdGlvbikge1xuICAgICAgICBjb25zdCBub2RlID0gc3RtIGFzIHRzLkltcG9ydERlY2xhcmF0aW9uO1xuICAgICAgICBjb25zdCBmcm9tID0gKG5vZGUubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICAgIGlmICh0aGlzLm1vZHVsZVNldC5oYXMoZnJvbSkgfHwgdGhpcy5tb2R1bGVSZWdzLnNvbWUocmVnID0+IHJlZy50ZXN0KGZyb20pKSkge1xuICAgICAgICAgIGlmIChfLmdldChub2RlLCAnaW1wb3J0Q2xhdXNlLm5hbWUnKSkge1xuICAgICAgICAgICAgY29uc3QgZGVmYXVsdE5hbWUgPSBub2RlLmltcG9ydENsYXVzZSEubmFtZSEudGV4dDtcbiAgICAgICAgICAgIGxvZy5pbmZvKGBSZXBsYWNlOiBcImltcG9ydCAke2RlZmF1bHROYW1lfSBmcm9tICR7ZnJvbX1cIiBpbiBgICsgYXN0LmZpbGVOYW1lKTtcbiAgICAgICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0bS5nZXRTdGFydChhc3QpLFxuICAgICAgICAgICAgICBlbmQ6IHN0bS5nZXRFbmQoKSxcbiAgICAgICAgICAgICAgdGV4dDogYGNvbnN0ICR7ZGVmYXVsdE5hbWV9ID0gcmVxdWlyZSgnJHtmcm9tfScpO2BcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIl19