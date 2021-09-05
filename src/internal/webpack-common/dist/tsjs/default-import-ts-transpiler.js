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
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1pbXBvcnQtdHMtdHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMkNBQTRDO0FBRTVDOzs7Ozs7R0FNRztBQUNILDBDQUE0QjtBQUM1QixzQ0FBb0M7QUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBUWpDLE1BQXFCLHFCQUFxQjtJQUt4QyxZQUFZLE9BQU8sRUFBa0M7UUFIckQsY0FBUyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ25DLGVBQVUsR0FBYSxFQUFFLENBQUM7UUFHeEIsSUFBSSxDQUFDLE9BQU8scUJBRVAsSUFBSSxDQUNSLENBQUM7UUFDRixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxJQUFJLFlBQVksTUFBTTtvQkFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUUzQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFrQixFQUFFLFlBQThCO1FBQ3RELEtBQUksTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUMvQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssdUJBQUUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDckMsTUFBTSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEdBQUksSUFBSSxDQUFDLGVBQW9DLENBQUMsSUFBSSxDQUFDO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUMzRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7d0JBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFhLENBQUMsSUFBSyxDQUFDLElBQUksQ0FBQzt3QkFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsV0FBVyxTQUFTLElBQUksT0FBTyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFDN0UsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDOzRCQUN4QixHQUFHLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRTs0QkFDakIsSUFBSSxFQUFFLFNBQVMsV0FBVyxlQUFlLElBQUksS0FBSzt5QkFDbkQsQ0FBQyxDQUFDO3FCQUNKO2lCQUNGO2FBQ0Y7U0FDRjtJQUNILENBQUM7Q0FDRjtBQXZDRCx3Q0F1Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlcGxhY2VtZW50SW5mfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuLyoqXG4gKiBBbmd1bGFyIGJ1aWxkZXIgaGFzIGEgcHJvYmxlbSBpbiBjb21waWxlIHNlcnZlciBzaWRlciByZW5kZXJpbmcgYXBwbGlhY3Rpb25cbiAqIGl0IHVzZXMgV2VicGFjayB0byBwYWNrIFRTIGZpbGVzLCBidXQgaXQgZG9lcyBub3QgcmVzcGVjdCB0c2NvbmZpZy5qc29uIGNvbXBpbGVyIG9wdGlvbjpcbiAqICBcImFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHNcIixcbiAqIGl0IGNhbiBub3QgcmVzb2x2ZSBgaW1wb3J0IGdldCBmcm9tICdsb2Rhc2gvZ2V0JztgIGxpa2UgaW1wb3J0IGNsYXVzZS5cbiAqIFRoaXMgbW9kdWxlIGhlbHBzIHRvIHJlcGxhY2UgYGxvZGFzaGAgaW1wb3J0IHN0YXRlbWVudCB3aXRoIGByZXF1aXJlYCBzdGF0ZW1lbnQuXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucyB7XG4gIC8vIGRlZmF1bHRJbXBvcnQycmVxdWlyZT86IGJvb2xlYW47XG4gIC8vIGZpbGU6IHN0cmluZztcbiAgbW9kdWxlczogQXJyYXk8UmVnRXhwIHwgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlIHtcbiAgb3B0aW9uczogSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucztcbiAgbW9kdWxlU2V0OiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcbiAgbW9kdWxlUmVnczogUmVnRXhwW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihvcHRzID0ge30gYXMgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgIC8vIGRlZmF1bHRJbXBvcnQycmVxdWlyZTogdHJ1ZSxcbiAgICAgIC4uLm9wdHNcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMubW9kdWxlcykge1xuICAgICAgdGhpcy5vcHRpb25zLm1vZHVsZXMuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgaWYgKG5hbWUgaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgICAgICAgdGhpcy5tb2R1bGVSZWdzLnB1c2gobmFtZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aGlzLm1vZHVsZVNldC5hZGQobmFtZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwYXJzZShhc3Q6IHRzLlNvdXJjZUZpbGUsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSkge1xuICAgIGZvcihjb25zdCBzdG0gb2YgYXN0LnN0YXRlbWVudHMpIHtcbiAgICAgIGlmIChzdG0ua2luZCA9PT0gc2suSW1wb3J0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHN0bSBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbjtcbiAgICAgICAgY29uc3QgZnJvbSA9IChub2RlLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICBpZiAodGhpcy5tb2R1bGVTZXQuaGFzKGZyb20pIHx8IHRoaXMubW9kdWxlUmVncy5zb21lKHJlZyA9PiByZWcudGVzdChmcm9tKSkpIHtcbiAgICAgICAgICBpZiAoXy5nZXQobm9kZSwgJ2ltcG9ydENsYXVzZS5uYW1lJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHROYW1lID0gbm9kZS5pbXBvcnRDbGF1c2UhLm5hbWUhLnRleHQ7XG4gICAgICAgICAgICBsb2cuaW5mbyhgUmVwbGFjZTogXCJpbXBvcnQgJHtkZWZhdWx0TmFtZX0gZnJvbSAke2Zyb219XCIgaW4gYCArIGFzdC5maWxlTmFtZSk7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgIHN0YXJ0OiBzdG0uZ2V0U3RhcnQoYXN0KSxcbiAgICAgICAgICAgICAgZW5kOiBzdG0uZ2V0RW5kKCksXG4gICAgICAgICAgICAgIHRleHQ6IGBjb25zdCAke2RlZmF1bHROYW1lfSA9IHJlcXVpcmUoJyR7ZnJvbX0nKTtgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==