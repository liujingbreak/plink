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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDJDQUE0QztBQUU1QyxrREFBNEI7QUFDNUIsMERBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztBQVF6RSxNQUFxQixxQkFBcUI7SUFLeEMsWUFBWSxJQUFJLEdBQUcsRUFBa0M7UUFIckQsY0FBUyxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ25DLGVBQVUsR0FBYSxFQUFFLENBQUM7UUFHeEIsSUFBSSxDQUFDLE9BQU8scUJBRVAsSUFBSSxDQUNSLENBQUM7UUFDRixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFO1lBQ3hCLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDbEMsSUFBSSxJQUFJLFlBQVksTUFBTTtvQkFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUUzQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFrQixFQUFFLFlBQThCO1FBQ3RELEtBQUksTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFVBQVUsRUFBRTtZQUMvQixJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssdUJBQUUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDckMsTUFBTSxJQUFJLEdBQUcsR0FBMkIsQ0FBQztnQkFDekMsTUFBTSxJQUFJLEdBQUksSUFBSSxDQUFDLGVBQW9DLENBQUMsSUFBSSxDQUFDO2dCQUM3RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUMzRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLEVBQUU7d0JBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzt3QkFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsV0FBVyxTQUFTLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xGLFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQzs0QkFDeEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEVBQUU7NEJBQ2pCLElBQUksRUFBRSxTQUFTLFdBQVcsZUFBZSxJQUFJLEtBQUs7eUJBQ25ELENBQUMsQ0FBQztxQkFDSjtpQkFDRjthQUNGO1NBQ0Y7SUFDSCxDQUFDO0NBQ0Y7QUF2Q0Qsd0NBdUNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3V0aWxzL2RlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtTeW50YXhLaW5kIGFzIHNrfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRyYW5zcGlsZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRDbGF1c2VUcmFuc3BpbGVPcHRpb25zIHtcbiAgLy8gZGVmYXVsdEltcG9ydDJyZXF1aXJlPzogYm9vbGVhbjtcbiAgZmlsZTogc3RyaW5nO1xuICBtb2R1bGVzOiBBcnJheTxSZWdFeHB8c3RyaW5nPjtcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlIHtcbiAgb3B0aW9uczogSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucztcbiAgbW9kdWxlU2V0OiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcbiAgbW9kdWxlUmVnczogUmVnRXhwW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihvcHRzID0ge30gYXMgSW1wb3J0Q2xhdXNlVHJhbnNwaWxlT3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IHtcbiAgICAgIC8vIGRlZmF1bHRJbXBvcnQycmVxdWlyZTogdHJ1ZSxcbiAgICAgIC4uLm9wdHNcbiAgICB9O1xuICAgIGlmICh0aGlzLm9wdGlvbnMubW9kdWxlcykge1xuICAgICAgdGhpcy5vcHRpb25zLm1vZHVsZXMuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgaWYgKG5hbWUgaW5zdGFuY2VvZiBSZWdFeHApXG4gICAgICAgICAgdGhpcy5tb2R1bGVSZWdzLnB1c2gobmFtZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICB0aGlzLm1vZHVsZVNldC5hZGQobmFtZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwYXJzZShhc3Q6IHRzLlNvdXJjZUZpbGUsIHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSkge1xuICAgIGZvcihjb25zdCBzdG0gb2YgYXN0LnN0YXRlbWVudHMpIHtcbiAgICAgIGlmIChzdG0ua2luZCA9PT0gc2suSW1wb3J0RGVjbGFyYXRpb24pIHtcbiAgICAgICAgY29uc3Qgbm9kZSA9IHN0bSBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbjtcbiAgICAgICAgY29uc3QgZnJvbSA9IChub2RlLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICBpZiAodGhpcy5tb2R1bGVTZXQuaGFzKGZyb20pIHx8IHRoaXMubW9kdWxlUmVncy5zb21lKHJlZyA9PiByZWcudGVzdChmcm9tKSkpIHtcbiAgICAgICAgICBpZiAoXy5nZXQobm9kZSwgJ2ltcG9ydENsYXVzZS5uYW1lJykpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZmF1bHROYW1lID0gbm9kZS5pbXBvcnRDbGF1c2UubmFtZS50ZXh0O1xuICAgICAgICAgICAgbG9nLmluZm8oYFJlcGxhY2U6IFwiaW1wb3J0ICR7ZGVmYXVsdE5hbWV9IGZyb20gJHtmcm9tfVwiIGluIGAgKyB0aGlzLm9wdGlvbnMuZmlsZSk7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgIHN0YXJ0OiBzdG0uZ2V0U3RhcnQoYXN0KSxcbiAgICAgICAgICAgICAgZW5kOiBzdG0uZ2V0RW5kKCksXG4gICAgICAgICAgICAgIHRleHQ6IGBjb25zdCAke2RlZmF1bHROYW1lfSA9IHJlcXVpcmUoJyR7ZnJvbX0nKTtgXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==
