"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const typescript_1 = require("typescript");
const _ = tslib_1.__importStar(require("lodash"));
const __api_1 = tslib_1.__importDefault(require("__api"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDJDQUE0QztBQUU1QyxrREFBNEI7QUFDNUIsMERBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztBQVF6RSxNQUFxQixxQkFBcUI7SUFLekMsWUFBWSxPQUFPLEVBQWtDO1FBSHJELGNBQVMsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNuQyxlQUFVLEdBQWEsRUFBRSxDQUFDO1FBR3pCLElBQUksQ0FBQyxPQUFPLHFCQUVSLElBQUksQ0FDUCxDQUFDO1FBQ0YsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUN6QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ25DLElBQUksSUFBSSxZQUFZLE1BQU07b0JBQ3pCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFFM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUM7U0FDSDtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsR0FBa0IsRUFBRSxZQUE4QjtRQUN2RCxLQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDaEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHVCQUFFLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3RDLE1BQU0sSUFBSSxHQUFHLEdBQTJCLENBQUM7Z0JBQ3pDLE1BQU0sSUFBSSxHQUFJLElBQUksQ0FBQyxlQUFvQyxDQUFDLElBQUksQ0FBQztnQkFDN0QsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtvQkFDNUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO3dCQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBYSxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUM7d0JBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLFdBQVcsU0FBUyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsRixZQUFZLENBQUMsSUFBSSxDQUFDOzRCQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7NEJBQ3hCLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFOzRCQUNqQixJQUFJLEVBQUUsU0FBUyxXQUFXLGVBQWUsSUFBSSxLQUFLO3lCQUNsRCxDQUFDLENBQUM7cUJBQ0g7aUJBQ0Q7YUFDRDtTQUNEO0lBQ0YsQ0FBQztDQUNEO0FBdkNELHdDQXVDQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50cmFuc3BpbGVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucyB7XG5cdC8vIGRlZmF1bHRJbXBvcnQycmVxdWlyZT86IGJvb2xlYW47XG5cdGZpbGU6IHN0cmluZztcblx0bW9kdWxlczogQXJyYXk8UmVnRXhwfHN0cmluZz47XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEltcG9ydENsYXVzZVRyYW5zcGlsZSB7XG5cdG9wdGlvbnM6IEltcG9ydENsYXVzZVRyYW5zcGlsZU9wdGlvbnM7XG5cdG1vZHVsZVNldDogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7XG5cdG1vZHVsZVJlZ3M6IFJlZ0V4cFtdID0gW107XG5cblx0Y29uc3RydWN0b3Iob3B0cyA9IHt9IGFzIEltcG9ydENsYXVzZVRyYW5zcGlsZU9wdGlvbnMpIHtcblx0XHR0aGlzLm9wdGlvbnMgPSB7XG5cdFx0XHQvLyBkZWZhdWx0SW1wb3J0MnJlcXVpcmU6IHRydWUsXG5cdFx0XHQuLi5vcHRzXG5cdFx0fTtcblx0XHRpZiAodGhpcy5vcHRpb25zLm1vZHVsZXMpIHtcblx0XHRcdHRoaXMub3B0aW9ucy5tb2R1bGVzLmZvckVhY2gobmFtZSA9PiB7XG5cdFx0XHRcdGlmIChuYW1lIGluc3RhbmNlb2YgUmVnRXhwKVxuXHRcdFx0XHRcdHRoaXMubW9kdWxlUmVncy5wdXNoKG5hbWUpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dGhpcy5tb2R1bGVTZXQuYWRkKG5hbWUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cGFyc2UoYXN0OiB0cy5Tb3VyY2VGaWxlLCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10pIHtcblx0XHRmb3IoY29uc3Qgc3RtIG9mIGFzdC5zdGF0ZW1lbnRzKSB7XG5cdFx0XHRpZiAoc3RtLmtpbmQgPT09IHNrLkltcG9ydERlY2xhcmF0aW9uKSB7XG5cdFx0XHRcdGNvbnN0IG5vZGUgPSBzdG0gYXMgdHMuSW1wb3J0RGVjbGFyYXRpb247XG5cdFx0XHRcdGNvbnN0IGZyb20gPSAobm9kZS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcblx0XHRcdFx0aWYgKHRoaXMubW9kdWxlU2V0Lmhhcyhmcm9tKSB8fCB0aGlzLm1vZHVsZVJlZ3Muc29tZShyZWcgPT4gcmVnLnRlc3QoZnJvbSkpKSB7XG5cdFx0XHRcdFx0aWYgKF8uZ2V0KG5vZGUsICdpbXBvcnRDbGF1c2UubmFtZScpKSB7XG5cdFx0XHRcdFx0XHRjb25zdCBkZWZhdWx0TmFtZSA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lIS50ZXh0O1xuXHRcdFx0XHRcdFx0bG9nLmluZm8oYFJlcGxhY2U6IFwiaW1wb3J0ICR7ZGVmYXVsdE5hbWV9IGZyb20gJHtmcm9tfVwiIGluIGAgKyB0aGlzLm9wdGlvbnMuZmlsZSk7XG5cdFx0XHRcdFx0XHRyZXBsYWNlbWVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdHN0YXJ0OiBzdG0uZ2V0U3RhcnQoYXN0KSxcblx0XHRcdFx0XHRcdFx0ZW5kOiBzdG0uZ2V0RW5kKCksXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGBjb25zdCAke2RlZmF1bHROYW1lfSA9IHJlcXVpcmUoJyR7ZnJvbX0nKTtgXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiJdfQ==
