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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZS1sb2Rhc2gtbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVxdWlyZS1sb2Rhc2gtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7R0FVRztBQUNILDBDQUE0QjtBQUM1QiwrQ0FBaUM7QUFDakMsK0NBQWlDO0FBQ2pDLGtDQUFrQztBQUNsQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUN4RCxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzFDLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2xELElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN4RSxRQUFRLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUMxRCxNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRTdDLFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxHQUFRO0lBQ3ZDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUTtRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUN0RCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUU7UUFDN0IsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNyQztJQUNELFNBQVMsQ0FBQyxP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QUFJLENBQUMsQ0FBQztvQkFDM0UsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7d0JBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRzt3QkFDZCxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7d0JBQ1osV0FBVyxFQUFFLEVBQUU7cUJBQ2hCLENBQUMsQ0FBQztpQkFDSjthQUNGO1lBQ0QsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQVksRUFBRSxFQUFFO2dCQUNoQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzlDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUNGO0lBL0VZLGVBQVEsV0ErRXBCLENBQUE7QUFDRCxDQUFDLEVBaExTLE1BQU0sS0FBTixNQUFNLFFBZ0xmO0FBRUQsaUJBQVMsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCZWNhdXNlIG1vc3Qgb2YgdGhlIGxlZ2FjeSBjb2RlIGlzIHdyaXR0ZW4gaW4gY29tbW9uanMgc3R5bGUsXG4gKiBiYWJlbC1sb2Rhc2gtcGx1Z2luIGNhbiBub3QgaGVscCB0byB0cmVlLXNoYWtlIGxvZGFzaCBidW5kbGUgc2l6ZS5cbiAqIFRoaXMgbG9hZGVyIGRvIGhlbHAgaW4gc29sdmluZyB0aGlzIHByb2JsZW0sXG4gKiBSZXBsYWNlIFwidmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKVwiIHRvIFxuICogICBcInZhciBfID0ge1xuICogICAgICAgICBkZWJvdW5jZTogcmVxdWlyZSgnbG9kYXNoL2RlYm91bmQnKSxcbiAqICAgICAgICAgLi4uXG4gKiAgIH1cIiBiYXNlZCBvbiBjb2RlIGFuYWx5c2lzIHJlc3VsdC5cbiAqXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG4vLyBjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBwYXRjaFRleHQgPSByZXF1aXJlKCcuLi8uLi9saWIvdXRpbHMvcGF0Y2gtdGV4dCcpO1xudmFyIGFjb3JuID0gcmVxdWlyZSgnYWNvcm4nKTtcbnZhciBlc3RyYXZlcnNlID0gcmVxdWlyZSgnZXN0cmF2ZXJzZS1mYicpO1xudmFyIGFjb3JuanN4ID0gcmVxdWlyZSgnYWNvcm4tanN4L2luamVjdCcpKGFjb3JuKTtcbnZhciBhY29ybkltcEluamVjdCA9IHJlcXVpcmUoJ2Fjb3JuLWR5bmFtaWMtaW1wb3J0L2xpYi9pbmplY3QnKS5kZWZhdWx0O1xuYWNvcm5qc3ggPSBhY29ybkltcEluamVjdChhY29ybmpzeCk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmgucmVxdWlyZS1sb2Rhc2gtbG9hZGVyJyk7XG5jb25zdCB7Z2V0T3B0aW9uc30gPSByZXF1aXJlKCdsb2FkZXItdXRpbHMnKTtcblxuZnVuY3Rpb24gbG9hZGVyKGNvbnRlbnQ6IHN0cmluZywgbWFwOiBhbnkpIHtcbiAgdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuICBpZiAoIWNhbGxiYWNrKVxuICAgIHRocm93IG5ldyBFcnJvcignYXBpLWxvYWRlciBpcyBOb3QgYSBzeW5jIGxvYWRlciEnKTtcbiAgaWYgKGdldE9wdGlvbnModGhpcykuZGlzYWJsZWQpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY29udGVudCwgbWFwKTtcbiAgfVxuICBsb2FkQXN5bmMoY29udGVudCwgdGhpcylcbiAgLnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCwgbWFwKSlcbiAgLmNhdGNoKGVyciA9PiB7XG4gICAgbG9nLmVycm9yKGVycik7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRBc3luYyhjb2RlOiBzdHJpbmcsIGxvYWRlckN0eDogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZmlsZSA9IGxvYWRlckN0eC5yZXNvdXJjZVBhdGg7XG4gIGlmIChmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuanN4JykpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShsb2FkZXIuZG9Fcyhjb2RlLCBmaWxlKVswXSk7XG4gIGVsc2UgaWYgKGZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy50c3gnKSlcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBsb2FkZXIuVFNQYXJzZXIoKS5kb1RzKGNvZGUsIGZpbGUpKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjb2RlKTtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG5jb25zdCBESVNBQkxFX0JBTk5FUiA9IC9cXC9cXCpcXHMqbm9cXHMrKD86aW1wb3J0fHJlcXVpcmUpLWxvZGFzaC1sb2FkZXJcXHMqXFwqXFwvLztcblxuLy8gbW9kdWxlLmV4cG9ydHMuZG9FcyA9IGRvRXM7XG5cbmV4cG9ydCBmdW5jdGlvbiBkb0VzKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nKTogW3N0cmluZywgYW55XSB7XG4gIGlmIChESVNBQkxFX0JBTk5FUi50ZXN0KGNvZGUpKVxuICAgIHJldHVybiBbY29kZSwgbnVsbF07XG4gIHZhciBhc3Q7XG4gIHZhciBmaXJzdENvbXBpbGVFcnIgPSBudWxsO1xuICB0cnkge1xuICAgIGFzdCA9IGFjb3JuanN4LnBhcnNlKGNvZGUsIHthbGxvd0hhc2hCYW5nOiB0cnVlLCBzb3VyY2VUeXBlOiAnbW9kdWxlJywgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlyc3RDb21waWxlRXJyID0gZXJyO1xuICAgIHRyeSB7XG4gICAgICBhc3QgPSBhY29ybmpzeC5wYXJzZShjb2RlLCB7YWxsb3dIYXNoQmFuZzogdHJ1ZSwgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcbiAgICB9IGNhdGNoIChlcnIyKSB7XG4gICAgICBmaXJzdENvbXBpbGVFcnIubWVzc2FnZSArPSAnXFxuT3IgJyArIGVycjIubWVzc2FnZTtcbiAgICAgIGZpcnN0Q29tcGlsZUVyci5zdGFjayArPSAnXFxuQW5vdGhlciBwb3NzaWJsZSBjb21waWxhdGlvbiBlcnJvciBpc1xcbicgKyBlcnIyLnN0YWNrO1xuICAgICAgdGhyb3cgZmlyc3RDb21waWxlRXJyO1xuICAgIH1cbiAgfVxuICBjb25zdCBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PiA9IFtdO1xuXG4gIC8vIGxldCBsb2Rhc2hJbXBvcnRlZCA9IGZhbHNlO1xuICBsZXQgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSB8IG51bGwgPSBudWxsO1xuICAvLyBsZXQgaGFzRXhwb3J0cyA9IGZhbHNlO1xuICBjb25zdCBsb2Rhc2hGdW5jdGlvbnM6IFNldDxzdHJpbmc+ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZXN0cmF2ZXJzZS50cmF2ZXJzZShhc3QsIHtcbiAgICBlbnRlcihub2RlOiBhbnksIHBhcmVudDogYW55KSB7XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIG5vZGUuY2FsbGVlLnR5cGUgPT09ICdNZW1iZXJFeHByZXNzaW9uJyAmJlxuICAgICAgICBub2RlLmNhbGxlZS5vYmplY3QubmFtZSA9PT0gJ18nICYmIG5vZGUuY2FsbGVlLm9iamVjdC50eXBlID09PSAnSWRlbnRpZmllcicgJiZcbiAgICAgICAgbm9kZS5jYWxsZWUucHJvcGVydHkudHlwZSA9PT0gJ0lkZW50aWZpZXInKSB7XG4gICAgICAgIGxvZGFzaEZ1bmN0aW9ucy5hZGQobm9kZS5jYWxsZWUucHJvcGVydHkubmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnVmFyaWFibGVEZWNsYXJhdG9yJyAmJiBfLmdldChub2RlLCAnaWQubmFtZScpID09PSAnXycgJiZcbiAgICAgIF8uZ2V0KHBhcmVudCwgJ2RlY2xhcmF0aW9ucy5sZW5ndGgnKSA9PT0gMSkge1xuICAgICAgICBjb25zdCBpbml0ID0gbm9kZS5pbml0O1xuICAgICAgICBpZiAoaW5pdC50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIF8uZ2V0KGluaXQsICdjYWxsZWUubmFtZScpID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgICBfLmdldChpbml0LCAnYXJndW1lbnRzWzBdLnZhbHVlJykgPT09ICdsb2Rhc2gnKSB7XG4gICAgICAgICAgICByZXF1aXJlTG9kYXNoUG9zID0gW3BhcmVudC5zdGFydCwgcGFyZW50LmVuZF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocGFyZW50ICYmIHBhcmVudC50eXBlID09PSAnRXhwcmVzc2lvblN0YXRlbWVudCcgJiYgbm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmXG4gICAgICBfLmdldChub2RlLCAnY2FsbGVlLm5hbWUnKSA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICBfLmdldChub2RlLCAnYXJndW1lbnRzWzBdLnZhbHVlJykgPT09ICdsb2Rhc2gnICYmIHBhcmVudC50eXBlID09PSAnRXhwcmVzc2lvblN0YXRlbWVudCcpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdSZW1vdmUgb3JwaGFuIHN0YXRlbWVudCByZXF1aXJlKFwibG9kYXNoXCIpIGZyb21cXG4lcyAgJywgZmlsZSk7XG4gICAgICAgIHBhdGNoZXMucHVzaCh7XG4gICAgICAgICAgc3RhcnQ6IHBhcmVudC5zdGFydCxcbiAgICAgICAgICBlbmQ6IHBhcmVudC5lbmQsXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGVhdmUobm9kZTogYW55LCBwYXJlbnQ6IGFueSkge1xuICAgIH0sXG4gICAga2V5czoge1xuICAgICAgSW1wb3J0OiBbXSwgSlNYVGV4dDogW11cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBbZG9UcmFuc3BpbGUoY29kZSwgcGF0Y2hlcywgcmVxdWlyZUxvZGFzaFBvcywgbG9kYXNoRnVuY3Rpb25zKSwgYXN0XTtcbn1cblxuZnVuY3Rpb24gZG9UcmFuc3BpbGUoY29kZTogc3RyaW5nLFxuICBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PixcbiAgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSB8IG51bGwsIGxvZGFzaEZ1bmN0aW9uczogU2V0PHN0cmluZz4sIGlzVHlwZXNjcmlwdCA9IGZhbHNlKTogc3RyaW5nIHtcbiAgaWYgKHJlcXVpcmVMb2Rhc2hQb3MpIHtcbiAgICBpZiAobG9kYXNoRnVuY3Rpb25zLnNpemUgPiAwKSB7XG4gICAgICBsZXQgY29kZSA9IGB2YXIgXyR7aXNUeXBlc2NyaXB0ID8gJzogYW55JyA6ICcnfSA9IHtgO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgbG9kYXNoRnVuY3Rpb25zLmZvckVhY2goZnVuY05hbWUgPT4ge1xuICAgICAgICBpZiAoaSsrID4gMClcbiAgICAgICAgICBjb2RlICs9ICcsICc7XG4gICAgICAgIGNvZGUgKz0gYCR7ZnVuY05hbWV9OiByZXF1aXJlKCdsb2Rhc2gvJHtmdW5jTmFtZX0nKWA7XG4gICAgICB9KTtcbiAgICAgIGNvZGUgKz0gJ307JztcbiAgICAgIHBhdGNoZXMucHVzaCh7XG4gICAgICAgIHN0YXJ0OiByZXF1aXJlTG9kYXNoUG9zWzBdLFxuICAgICAgICBlbmQ6IHJlcXVpcmVMb2Rhc2hQb3NbMV0sXG4gICAgICAgIHJlcGxhY2VtZW50OiBjb2RlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IHJlcXVpcmVMb2Rhc2hQb3NbMF0sXG4gICAgICAgIGVuZDogcmVxdWlyZUxvZGFzaFBvc1sxXSxcbiAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKTtcbiAgfSBlbHNlIGlmIChwYXRjaGVzKSB7XG4gICAgcmV0dXJuIHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKTtcbiAgfVxuICByZXR1cm4gY29kZTtcbn1cblxuZXhwb3J0IGNsYXNzIFRTUGFyc2VyIHtcbiAgLy8gcHJpdmF0ZSBoYXNMb2Rhc2hDYWxsID0gZmFsc2U7XG4gIC8vIHByaXZhdGUgbG9kYXNoSW1wb3J0ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZXF1aXJlTG9kYXNoUG9zOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbG9kYXNoRnVuY3Rpb25zOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIHByaXZhdGUgZmlsZTogc3RyaW5nO1xuICBwcml2YXRlIHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+ID0gW107XG5cbiAgZG9Ucyhjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgdGhpcy5maWxlID0gZmlsZTtcbiAgICBjb25zdCBzcmNmaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZSgnZmlsZScsIGNvZGUsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpO1xuICAgIGZvcihjb25zdCBzdG0gb2Ygc3JjZmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtLCBzcmNmaWxlKTtcbiAgICB9XG4gICAgLy8gaWYgKHRoaXMucGF0Y2hlcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gXHRjb2RlID0gcGF0Y2hUZXh0KGNvZGUsIHRoaXMucGF0Y2hlcyk7XG4gICAgLy8gXHRjb2RlID0gJ2ltcG9ydCAqIGFzIF8gZnJvbSBcXCdsb2Rhc2hcXCc7XFxuJyArIGNvZGU7XG4gICAgLy8gXHRsb2cuZGVidWcoJ1JlcGxhY2UgcmVxdWlyZShcImxvZGFzaFwiKSB3aXRoIGltcG9ydCBzeW50YXggaW5cXG4gICcsIGNoYWxrLnllbGxvdyhmaWxlKSk7XG4gICAgLy8gfSBlbHNlIGlmICh0aGlzLmhhc0xvZGFzaENhbGwgJiYgIXRoaXMubG9kYXNoSW1wb3J0ZWQpIHtcbiAgICAvLyBcdGxvZy5kZWJ1ZygnJXNcXG4gIGhhcyBsb2Rhc2ggZnVuY3Rpb24gY2FsbCwgYnV0IGhhcyBubyBsb2Rhc2ggaW1wb3J0ZWQgaW4gc291cmNlIGNvZGUnLCBjaGFsay55ZWxsb3coZmlsZSkpO1xuICAgIC8vIFx0Y29kZSA9ICdpbXBvcnQgKiBhcyBfIGZyb20gXFwnbG9kYXNoXFwnO1xcbicgKyBjb2RlO1xuICAgIC8vIH1cbiAgICByZXR1cm4gZG9UcmFuc3BpbGUoY29kZSwgdGhpcy5wYXRjaGVzLCB0aGlzLnJlcXVpcmVMb2Rhc2hQb3MsIHRoaXMubG9kYXNoRnVuY3Rpb25zLCB0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIHNyY2ZpbGU6IHRzLlNvdXJjZUZpbGUsIGxldmVsID0gMCkge1xuICAgIGNvbnN0IFN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kO1xuICAgIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pIHtcbiAgICAgICAgY29uc3QgbGVmdCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCByaWdodCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lO1xuICAgICAgICBpZiAobGVmdC5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiYgKGxlZnQgYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ18nICYmXG4gICAgICAgICAgcmlnaHQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgdGhpcy5sb2Rhc2hGdW5jdGlvbnMuYWRkKHJpZ2h0LnRleHQpO1xuICAgICAgICAgIC8vIHRoaXMuaGFzTG9kYXNoQ2FsbCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uICYmICgoYXN0IGFzIHRzLkltcG9ydERlY2xhcmF0aW9uKVxuICAgIC8vIC5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ2xvZGFzaCcpIHtcbiAgICAvLyBcdHRoaXMubG9kYXNoSW1wb3J0ZWQgPSB0cnVlO1xuICAgIC8vIH0gZWxzZSBcbiAgICBpZiAoYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQpIHtcbiAgICAgIGNvbnN0IGRlY3MgPSAoYXN0IGFzIHRzLlZhcmlhYmxlU3RhdGVtZW50KS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICAgICAgZGVjcy5zb21lKGRlYyA9PiB7XG4gICAgICAgIGlmIChkZWMuaW5pdGlhbGl6ZXIgJiYgZGVjLmluaXRpYWxpemVyLmtpbmQgPT09IFN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICBjb25zdCBjYWxsRXhwID0gZGVjLmluaXRpYWxpemVyIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgICAgIGlmIChjYWxsRXhwLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmXG4gICAgICAgICAgICAoY2FsbEV4cC5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJiAoY2FsbEV4cC5hcmd1bWVudHNbMF0gYXMgYW55KS50ZXh0ID09PSAnbG9kYXNoJykge1xuICAgICAgICAgICAgICB0aGlzLnJlcXVpcmVMb2Rhc2hQb3MgPSBbYXN0LnBvcywgYXN0LmVuZF07XG4gICAgICAgICAgICAvLyB0aGlzLnBhdGNoZXMucHVzaCh7XG4gICAgICAgICAgICAvLyBcdHN0YXJ0OiBhc3QucG9zLFxuICAgICAgICAgICAgLy8gXHRlbmQ6IGFzdC5lbmQsXG4gICAgICAgICAgICAvLyBcdHJlcGxhY2VtZW50OiAnJ1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5FeHByZXNzaW9uU3RhdGVtZW50ICYmXG4gICAgICAoYXN0IGFzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQpLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgY29uc3QgY2FsbEV4cCA9IChhc3QgYXMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCkuZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIGlmIChjYWxsRXhwLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChjYWxsRXhwLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAoY2FsbEV4cC5hcmd1bWVudHNbMF0gYXMgYW55KS50ZXh0ID09PSAnbG9kYXNoJykge1xuICAgICAgICBsb2cuZGVidWcoJ1JlbW92ZSBvcnBoYW4gc3RhdGVtZW50IHJlcXVpcmUoXCJsb2Rhc2hcIikgZnJvbVxcbiAgJywgdGhpcy5maWxlKTtcbiAgICAgICAgdGhpcy5wYXRjaGVzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3QucG9zLFxuICAgICAgICAgIGVuZDogYXN0LmVuZCxcbiAgICAgICAgICByZXBsYWNlbWVudDogJydcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGFzdC5mb3JFYWNoQ2hpbGQoKHN1YjogdHMuTm9kZSkgPT4ge1xuICAgICAgdGhpcy50cmF2ZXJzZVRzQXN0KHN1Yiwgc3JjZmlsZSwgbGV2ZWwgKyAxKTtcbiAgICB9KTtcbiAgfVxufVxufVxuLy8gbW9kdWxlLmV4cG9ydHMuVFNQYXJzZXIgPSBUU1BhcnNlcjtcbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==