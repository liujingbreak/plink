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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDJDQUE0QztBQUU1QyxrREFBNEI7QUFDNUIsMERBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztBQVF6RSxNQUFxQixxQkFBcUI7SUFLekMsWUFBWSxJQUFJLEdBQUcsRUFBa0M7UUFIckQsY0FBUyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ25DLGVBQVUsR0FBYSxFQUFFLENBQUM7UUFHekIsSUFBSSxDQUFDLE9BQU8scUJBRVIsSUFBSSxDQUNQLENBQUM7UUFDRixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbkMsSUFBSSxJQUFJLFlBQVksTUFBTTtvQkFDekIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUUzQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixDQUFDLENBQUMsQ0FBQztTQUNIO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFrQixFQUFFLFlBQThCO1FBQ3ZELEtBQUksTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUNoQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssdUJBQUUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDdEMsTUFBTSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEdBQUksSUFBSSxDQUFDLGVBQW9DLENBQUMsSUFBSSxDQUFDO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUM1RSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7d0JBQ3JDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzt3QkFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsV0FBVyxTQUFTLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xGLFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQzs0QkFDeEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUU7NEJBQ2pCLElBQUksRUFBRSxTQUFTLFdBQVcsZUFBZSxJQUFJLEtBQUs7eUJBQ2xELENBQUMsQ0FBQztxQkFDSDtpQkFDRDthQUNEO1NBQ0Q7SUFDRixDQUFDO0NBQ0Q7QUF2Q0Qsd0NBdUNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL2RlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtTeW50YXhLaW5kIGFzIHNrfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRyYW5zcGlsZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRDbGF1c2VUcmFuc3BpbGVPcHRpb25zIHtcblx0Ly8gZGVmYXVsdEltcG9ydDJyZXF1aXJlPzogYm9vbGVhbjtcblx0ZmlsZTogc3RyaW5nO1xuXHRtb2R1bGVzOiBBcnJheTxSZWdFeHB8c3RyaW5nPjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlIHtcblx0b3B0aW9uczogSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucztcblx0bW9kdWxlU2V0OiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcblx0bW9kdWxlUmVnczogUmVnRXhwW10gPSBbXTtcblxuXHRjb25zdHJ1Y3RvcihvcHRzID0ge30gYXMgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucykge1xuXHRcdHRoaXMub3B0aW9ucyA9IHtcblx0XHRcdC8vIGRlZmF1bHRJbXBvcnQycmVxdWlyZTogdHJ1ZSxcblx0XHRcdC4uLm9wdHNcblx0XHR9O1xuXHRcdGlmICh0aGlzLm9wdGlvbnMubW9kdWxlcykge1xuXHRcdFx0dGhpcy5vcHRpb25zLm1vZHVsZXMuZm9yRWFjaChuYW1lID0+IHtcblx0XHRcdFx0aWYgKG5hbWUgaW5zdGFuY2VvZiBSZWdFeHApXG5cdFx0XHRcdFx0dGhpcy5tb2R1bGVSZWdzLnB1c2gobmFtZSk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR0aGlzLm1vZHVsZVNldC5hZGQobmFtZSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRwYXJzZShhc3Q6IHRzLlNvdXJjZUZpbGUsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSkge1xuXHRcdGZvcihjb25zdCBzdG0gb2YgYXN0LnN0YXRlbWVudHMpIHtcblx0XHRcdGlmIChzdG0ua2luZCA9PT0gc2suSW1wb3J0RGVjbGFyYXRpb24pIHtcblx0XHRcdFx0Y29uc3Qgbm9kZSA9IHN0bSBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbjtcblx0XHRcdFx0Y29uc3QgZnJvbSA9IChub2RlLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuXHRcdFx0XHRpZiAodGhpcy5tb2R1bGVTZXQuaGFzKGZyb20pIHx8IHRoaXMubW9kdWxlUmVncy5zb21lKHJlZyA9PiByZWcudGVzdChmcm9tKSkpIHtcblx0XHRcdFx0XHRpZiAoXy5nZXQobm9kZSwgJ2ltcG9ydENsYXVzZS5uYW1lJykpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGRlZmF1bHROYW1lID0gbm9kZS5pbXBvcnRDbGF1c2UubmFtZS50ZXh0O1xuXHRcdFx0XHRcdFx0bG9nLmluZm8oYFJlcGxhY2U6IFwiaW1wb3J0ICR7ZGVmYXVsdE5hbWV9IGZyb20gJHtmcm9tfVwiIGluIGAgKyB0aGlzLm9wdGlvbnMuZmlsZSk7XG5cdFx0XHRcdFx0XHRyZXBsYWNlbWVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdHN0YXJ0OiBzdG0uZ2V0U3RhcnQoYXN0KSxcblx0XHRcdFx0XHRcdFx0ZW5kOiBzdG0uZ2V0RW5kKCksXG5cdFx0XHRcdFx0XHRcdHRleHQ6IGBjb25zdCAke2RlZmF1bHROYW1lfSA9IHJlcXVpcmUoJyR7ZnJvbX0nKTtgXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn1cbiJdfQ==
