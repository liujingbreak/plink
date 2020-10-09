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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy9kZWZhdWx0LWltcG9ydC10cy10cmFuc3BpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLDJDQUE0QztBQUU1QywwQ0FBNEI7QUFDNUIsa0RBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztBQVF6RSxNQUFxQixxQkFBcUI7SUFLeEMsWUFBWSxPQUFPLEVBQWtDO1FBSHJELGNBQVMsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNuQyxlQUFVLEdBQWEsRUFBRSxDQUFDO1FBR3hCLElBQUksQ0FBQyxPQUFPLHFCQUVQLElBQUksQ0FDUixDQUFDO1FBQ0YsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ2xDLElBQUksSUFBSSxZQUFZLE1BQU07b0JBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFFM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBa0IsRUFBRSxZQUE4QjtRQUN0RCxLQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLEVBQUU7WUFDL0IsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHVCQUFFLENBQUMsaUJBQWlCLEVBQUU7Z0JBQ3JDLE1BQU0sSUFBSSxHQUFHLEdBQTJCLENBQUM7Z0JBQ3pDLE1BQU0sSUFBSSxHQUFJLElBQUksQ0FBQyxlQUFvQyxDQUFDLElBQUksQ0FBQztnQkFDN0QsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRTtvQkFDM0UsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO3dCQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBYSxDQUFDLElBQUssQ0FBQyxJQUFJLENBQUM7d0JBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLFdBQVcsU0FBUyxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNsRixZQUFZLENBQUMsSUFBSSxDQUFDOzRCQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7NEJBQ3hCLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxFQUFFOzRCQUNqQixJQUFJLEVBQUUsU0FBUyxXQUFXLGVBQWUsSUFBSSxLQUFLO3lCQUNuRCxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7YUFDRjtTQUNGO0lBQ0gsQ0FBQztDQUNGO0FBdkNELHdDQXVDQyIsImZpbGUiOiJkaXN0L3V0aWxzL2RlZmF1bHQtaW1wb3J0LXRzLXRyYW5zcGlsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
