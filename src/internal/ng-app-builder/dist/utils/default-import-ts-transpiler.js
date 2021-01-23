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
const _ = __importStar(require("lodash"));
const __api_1 = __importDefault(require("__api"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.transpiler');
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
                        log.info(`Replace: "import ${defaultName} from ${from}" in ` + this.options.file);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1pbXBvcnQtdHMtdHJhbnNwaWxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsMkNBQTRDO0FBRTVDLDBDQUE0QjtBQUM1QixrREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBUXpFLE1BQXFCLHFCQUFxQjtJQUt4QyxZQUFZLE9BQU8sRUFBa0M7UUFIckQsY0FBUyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ25DLGVBQVUsR0FBYSxFQUFFLENBQUM7UUFHeEIsSUFBSSxDQUFDLE9BQU8scUJBRVAsSUFBSSxDQUNSLENBQUM7UUFDRixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxJQUFJLFlBQVksTUFBTTtvQkFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUUzQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFrQixFQUFFLFlBQThCO1FBQ3RELEtBQUksTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUMvQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssdUJBQUUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDckMsTUFBTSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEdBQUksSUFBSSxDQUFDLGVBQW9DLENBQUMsSUFBSSxDQUFDO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUMzRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7d0JBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFhLENBQUMsSUFBSyxDQUFDLElBQUksQ0FBQzt3QkFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsV0FBVyxTQUFTLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xGLFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQzs0QkFDeEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUU7NEJBQ2pCLElBQUksRUFBRSxTQUFTLFdBQVcsZUFBZSxJQUFJLEtBQUs7eUJBQ25ELENBQUMsQ0FBQztxQkFDSjtpQkFDRjthQUNGO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUF2Q0Qsd0NBdUNDIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50cmFuc3BpbGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucyB7XG4gIC8vIGRlZmF1bHRJbXBvcnQycmVxdWlyZT86IGJvb2xlYW47XG4gIGZpbGU6IHN0cmluZztcbiAgbW9kdWxlczogQXJyYXk8UmVnRXhwfHN0cmluZz47XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEltcG9ydENsYXVzZVRyYW5zcGlsZSB7XG4gIG9wdGlvbnM6IEltcG9ydENsYXVzZVRyYW5zcGlsZU9wdGlvbnM7XG4gIG1vZHVsZVNldDogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG4gIG1vZHVsZVJlZ3M6IFJlZ0V4cFtdID0gW107XG5cbiAgY29uc3RydWN0b3Iob3B0cyA9IHt9IGFzIEltcG9ydENsYXVzZVRyYW5zcGlsZU9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSB7XG4gICAgICAvLyBkZWZhdWx0SW1wb3J0MnJlcXVpcmU6IHRydWUsXG4gICAgICAuLi5vcHRzXG4gICAgfTtcbiAgICBpZiAodGhpcy5vcHRpb25zLm1vZHVsZXMpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5tb2R1bGVzLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgIGlmIChuYW1lIGluc3RhbmNlb2YgUmVnRXhwKVxuICAgICAgICAgIHRoaXMubW9kdWxlUmVncy5wdXNoKG5hbWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhpcy5tb2R1bGVTZXQuYWRkKG5hbWUpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcGFyc2UoYXN0OiB0cy5Tb3VyY2VGaWxlLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10pIHtcbiAgICBmb3IoY29uc3Qgc3RtIG9mIGFzdC5zdGF0ZW1lbnRzKSB7XG4gICAgICBpZiAoc3RtLmtpbmQgPT09IHNrLkltcG9ydERlY2xhcmF0aW9uKSB7XG4gICAgICAgIGNvbnN0IG5vZGUgPSBzdG0gYXMgdHMuSW1wb3J0RGVjbGFyYXRpb247XG4gICAgICAgIGNvbnN0IGZyb20gPSAobm9kZS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgaWYgKHRoaXMubW9kdWxlU2V0Lmhhcyhmcm9tKSB8fCB0aGlzLm1vZHVsZVJlZ3Muc29tZShyZWcgPT4gcmVnLnRlc3QoZnJvbSkpKSB7XG4gICAgICAgICAgaWYgKF8uZ2V0KG5vZGUsICdpbXBvcnRDbGF1c2UubmFtZScpKSB7XG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0TmFtZSA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lIS50ZXh0O1xuICAgICAgICAgICAgbG9nLmluZm8oYFJlcGxhY2U6IFwiaW1wb3J0ICR7ZGVmYXVsdE5hbWV9IGZyb20gJHtmcm9tfVwiIGluIGAgKyB0aGlzLm9wdGlvbnMuZmlsZSk7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgIHN0YXJ0OiBzdG0uZ2V0U3RhcnQoYXN0KSxcbiAgICAgICAgICAgICAgZW5kOiBzdG0uZ2V0RW5kKCksXG4gICAgICAgICAgICAgIHRleHQ6IGBjb25zdCAke2RlZmF1bHROYW1lfSA9IHJlcXVpcmUoJyR7ZnJvbX0nKTtgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==