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
/**
 * Because most of the legacy code is written in commonjs style,
 * babel-lodash-plugin can not help to tree-shake lodash bundle size.
 * This loader do help in solving this problem,
 * Replace "var _ = require('lodash')" to
 *   "var _ = {
 *         debounce: require('lodash/debound'),
 *         ...
 *   }" based on code analysis result.
 *
 */
const _ = __importStar(require("lodash"));
const log4js = __importStar(require("log4js"));
const ts = __importStar(require("typescript"));
// const chalk = require('chalk');
const patchText = require('../../lib/utils/patch-text');
var acorn = require('acorn');
var estraverse = require('estraverse-fb');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
acornjsx = acornImpInject(acornjsx);
const log = log4js.getLogger('wfh.require-lodash-loader');
const { getOptions } = require('loader-utils');
function loader(content, map) {
    var callback = this.async();
    if (!callback)
        throw new Error('api-loader is Not a sync loader!');
    if (getOptions(this).disabled) {
        return callback(null, content, map);
    }
    loadAsync(content, this)
        .then(result => callback(null, result, map))
        .catch(err => {
        log.error(err);
        callback(err);
    });
}
function loadAsync(code, loaderCtx) {
    const file = loaderCtx.resourcePath;
    if (file.endsWith('.js') || file.endsWith('.jsx'))
        return Promise.resolve(loader.doEs(code, file)[0]);
    else if (file.endsWith('.ts') || file.endsWith('.tsx'))
        return Promise.resolve(new loader.TSParser().doTs(code, file));
    return Promise.resolve(code);
}
(function (loader) {
    const DISABLE_BANNER = /\/\*\s*no\s+(?:import|require)-lodash-loader\s*\*\//;
    // module.exports.doEs = doEs;
    function doEs(code, file) {
        if (DISABLE_BANNER.test(code))
            return [code, null];
        var ast;
        var firstCompileErr = null;
        try {
            ast = acornjsx.parse(code, { allowHashBang: true, sourceType: 'module', plugins: { jsx: true, dynamicImport: true } });
        }
        catch (err) {
            firstCompileErr = err;
            try {
                ast = acornjsx.parse(code, { allowHashBang: true, plugins: { jsx: true, dynamicImport: true } });
            }
            catch (err2) {
                firstCompileErr.message += '\nOr ' + err2.message;
                firstCompileErr.stack += '\nAnother possible compilation error is\n' + err2.stack;
                throw firstCompileErr;
            }
        }
        const patches = [];
        // let lodashImported = false;
        let requireLodashPos = null;
        // let hasExports = false;
        const lodashFunctions = new Set();
        estraverse.traverse(ast, {
            enter(node, parent) {
                if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
                    node.callee.object.name === '_' && node.callee.object.type === 'Identifier' &&
                    node.callee.property.type === 'Identifier') {
                    lodashFunctions.add(node.callee.property.name);
                }
                if (node.type === 'VariableDeclarator' && _.get(node, 'id.name') === '_' &&
                    _.get(parent, 'declarations.length') === 1) {
                    const init = node.init;
                    if (init.type === 'CallExpression' && _.get(init, 'callee.name') === 'require' &&
                        _.get(init, 'arguments[0].value') === 'lodash') {
                        requireLodashPos = [parent.start, parent.end];
                    }
                }
                else if (parent && parent.type === 'ExpressionStatement' && node.type === 'CallExpression' &&
                    _.get(node, 'callee.name') === 'require' &&
                    _.get(node, 'arguments[0].value') === 'lodash' && parent.type === 'ExpressionStatement') {
                    log.debug('Remove orphan statement require("lodash") from\n%s  ', file);
                    patches.push({
                        start: parent.start,
                        end: parent.end,
                        replacement: ''
                    });
                }
            },
            leave(node, parent) {
            },
            keys: {
                Import: [], JSXText: []
            }
        });
        return [doTranspile(code, patches, requireLodashPos, lodashFunctions), ast];
    }
    loader.doEs = doEs;
    function doTranspile(code, patches, requireLodashPos, lodashFunctions, isTypescript = false) {
        if (requireLodashPos) {
            if (lodashFunctions.size > 0) {
                let code = `var _${isTypescript ? ': any' : ''} = {`;
                let i = 0;
                lodashFunctions.forEach(funcName => {
                    if (i++ > 0)
                        code += ', ';
                    code += `${funcName}: require('lodash/${funcName}')`;
                });
                code += '};';
                patches.push({
                    start: requireLodashPos[0],
                    end: requireLodashPos[1],
                    replacement: code
                });
            }
            else {
                patches.push({
                    start: requireLodashPos[0],
                    end: requireLodashPos[1],
                    replacement: ''
                });
            }
            return patchText(code, patches);
        }
        else if (patches) {
            return patchText(code, patches);
        }
        return code;
    }
    class TSParser {
        constructor() {
            // private hasLodashCall = false;
            // private lodashImported = false;
            this.requireLodashPos = null;
            this.lodashFunctions = new Set();
            this.patches = [];
        }
        doTs(code, file) {
            this.file = file;
            const srcfile = ts.createSourceFile('file', code, ts.ScriptTarget.ES2015);
            for (const stm of srcfile.statements) {
                this.traverseTsAst(stm, srcfile);
            }
            // if (this.patches.length > 0) {
            // 	code = patchText(code, this.patches);
            // 	code = 'import * as _ from \'lodash\';\n' + code;
            // 	log.debug('Replace require("lodash") with import syntax in\n  ', chalk.yellow(file));
            // } else if (this.hasLodashCall && !this.lodashImported) {
            // 	log.debug('%s\n  has lodash function call, but has no lodash imported in source code', chalk.yellow(file));
            // 	code = 'import * as _ from \'lodash\';\n' + code;
            // }
            return doTranspile(code, this.patches, this.requireLodashPos, this.lodashFunctions, true);
        }
        traverseTsAst(ast, srcfile, level = 0) {
            const SyntaxKind = ts.SyntaxKind;
            if (ast.kind === SyntaxKind.CallExpression) {
                const node = ast;
                if (node.expression.kind === SyntaxKind.PropertyAccessExpression) {
                    const left = node.expression.expression;
                    const right = node.expression.name;
                    if (left.kind === SyntaxKind.Identifier && left.text === '_' &&
                        right.kind === SyntaxKind.Identifier) {
                        this.lodashFunctions.add(right.text);
                        // this.hasLodashCall = true;
                    }
                }
            }
            // if (ast.kind === SyntaxKind.ImportDeclaration && ((ast as ts.ImportDeclaration)
            // .moduleSpecifier as ts.StringLiteral).text === 'lodash') {
            // 	this.lodashImported = true;
            // } else 
            if (ast.kind === SyntaxKind.VariableStatement) {
                const decs = ast.declarationList.declarations;
                decs.some(dec => {
                    if (dec.initializer && dec.initializer.kind === SyntaxKind.CallExpression) {
                        const callExp = dec.initializer;
                        if (callExp.expression.kind === SyntaxKind.Identifier &&
                            callExp.expression.text === 'require' && callExp.arguments[0].text === 'lodash') {
                            this.requireLodashPos = [ast.pos, ast.end];
                            // this.patches.push({
                            // 	start: ast.pos,
                            // 	end: ast.end,
                            // 	replacement: ''
                            // });
                            return true;
                        }
                    }
                    return false;
                });
            }
            else if (ast.kind === SyntaxKind.ExpressionStatement &&
                ast.expression.kind === SyntaxKind.CallExpression) {
                const callExp = ast.expression;
                if (callExp.expression.kind === SyntaxKind.Identifier && callExp.expression.text === 'require' &&
                    callExp.arguments[0].text === 'lodash') {
                    log.debug('Remove orphan statement require("lodash") from\n  ', this.file);
                    this.patches.push({
                        start: ast.pos,
                        end: ast.end,
                        replacement: ''
                    });
                }
            }
            ast.forEachChild((sub) => {
                this.traverseTsAst(sub, srcfile, level + 1);
            });
        }
    }
    loader.TSParser = TSParser;
})(loader || (loader = {}));
module.exports = loader;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2xlZ2FjeS93ZWJwYWNrMi1idWlsZGVyL3RzL2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTs7Ozs7Ozs7OztHQVVHO0FBQ0gsMENBQTRCO0FBQzVCLCtDQUFpQztBQUNqQywrQ0FBaUM7QUFDakMsa0NBQWtDO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3hELElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDMUMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEQsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hFLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFELE1BQU0sRUFBQyxVQUFVLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFN0MsU0FBUyxNQUFNLENBQUMsT0FBZSxFQUFFLEdBQVE7SUFDdkMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBQ3RELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtRQUM3QixPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDO0lBQ0QsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7U0FDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDM0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1gsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNmLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLFNBQVMsQ0FBQyxJQUFZLEVBQUUsU0FBYztJQUM3QyxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDO0lBQ3BDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUMvQyxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNoRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDcEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNqRSxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELFdBQVUsTUFBTTtJQUNoQixNQUFNLGNBQWMsR0FBRyxxREFBcUQsQ0FBQztJQUU3RSw4QkFBOEI7SUFFOUIsU0FBZ0IsSUFBSSxDQUFDLElBQVksRUFBRSxJQUFZO1FBQzdDLElBQUksY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDM0IsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN0QixJQUFJLEdBQUcsQ0FBQztRQUNSLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQztRQUMzQixJQUFJO1lBQ0YsR0FBRyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBQyxFQUFDLENBQUMsQ0FBQztTQUNwSDtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osZUFBZSxHQUFHLEdBQUcsQ0FBQztZQUN0QixJQUFJO2dCQUNGLEdBQUcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFDLEVBQUMsQ0FBQyxDQUFDO2FBQzlGO1lBQUMsT0FBTyxJQUFJLEVBQUU7Z0JBQ2IsZUFBZSxDQUFDLE9BQU8sSUFBSSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDbEQsZUFBZSxDQUFDLEtBQUssSUFBSSwyQ0FBMkMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNsRixNQUFNLGVBQWUsQ0FBQzthQUN2QjtTQUNGO1FBQ0QsTUFBTSxPQUFPLEdBQTZELEVBQUUsQ0FBQztRQUU3RSw4QkFBOEI7UUFDOUIsSUFBSSxnQkFBZ0IsR0FBNEIsSUFBSSxDQUFDO1FBQ3JELDBCQUEwQjtRQUMxQixNQUFNLGVBQWUsR0FBZ0IsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUV2RCxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUN2QixLQUFLLENBQUMsSUFBUyxFQUFFLE1BQVc7Z0JBQzFCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxrQkFBa0I7b0JBQzNFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLFlBQVk7b0JBQzNFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksS0FBSyxZQUFZLEVBQUU7b0JBQzVDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hEO2dCQUNELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxvQkFBb0IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsS0FBSyxHQUFHO29CQUN4RSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDMUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDdkIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxLQUFLLFNBQVM7d0JBQzVFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLEtBQUssUUFBUSxFQUFFO3dCQUM5QyxnQkFBZ0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUNqRDtpQkFDRjtxQkFBTSxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLHFCQUFxQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssZ0JBQWdCO29CQUM1RixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsS0FBSyxTQUFTO29CQUN4QyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLHFCQUFxQixFQUFFO29CQUN2RixHQUFHLENBQUMsS0FBSyxDQUFDLHNEQUFzRCxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUN4RSxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNYLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSzt3QkFDbkIsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHO3dCQUNmLFdBQVcsRUFBRSxFQUFFO3FCQUNoQixDQUFDLENBQUM7aUJBQ0o7WUFDSCxDQUFDO1lBQ0QsS0FBSyxDQUFDLElBQVMsRUFBRSxNQUFXO1lBQzVCLENBQUM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0osTUFBTSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRTthQUN4QjtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBekRlLFdBQUksT0F5RG5CLENBQUE7SUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQy9CLE9BQWlFLEVBQ2pFLGdCQUF5QyxFQUFFLGVBQTRCLEVBQUUsWUFBWSxHQUFHLEtBQUs7UUFDN0YsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixJQUFJLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxFQUFFO2dCQUM1QixJQUFJLElBQUksR0FBRyxRQUFRLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztnQkFDckQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNWLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUU7b0JBQ2pDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQzt3QkFDVCxJQUFJLElBQUksSUFBSSxDQUFDO29CQUNmLElBQUksSUFBSSxHQUFHLFFBQVEscUJBQXFCLFFBQVEsSUFBSSxDQUFDO2dCQUN2RCxDQUFDLENBQUMsQ0FBQztnQkFDSCxJQUFJLElBQUksSUFBSSxDQUFDO2dCQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztvQkFDMUIsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztvQkFDeEIsV0FBVyxFQUFFLElBQUk7aUJBQ2xCLENBQUMsQ0FBQzthQUNKO2lCQUFNO2dCQUNMLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztvQkFDMUIsR0FBRyxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztvQkFDeEIsV0FBVyxFQUFFLEVBQUU7aUJBQ2hCLENBQUMsQ0FBQzthQUNKO1lBQ0QsT0FBTyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2pDO2FBQU0sSUFBSSxPQUFPLEVBQUU7WUFDbEIsT0FBTyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1NBQ2pDO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsTUFBYSxRQUFRO1FBQXJCO1lBQ0UsaUNBQWlDO1lBQ2pDLGtDQUFrQztZQUMxQixxQkFBZ0IsR0FBNEIsSUFBSSxDQUFDO1lBQ2pELG9CQUFlLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUM7WUFHakQsWUFBTyxHQUE2RCxFQUFFLENBQUM7UUF3RWpGLENBQUM7UUF0RUMsSUFBSSxDQUFDLElBQVksRUFBRSxJQUFZO1lBQzdCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDMUUsS0FBSSxNQUFNLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFO2dCQUNuQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUNsQztZQUNELGlDQUFpQztZQUNqQyx5Q0FBeUM7WUFDekMscURBQXFEO1lBQ3JELHlGQUF5RjtZQUN6RiwyREFBMkQ7WUFDM0QsK0dBQStHO1lBQy9HLHFEQUFxRDtZQUNyRCxJQUFJO1lBQ0osT0FBTyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDNUYsQ0FBQztRQUVPLGFBQWEsQ0FBQyxHQUFZLEVBQUUsT0FBc0IsRUFBRSxLQUFLLEdBQUcsQ0FBQztZQUNuRSxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ2pDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsY0FBYyxFQUFFO2dCQUMxQyxNQUFNLElBQUksR0FBRyxHQUF3QixDQUFDO2dCQUN0QyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRTtvQkFDaEUsTUFBTSxJQUFJLEdBQUksSUFBSSxDQUFDLFVBQTBDLENBQUMsVUFBVSxDQUFDO29CQUN6RSxNQUFNLEtBQUssR0FBSSxJQUFJLENBQUMsVUFBMEMsQ0FBQyxJQUFJLENBQUM7b0JBQ3BFLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVSxJQUFLLElBQXNCLENBQUMsSUFBSSxLQUFLLEdBQUc7d0JBQzdFLEtBQUssQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLFVBQVUsRUFBRTt3QkFDdEMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNyQyw2QkFBNkI7cUJBQzlCO2lCQUNGO2FBQ0Y7WUFDRCxrRkFBa0Y7WUFDbEYsNkRBQTZEO1lBQzdELCtCQUErQjtZQUMvQixVQUFVO1lBQ1YsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRTtnQkFDN0MsTUFBTSxJQUFJLEdBQUksR0FBNEIsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDO2dCQUN4RSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUNkLElBQUksR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsY0FBYyxFQUFFO3dCQUN6RSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsV0FBZ0MsQ0FBQzt3QkFDckQsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVTs0QkFDbEQsT0FBTyxDQUFDLFVBQTRCLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBUyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7NEJBQzNHLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUM3QyxzQkFBc0I7NEJBQ3RCLG1CQUFtQjs0QkFDbkIsaUJBQWlCOzRCQUNqQixtQkFBbUI7NEJBQ25CLE1BQU07NEJBQ04sT0FBTyxJQUFJLENBQUM7eUJBQ2I7cUJBQ0Y7b0JBQ0QsT0FBTyxLQUFLLENBQUM7Z0JBQ2YsQ0FBQyxDQUFDLENBQUM7YUFDSjtpQkFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFDLG1CQUFtQjtnQkFDbkQsR0FBOEIsQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxjQUFjLEVBQUU7Z0JBQy9FLE1BQU0sT0FBTyxHQUFJLEdBQThCLENBQUMsVUFBK0IsQ0FBQztnQkFDaEYsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSyxVQUFVLENBQUMsVUFBVSxJQUFLLE9BQU8sQ0FBQyxVQUE0QixDQUFDLElBQUksS0FBSyxTQUFTO29CQUNoSCxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBUyxDQUFDLElBQUksS0FBSyxRQUFRLEVBQUU7b0JBQy9DLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0RBQW9ELEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUMzRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO3dCQUNkLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRzt3QkFDWixXQUFXLEVBQUUsRUFBRTtxQkFDaEIsQ0FBQyxDQUFDO2lCQUNKO2FBQ0Y7WUFDRCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQ0Y7SUEvRVksZUFBUSxXQStFcEIsQ0FBQTtBQUNELENBQUMsRUFoTFMsTUFBTSxLQUFOLE1BQU0sUUFnTGY7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoibGVnYWN5L3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9saWIvcmVxdWlyZS1sb2Rhc2gtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
