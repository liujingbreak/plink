"use strict";
const tslib_1 = require("tslib");
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
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const ts = tslib_1.__importStar(require("typescript"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7OztHQVVHO0FBQ0gsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyx1REFBaUM7QUFDakMsa0NBQWtDO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3hELElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDMUMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEQsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hFLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFELE1BQU0sRUFBQyxVQUFVLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFN0MsU0FBUyxNQUFNLENBQUMsT0FBZSxFQUFFLEdBQVE7SUFDeEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBQ3JELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtRQUM5QixPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3BDO0lBQ0QsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7U0FD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LENBQUM7d0JBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRzt3QkFDZCxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUc7d0JBQ1osV0FBVyxFQUFFLEVBQUU7cUJBQ2YsQ0FBQyxDQUFDO2lCQUNIO2FBQ0Q7WUFDRCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7Z0JBQ2pDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDN0MsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDO0tBQ0Q7SUEvRVksZUFBUSxXQStFcEIsQ0FBQTtBQUNELENBQUMsRUEvS1MsTUFBTSxLQUFOLE1BQU0sUUErS2Y7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9saWIvcmVxdWlyZS1sb2Rhc2gtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCZWNhdXNlIG1vc3Qgb2YgdGhlIGxlZ2FjeSBjb2RlIGlzIHdyaXR0ZW4gaW4gY29tbW9uanMgc3R5bGUsXG4gKiBiYWJlbC1sb2Rhc2gtcGx1Z2luIGNhbiBub3QgaGVscCB0byB0cmVlLXNoYWtlIGxvZGFzaCBidW5kbGUgc2l6ZS5cbiAqIFRoaXMgbG9hZGVyIGRvIGhlbHAgaW4gc29sdmluZyB0aGlzIHByb2JsZW0sXG4gKiBSZXBsYWNlIFwidmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKVwiIHRvIFxuICogICBcInZhciBfID0ge1xuICogICAgICAgICBkZWJvdW5jZTogcmVxdWlyZSgnbG9kYXNoL2RlYm91bmQnKSxcbiAqICAgICAgICAgLi4uXG4gKiAgIH1cIiBiYXNlZCBvbiBjb2RlIGFuYWx5c2lzIHJlc3VsdC5cbiAqXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG4vLyBjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBwYXRjaFRleHQgPSByZXF1aXJlKCcuLi8uLi9saWIvdXRpbHMvcGF0Y2gtdGV4dCcpO1xudmFyIGFjb3JuID0gcmVxdWlyZSgnYWNvcm4nKTtcbnZhciBlc3RyYXZlcnNlID0gcmVxdWlyZSgnZXN0cmF2ZXJzZS1mYicpO1xudmFyIGFjb3JuanN4ID0gcmVxdWlyZSgnYWNvcm4tanN4L2luamVjdCcpKGFjb3JuKTtcbnZhciBhY29ybkltcEluamVjdCA9IHJlcXVpcmUoJ2Fjb3JuLWR5bmFtaWMtaW1wb3J0L2xpYi9pbmplY3QnKS5kZWZhdWx0O1xuYWNvcm5qc3ggPSBhY29ybkltcEluamVjdChhY29ybmpzeCk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmgucmVxdWlyZS1sb2Rhc2gtbG9hZGVyJyk7XG5jb25zdCB7Z2V0T3B0aW9uc30gPSByZXF1aXJlKCdsb2FkZXItdXRpbHMnKTtcblxuZnVuY3Rpb24gbG9hZGVyKGNvbnRlbnQ6IHN0cmluZywgbWFwOiBhbnkpIHtcblx0dmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuXHRpZiAoIWNhbGxiYWNrKVxuXHRcdHRocm93IG5ldyBFcnJvcignYXBpLWxvYWRlciBpcyBOb3QgYSBzeW5jIGxvYWRlciEnKTtcblx0aWYgKGdldE9wdGlvbnModGhpcykuZGlzYWJsZWQpIHtcblx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgY29udGVudCwgbWFwKTtcblx0fVxuXHRsb2FkQXN5bmMoY29udGVudCwgdGhpcylcblx0LnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCwgbWFwKSlcblx0LmNhdGNoKGVyciA9PiB7XG5cdFx0bG9nLmVycm9yKGVycik7XG5cdFx0Y2FsbGJhY2soZXJyKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRBc3luYyhjb2RlOiBzdHJpbmcsIGxvYWRlckN0eDogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcblx0Y29uc3QgZmlsZSA9IGxvYWRlckN0eC5yZXNvdXJjZVBhdGg7XG5cdGlmIChmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuanN4JykpXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShsb2FkZXIuZG9Fcyhjb2RlLCBmaWxlKVswXSk7XG5cdGVsc2UgaWYgKGZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy50c3gnKSlcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBsb2FkZXIuVFNQYXJzZXIoKS5kb1RzKGNvZGUsIGZpbGUpKTtcblx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShjb2RlKTtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG5jb25zdCBESVNBQkxFX0JBTk5FUiA9IC9cXC9cXCpcXHMqbm9cXHMrKD86aW1wb3J0fHJlcXVpcmUpLWxvZGFzaC1sb2FkZXJcXHMqXFwqXFwvLztcblxuLy8gbW9kdWxlLmV4cG9ydHMuZG9FcyA9IGRvRXM7XG5cbmV4cG9ydCBmdW5jdGlvbiBkb0VzKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nKTogW3N0cmluZywgYW55XSB7XG5cdGlmIChESVNBQkxFX0JBTk5FUi50ZXN0KGNvZGUpKVxuXHRcdHJldHVybiBbY29kZSwgbnVsbF07XG5cdHZhciBhc3Q7XG5cdHZhciBmaXJzdENvbXBpbGVFcnIgPSBudWxsO1xuXHR0cnkge1xuXHRcdGFzdCA9IGFjb3JuanN4LnBhcnNlKGNvZGUsIHthbGxvd0hhc2hCYW5nOiB0cnVlLCBzb3VyY2VUeXBlOiAnbW9kdWxlJywgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcblx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0Zmlyc3RDb21waWxlRXJyID0gZXJyO1xuXHRcdHRyeSB7XG5cdFx0XHRhc3QgPSBhY29ybmpzeC5wYXJzZShjb2RlLCB7YWxsb3dIYXNoQmFuZzogdHJ1ZSwgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcblx0XHR9IGNhdGNoIChlcnIyKSB7XG5cdFx0XHRmaXJzdENvbXBpbGVFcnIubWVzc2FnZSArPSAnXFxuT3IgJyArIGVycjIubWVzc2FnZTtcblx0XHRcdGZpcnN0Q29tcGlsZUVyci5zdGFjayArPSAnXFxuQW5vdGhlciBwb3NzaWJsZSBjb21waWxhdGlvbiBlcnJvciBpc1xcbicgKyBlcnIyLnN0YWNrO1xuXHRcdFx0dGhyb3cgZmlyc3RDb21waWxlRXJyO1xuXHRcdH1cblx0fVxuXHRjb25zdCBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PiA9IFtdO1xuXG5cdC8vIGxldCBsb2Rhc2hJbXBvcnRlZCA9IGZhbHNlO1xuXHRsZXQgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSA9IG51bGw7XG5cdC8vIGxldCBoYXNFeHBvcnRzID0gZmFsc2U7XG5cdGNvbnN0IGxvZGFzaEZ1bmN0aW9uczogU2V0PHN0cmluZz4gPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuXHRlc3RyYXZlcnNlLnRyYXZlcnNlKGFzdCwge1xuXHRcdGVudGVyKG5vZGU6IGFueSwgcGFyZW50OiBhbnkpIHtcblx0XHRcdGlmIChub2RlLnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiYgbm9kZS5jYWxsZWUudHlwZSA9PT0gJ01lbWJlckV4cHJlc3Npb24nICYmXG5cdFx0XHRcdG5vZGUuY2FsbGVlLm9iamVjdC5uYW1lID09PSAnXycgJiYgbm9kZS5jYWxsZWUub2JqZWN0LnR5cGUgPT09ICdJZGVudGlmaWVyJyAmJlxuXHRcdFx0XHRub2RlLmNhbGxlZS5wcm9wZXJ0eS50eXBlID09PSAnSWRlbnRpZmllcicpIHtcblx0XHRcdFx0bG9kYXNoRnVuY3Rpb25zLmFkZChub2RlLmNhbGxlZS5wcm9wZXJ0eS5uYW1lKTtcblx0XHRcdH1cblx0XHRcdGlmIChub2RlLnR5cGUgPT09ICdWYXJpYWJsZURlY2xhcmF0b3InICYmIF8uZ2V0KG5vZGUsICdpZC5uYW1lJykgPT09ICdfJyAmJlxuXHRcdFx0Xy5nZXQocGFyZW50LCAnZGVjbGFyYXRpb25zLmxlbmd0aCcpID09PSAxKSB7XG5cdFx0XHRcdGNvbnN0IGluaXQgPSBub2RlLmluaXQ7XG5cdFx0XHRcdGlmIChpbml0LnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiYgXy5nZXQoaW5pdCwgJ2NhbGxlZS5uYW1lJykgPT09ICdyZXF1aXJlJyAmJlxuXHRcdFx0XHRcdF8uZ2V0KGluaXQsICdhcmd1bWVudHNbMF0udmFsdWUnKSA9PT0gJ2xvZGFzaCcpIHtcblx0XHRcdFx0XHRcdHJlcXVpcmVMb2Rhc2hQb3MgPSBbcGFyZW50LnN0YXJ0LCBwYXJlbnQuZW5kXTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChwYXJlbnQgJiYgcGFyZW50LnR5cGUgPT09ICdFeHByZXNzaW9uU3RhdGVtZW50JyAmJiBub2RlLnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiZcblx0XHRcdF8uZ2V0KG5vZGUsICdjYWxsZWUubmFtZScpID09PSAncmVxdWlyZScgJiZcblx0XHRcdF8uZ2V0KG5vZGUsICdhcmd1bWVudHNbMF0udmFsdWUnKSA9PT0gJ2xvZGFzaCcgJiYgcGFyZW50LnR5cGUgPT09ICdFeHByZXNzaW9uU3RhdGVtZW50Jykge1xuXHRcdFx0XHRsb2cuZGVidWcoJ1JlbW92ZSBvcnBoYW4gc3RhdGVtZW50IHJlcXVpcmUoXCJsb2Rhc2hcIikgZnJvbVxcbiVzICAnLCBmaWxlKTtcblx0XHRcdFx0cGF0Y2hlcy5wdXNoKHtcblx0XHRcdFx0XHRzdGFydDogcGFyZW50LnN0YXJ0LFxuXHRcdFx0XHRcdGVuZDogcGFyZW50LmVuZCxcblx0XHRcdFx0XHRyZXBsYWNlbWVudDogJydcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRsZWF2ZShub2RlOiBhbnksIHBhcmVudDogYW55KSB7XG5cdFx0fSxcblx0XHRrZXlzOiB7XG5cdFx0XHRJbXBvcnQ6IFtdLCBKU1hUZXh0OiBbXVxuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIFtkb1RyYW5zcGlsZShjb2RlLCBwYXRjaGVzLCByZXF1aXJlTG9kYXNoUG9zLCBsb2Rhc2hGdW5jdGlvbnMpLCBhc3RdO1xufVxuXG5mdW5jdGlvbiBkb1RyYW5zcGlsZShjb2RlOiBzdHJpbmcsXG5cdHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+LFxuXHRyZXF1aXJlTG9kYXNoUG9zOiBbbnVtYmVyLCBudW1iZXJdLCBsb2Rhc2hGdW5jdGlvbnM6IFNldDxzdHJpbmc+LCBpc1R5cGVzY3JpcHQgPSBmYWxzZSk6IHN0cmluZyB7XG5cdFx0aWYgKHJlcXVpcmVMb2Rhc2hQb3MpIHtcblx0XHRcdGlmIChsb2Rhc2hGdW5jdGlvbnMuc2l6ZSA+IDApIHtcblx0XHRcdFx0bGV0IGNvZGUgPSBgdmFyIF8ke2lzVHlwZXNjcmlwdCA/ICc6IGFueScgOiAnJ30gPSB7YDtcblx0XHRcdFx0bGV0IGkgPSAwO1xuXHRcdFx0XHRsb2Rhc2hGdW5jdGlvbnMuZm9yRWFjaChmdW5jTmFtZSA9PiB7XG5cdFx0XHRcdFx0aWYgKGkrKyA+IDApXG5cdFx0XHRcdFx0XHRjb2RlICs9ICcsICc7XG5cdFx0XHRcdFx0Y29kZSArPSBgJHtmdW5jTmFtZX06IHJlcXVpcmUoJ2xvZGFzaC8ke2Z1bmNOYW1lfScpYDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGNvZGUgKz0gJ307Jztcblx0XHRcdFx0cGF0Y2hlcy5wdXNoKHtcblx0XHRcdFx0XHRzdGFydDogcmVxdWlyZUxvZGFzaFBvc1swXSxcblx0XHRcdFx0XHRlbmQ6IHJlcXVpcmVMb2Rhc2hQb3NbMV0sXG5cdFx0XHRcdFx0cmVwbGFjZW1lbnQ6IGNvZGVcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXRjaGVzLnB1c2goe1xuXHRcdFx0XHRcdHN0YXJ0OiByZXF1aXJlTG9kYXNoUG9zWzBdLFxuXHRcdFx0XHRcdGVuZDogcmVxdWlyZUxvZGFzaFBvc1sxXSxcblx0XHRcdFx0XHRyZXBsYWNlbWVudDogJydcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcGF0Y2hUZXh0KGNvZGUsIHBhdGNoZXMpO1xuXHRcdH0gZWxzZSBpZiAocGF0Y2hlcykge1xuXHRcdFx0cmV0dXJuIHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKTtcblx0XHR9XG59XG5cbmV4cG9ydCBjbGFzcyBUU1BhcnNlciB7XG5cdC8vIHByaXZhdGUgaGFzTG9kYXNoQ2FsbCA9IGZhbHNlO1xuXHQvLyBwcml2YXRlIGxvZGFzaEltcG9ydGVkID0gZmFsc2U7XG5cdHByaXZhdGUgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSA9IG51bGw7XG5cdHByaXZhdGUgbG9kYXNoRnVuY3Rpb25zOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG5cdHByaXZhdGUgZmlsZTogc3RyaW5nO1xuXHRwcml2YXRlIHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+ID0gW107XG5cblx0ZG9Ucyhjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0dGhpcy5maWxlID0gZmlsZTtcblx0XHRjb25zdCBzcmNmaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZSgnZmlsZScsIGNvZGUsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpO1xuXHRcdGZvcihjb25zdCBzdG0gb2Ygc3JjZmlsZS5zdGF0ZW1lbnRzKSB7XG5cdFx0XHR0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtLCBzcmNmaWxlKTtcblx0XHR9XG5cdFx0Ly8gaWYgKHRoaXMucGF0Y2hlcy5sZW5ndGggPiAwKSB7XG5cdFx0Ly8gXHRjb2RlID0gcGF0Y2hUZXh0KGNvZGUsIHRoaXMucGF0Y2hlcyk7XG5cdFx0Ly8gXHRjb2RlID0gJ2ltcG9ydCAqIGFzIF8gZnJvbSBcXCdsb2Rhc2hcXCc7XFxuJyArIGNvZGU7XG5cdFx0Ly8gXHRsb2cuZGVidWcoJ1JlcGxhY2UgcmVxdWlyZShcImxvZGFzaFwiKSB3aXRoIGltcG9ydCBzeW50YXggaW5cXG4gICcsIGNoYWxrLnllbGxvdyhmaWxlKSk7XG5cdFx0Ly8gfSBlbHNlIGlmICh0aGlzLmhhc0xvZGFzaENhbGwgJiYgIXRoaXMubG9kYXNoSW1wb3J0ZWQpIHtcblx0XHQvLyBcdGxvZy5kZWJ1ZygnJXNcXG4gIGhhcyBsb2Rhc2ggZnVuY3Rpb24gY2FsbCwgYnV0IGhhcyBubyBsb2Rhc2ggaW1wb3J0ZWQgaW4gc291cmNlIGNvZGUnLCBjaGFsay55ZWxsb3coZmlsZSkpO1xuXHRcdC8vIFx0Y29kZSA9ICdpbXBvcnQgKiBhcyBfIGZyb20gXFwnbG9kYXNoXFwnO1xcbicgKyBjb2RlO1xuXHRcdC8vIH1cblx0XHRyZXR1cm4gZG9UcmFuc3BpbGUoY29kZSwgdGhpcy5wYXRjaGVzLCB0aGlzLnJlcXVpcmVMb2Rhc2hQb3MsIHRoaXMubG9kYXNoRnVuY3Rpb25zLCB0cnVlKTtcblx0fVxuXG5cdHByaXZhdGUgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIHNyY2ZpbGU6IHRzLlNvdXJjZUZpbGUsIGxldmVsID0gMCkge1xuXHRcdGNvbnN0IFN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kO1xuXHRcdGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuXHRcdFx0Y29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcblx0XHRcdGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pIHtcblx0XHRcdFx0Y29uc3QgbGVmdCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5leHByZXNzaW9uO1xuXHRcdFx0XHRjb25zdCByaWdodCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lO1xuXHRcdFx0XHRpZiAobGVmdC5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiYgKGxlZnQgYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ18nICYmXG5cdFx0XHRcdFx0cmlnaHQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG5cdFx0XHRcdFx0dGhpcy5sb2Rhc2hGdW5jdGlvbnMuYWRkKHJpZ2h0LnRleHQpO1xuXHRcdFx0XHRcdC8vIHRoaXMuaGFzTG9kYXNoQ2FsbCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0Ly8gaWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uICYmICgoYXN0IGFzIHRzLkltcG9ydERlY2xhcmF0aW9uKVxuXHRcdC8vIC5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ2xvZGFzaCcpIHtcblx0XHQvLyBcdHRoaXMubG9kYXNoSW1wb3J0ZWQgPSB0cnVlO1xuXHRcdC8vIH0gZWxzZSBcblx0XHRpZiAoYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQpIHtcblx0XHRcdGNvbnN0IGRlY3MgPSAoYXN0IGFzIHRzLlZhcmlhYmxlU3RhdGVtZW50KS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuXHRcdFx0ZGVjcy5zb21lKGRlYyA9PiB7XG5cdFx0XHRcdGlmIChkZWMuaW5pdGlhbGl6ZXIgJiYgZGVjLmluaXRpYWxpemVyLmtpbmQgPT09IFN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcblx0XHRcdFx0XHRjb25zdCBjYWxsRXhwID0gZGVjLmluaXRpYWxpemVyIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuXHRcdFx0XHRcdGlmIChjYWxsRXhwLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmXG5cdFx0XHRcdFx0XHQoY2FsbEV4cC5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJiAoY2FsbEV4cC5hcmd1bWVudHNbMF0gYXMgYW55KS50ZXh0ID09PSAnbG9kYXNoJykge1xuXHRcdFx0XHRcdFx0XHR0aGlzLnJlcXVpcmVMb2Rhc2hQb3MgPSBbYXN0LnBvcywgYXN0LmVuZF07XG5cdFx0XHRcdFx0XHQvLyB0aGlzLnBhdGNoZXMucHVzaCh7XG5cdFx0XHRcdFx0XHQvLyBcdHN0YXJ0OiBhc3QucG9zLFxuXHRcdFx0XHRcdFx0Ly8gXHRlbmQ6IGFzdC5lbmQsXG5cdFx0XHRcdFx0XHQvLyBcdHJlcGxhY2VtZW50OiAnJ1xuXHRcdFx0XHRcdFx0Ly8gfSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5FeHByZXNzaW9uU3RhdGVtZW50ICYmXG5cdFx0XHQoYXN0IGFzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQpLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuXHRcdFx0Y29uc3QgY2FsbEV4cCA9IChhc3QgYXMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCkuZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcblx0XHRcdGlmIChjYWxsRXhwLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChjYWxsRXhwLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG5cdFx0XHQoY2FsbEV4cC5hcmd1bWVudHNbMF0gYXMgYW55KS50ZXh0ID09PSAnbG9kYXNoJykge1xuXHRcdFx0XHRsb2cuZGVidWcoJ1JlbW92ZSBvcnBoYW4gc3RhdGVtZW50IHJlcXVpcmUoXCJsb2Rhc2hcIikgZnJvbVxcbiAgJywgdGhpcy5maWxlKTtcblx0XHRcdFx0dGhpcy5wYXRjaGVzLnB1c2goe1xuXHRcdFx0XHRcdHN0YXJ0OiBhc3QucG9zLFxuXHRcdFx0XHRcdGVuZDogYXN0LmVuZCxcblx0XHRcdFx0XHRyZXBsYWNlbWVudDogJydcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGFzdC5mb3JFYWNoQ2hpbGQoKHN1YjogdHMuTm9kZSkgPT4ge1xuXHRcdFx0dGhpcy50cmF2ZXJzZVRzQXN0KHN1Yiwgc3JjZmlsZSwgbGV2ZWwgKyAxKTtcblx0XHR9KTtcblx0fVxufVxufVxuLy8gbW9kdWxlLmV4cG9ydHMuVFNQYXJzZXIgPSBUU1BhcnNlcjtcbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==
