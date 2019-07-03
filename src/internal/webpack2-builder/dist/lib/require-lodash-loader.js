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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7OztHQVVHO0FBQ0gsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyx1REFBaUM7QUFDakMsa0NBQWtDO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3hELElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDMUMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEQsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hFLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFELE1BQU0sRUFBQyxVQUFVLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFN0MsU0FBUyxNQUFNLENBQUMsT0FBZSxFQUFFLEdBQVE7SUFDdkMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRO1FBQ1gsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBQ3RELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtRQUM3QixPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3JDO0lBQ0QsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7U0FD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QUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO3dCQUNkLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRzt3QkFDWixXQUFXLEVBQUUsRUFBRTtxQkFDaEIsQ0FBQyxDQUFDO2lCQUNKO2FBQ0Y7WUFDRCxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBWSxFQUFFLEVBQUU7Z0JBQ2hDLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDOUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0tBQ0Y7SUEvRVksZUFBUSxXQStFcEIsQ0FBQTtBQUNELENBQUMsRUFoTFMsTUFBTSxLQUFOLE1BQU0sUUFnTGY7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9saWIvcmVxdWlyZS1sb2Rhc2gtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBCZWNhdXNlIG1vc3Qgb2YgdGhlIGxlZ2FjeSBjb2RlIGlzIHdyaXR0ZW4gaW4gY29tbW9uanMgc3R5bGUsXG4gKiBiYWJlbC1sb2Rhc2gtcGx1Z2luIGNhbiBub3QgaGVscCB0byB0cmVlLXNoYWtlIGxvZGFzaCBidW5kbGUgc2l6ZS5cbiAqIFRoaXMgbG9hZGVyIGRvIGhlbHAgaW4gc29sdmluZyB0aGlzIHByb2JsZW0sXG4gKiBSZXBsYWNlIFwidmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKVwiIHRvIFxuICogICBcInZhciBfID0ge1xuICogICAgICAgICBkZWJvdW5jZTogcmVxdWlyZSgnbG9kYXNoL2RlYm91bmQnKSxcbiAqICAgICAgICAgLi4uXG4gKiAgIH1cIiBiYXNlZCBvbiBjb2RlIGFuYWx5c2lzIHJlc3VsdC5cbiAqXG4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG4vLyBjb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBwYXRjaFRleHQgPSByZXF1aXJlKCcuLi8uLi9saWIvdXRpbHMvcGF0Y2gtdGV4dCcpO1xudmFyIGFjb3JuID0gcmVxdWlyZSgnYWNvcm4nKTtcbnZhciBlc3RyYXZlcnNlID0gcmVxdWlyZSgnZXN0cmF2ZXJzZS1mYicpO1xudmFyIGFjb3JuanN4ID0gcmVxdWlyZSgnYWNvcm4tanN4L2luamVjdCcpKGFjb3JuKTtcbnZhciBhY29ybkltcEluamVjdCA9IHJlcXVpcmUoJ2Fjb3JuLWR5bmFtaWMtaW1wb3J0L2xpYi9pbmplY3QnKS5kZWZhdWx0O1xuYWNvcm5qc3ggPSBhY29ybkltcEluamVjdChhY29ybmpzeCk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmgucmVxdWlyZS1sb2Rhc2gtbG9hZGVyJyk7XG5jb25zdCB7Z2V0T3B0aW9uc30gPSByZXF1aXJlKCdsb2FkZXItdXRpbHMnKTtcblxuZnVuY3Rpb24gbG9hZGVyKGNvbnRlbnQ6IHN0cmluZywgbWFwOiBhbnkpIHtcbiAgdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuICBpZiAoIWNhbGxiYWNrKVxuICAgIHRocm93IG5ldyBFcnJvcignYXBpLWxvYWRlciBpcyBOb3QgYSBzeW5jIGxvYWRlciEnKTtcbiAgaWYgKGdldE9wdGlvbnModGhpcykuZGlzYWJsZWQpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgY29udGVudCwgbWFwKTtcbiAgfVxuICBsb2FkQXN5bmMoY29udGVudCwgdGhpcylcbiAgLnRoZW4ocmVzdWx0ID0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCwgbWFwKSlcbiAgLmNhdGNoKGVyciA9PiB7XG4gICAgbG9nLmVycm9yKGVycik7XG4gICAgY2FsbGJhY2soZXJyKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRBc3luYyhjb2RlOiBzdHJpbmcsIGxvYWRlckN0eDogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZmlsZSA9IGxvYWRlckN0eC5yZXNvdXJjZVBhdGg7XG4gIGlmIChmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuanN4JykpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShsb2FkZXIuZG9Fcyhjb2RlLCBmaWxlKVswXSk7XG4gIGVsc2UgaWYgKGZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy50c3gnKSlcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG5ldyBsb2FkZXIuVFNQYXJzZXIoKS5kb1RzKGNvZGUsIGZpbGUpKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjb2RlKTtcbn1cblxubmFtZXNwYWNlIGxvYWRlciB7XG5jb25zdCBESVNBQkxFX0JBTk5FUiA9IC9cXC9cXCpcXHMqbm9cXHMrKD86aW1wb3J0fHJlcXVpcmUpLWxvZGFzaC1sb2FkZXJcXHMqXFwqXFwvLztcblxuLy8gbW9kdWxlLmV4cG9ydHMuZG9FcyA9IGRvRXM7XG5cbmV4cG9ydCBmdW5jdGlvbiBkb0VzKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nKTogW3N0cmluZywgYW55XSB7XG4gIGlmIChESVNBQkxFX0JBTk5FUi50ZXN0KGNvZGUpKVxuICAgIHJldHVybiBbY29kZSwgbnVsbF07XG4gIHZhciBhc3Q7XG4gIHZhciBmaXJzdENvbXBpbGVFcnIgPSBudWxsO1xuICB0cnkge1xuICAgIGFzdCA9IGFjb3JuanN4LnBhcnNlKGNvZGUsIHthbGxvd0hhc2hCYW5nOiB0cnVlLCBzb3VyY2VUeXBlOiAnbW9kdWxlJywgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZmlyc3RDb21waWxlRXJyID0gZXJyO1xuICAgIHRyeSB7XG4gICAgICBhc3QgPSBhY29ybmpzeC5wYXJzZShjb2RlLCB7YWxsb3dIYXNoQmFuZzogdHJ1ZSwgcGx1Z2luczoge2pzeDogdHJ1ZSwgZHluYW1pY0ltcG9ydDogdHJ1ZX19KTtcbiAgICB9IGNhdGNoIChlcnIyKSB7XG4gICAgICBmaXJzdENvbXBpbGVFcnIubWVzc2FnZSArPSAnXFxuT3IgJyArIGVycjIubWVzc2FnZTtcbiAgICAgIGZpcnN0Q29tcGlsZUVyci5zdGFjayArPSAnXFxuQW5vdGhlciBwb3NzaWJsZSBjb21waWxhdGlvbiBlcnJvciBpc1xcbicgKyBlcnIyLnN0YWNrO1xuICAgICAgdGhyb3cgZmlyc3RDb21waWxlRXJyO1xuICAgIH1cbiAgfVxuICBjb25zdCBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PiA9IFtdO1xuXG4gIC8vIGxldCBsb2Rhc2hJbXBvcnRlZCA9IGZhbHNlO1xuICBsZXQgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSB8IG51bGwgPSBudWxsO1xuICAvLyBsZXQgaGFzRXhwb3J0cyA9IGZhbHNlO1xuICBjb25zdCBsb2Rhc2hGdW5jdGlvbnM6IFNldDxzdHJpbmc+ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZXN0cmF2ZXJzZS50cmF2ZXJzZShhc3QsIHtcbiAgICBlbnRlcihub2RlOiBhbnksIHBhcmVudDogYW55KSB7XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIG5vZGUuY2FsbGVlLnR5cGUgPT09ICdNZW1iZXJFeHByZXNzaW9uJyAmJlxuICAgICAgICBub2RlLmNhbGxlZS5vYmplY3QubmFtZSA9PT0gJ18nICYmIG5vZGUuY2FsbGVlLm9iamVjdC50eXBlID09PSAnSWRlbnRpZmllcicgJiZcbiAgICAgICAgbm9kZS5jYWxsZWUucHJvcGVydHkudHlwZSA9PT0gJ0lkZW50aWZpZXInKSB7XG4gICAgICAgIGxvZGFzaEZ1bmN0aW9ucy5hZGQobm9kZS5jYWxsZWUucHJvcGVydHkubmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnVmFyaWFibGVEZWNsYXJhdG9yJyAmJiBfLmdldChub2RlLCAnaWQubmFtZScpID09PSAnXycgJiZcbiAgICAgIF8uZ2V0KHBhcmVudCwgJ2RlY2xhcmF0aW9ucy5sZW5ndGgnKSA9PT0gMSkge1xuICAgICAgICBjb25zdCBpbml0ID0gbm9kZS5pbml0O1xuICAgICAgICBpZiAoaW5pdC50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIF8uZ2V0KGluaXQsICdjYWxsZWUubmFtZScpID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgICBfLmdldChpbml0LCAnYXJndW1lbnRzWzBdLnZhbHVlJykgPT09ICdsb2Rhc2gnKSB7XG4gICAgICAgICAgICByZXF1aXJlTG9kYXNoUG9zID0gW3BhcmVudC5zdGFydCwgcGFyZW50LmVuZF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocGFyZW50ICYmIHBhcmVudC50eXBlID09PSAnRXhwcmVzc2lvblN0YXRlbWVudCcgJiYgbm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmXG4gICAgICBfLmdldChub2RlLCAnY2FsbGVlLm5hbWUnKSA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICBfLmdldChub2RlLCAnYXJndW1lbnRzWzBdLnZhbHVlJykgPT09ICdsb2Rhc2gnICYmIHBhcmVudC50eXBlID09PSAnRXhwcmVzc2lvblN0YXRlbWVudCcpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdSZW1vdmUgb3JwaGFuIHN0YXRlbWVudCByZXF1aXJlKFwibG9kYXNoXCIpIGZyb21cXG4lcyAgJywgZmlsZSk7XG4gICAgICAgIHBhdGNoZXMucHVzaCh7XG4gICAgICAgICAgc3RhcnQ6IHBhcmVudC5zdGFydCxcbiAgICAgICAgICBlbmQ6IHBhcmVudC5lbmQsXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGVhdmUobm9kZTogYW55LCBwYXJlbnQ6IGFueSkge1xuICAgIH0sXG4gICAga2V5czoge1xuICAgICAgSW1wb3J0OiBbXSwgSlNYVGV4dDogW11cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBbZG9UcmFuc3BpbGUoY29kZSwgcGF0Y2hlcywgcmVxdWlyZUxvZGFzaFBvcywgbG9kYXNoRnVuY3Rpb25zKSwgYXN0XTtcbn1cblxuZnVuY3Rpb24gZG9UcmFuc3BpbGUoY29kZTogc3RyaW5nLFxuICBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PixcbiAgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSB8IG51bGwsIGxvZGFzaEZ1bmN0aW9uczogU2V0PHN0cmluZz4sIGlzVHlwZXNjcmlwdCA9IGZhbHNlKTogc3RyaW5nIHtcbiAgaWYgKHJlcXVpcmVMb2Rhc2hQb3MpIHtcbiAgICBpZiAobG9kYXNoRnVuY3Rpb25zLnNpemUgPiAwKSB7XG4gICAgICBsZXQgY29kZSA9IGB2YXIgXyR7aXNUeXBlc2NyaXB0ID8gJzogYW55JyA6ICcnfSA9IHtgO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgbG9kYXNoRnVuY3Rpb25zLmZvckVhY2goZnVuY05hbWUgPT4ge1xuICAgICAgICBpZiAoaSsrID4gMClcbiAgICAgICAgICBjb2RlICs9ICcsICc7XG4gICAgICAgIGNvZGUgKz0gYCR7ZnVuY05hbWV9OiByZXF1aXJlKCdsb2Rhc2gvJHtmdW5jTmFtZX0nKWA7XG4gICAgICB9KTtcbiAgICAgIGNvZGUgKz0gJ307JztcbiAgICAgIHBhdGNoZXMucHVzaCh7XG4gICAgICAgIHN0YXJ0OiByZXF1aXJlTG9kYXNoUG9zWzBdLFxuICAgICAgICBlbmQ6IHJlcXVpcmVMb2Rhc2hQb3NbMV0sXG4gICAgICAgIHJlcGxhY2VtZW50OiBjb2RlXG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgc3RhcnQ6IHJlcXVpcmVMb2Rhc2hQb3NbMF0sXG4gICAgICAgIGVuZDogcmVxdWlyZUxvZGFzaFBvc1sxXSxcbiAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKTtcbiAgfSBlbHNlIGlmIChwYXRjaGVzKSB7XG4gICAgcmV0dXJuIHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKTtcbiAgfVxuICByZXR1cm4gY29kZTtcbn1cblxuZXhwb3J0IGNsYXNzIFRTUGFyc2VyIHtcbiAgLy8gcHJpdmF0ZSBoYXNMb2Rhc2hDYWxsID0gZmFsc2U7XG4gIC8vIHByaXZhdGUgbG9kYXNoSW1wb3J0ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSByZXF1aXJlTG9kYXNoUG9zOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbCA9IG51bGw7XG4gIHByaXZhdGUgbG9kYXNoRnVuY3Rpb25zOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIHByaXZhdGUgZmlsZTogc3RyaW5nO1xuICBwcml2YXRlIHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+ID0gW107XG5cbiAgZG9Ucyhjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgdGhpcy5maWxlID0gZmlsZTtcbiAgICBjb25zdCBzcmNmaWxlID0gdHMuY3JlYXRlU291cmNlRmlsZSgnZmlsZScsIGNvZGUsIHRzLlNjcmlwdFRhcmdldC5FUzIwMTUpO1xuICAgIGZvcihjb25zdCBzdG0gb2Ygc3JjZmlsZS5zdGF0ZW1lbnRzKSB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3RtLCBzcmNmaWxlKTtcbiAgICB9XG4gICAgLy8gaWYgKHRoaXMucGF0Y2hlcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gXHRjb2RlID0gcGF0Y2hUZXh0KGNvZGUsIHRoaXMucGF0Y2hlcyk7XG4gICAgLy8gXHRjb2RlID0gJ2ltcG9ydCAqIGFzIF8gZnJvbSBcXCdsb2Rhc2hcXCc7XFxuJyArIGNvZGU7XG4gICAgLy8gXHRsb2cuZGVidWcoJ1JlcGxhY2UgcmVxdWlyZShcImxvZGFzaFwiKSB3aXRoIGltcG9ydCBzeW50YXggaW5cXG4gICcsIGNoYWxrLnllbGxvdyhmaWxlKSk7XG4gICAgLy8gfSBlbHNlIGlmICh0aGlzLmhhc0xvZGFzaENhbGwgJiYgIXRoaXMubG9kYXNoSW1wb3J0ZWQpIHtcbiAgICAvLyBcdGxvZy5kZWJ1ZygnJXNcXG4gIGhhcyBsb2Rhc2ggZnVuY3Rpb24gY2FsbCwgYnV0IGhhcyBubyBsb2Rhc2ggaW1wb3J0ZWQgaW4gc291cmNlIGNvZGUnLCBjaGFsay55ZWxsb3coZmlsZSkpO1xuICAgIC8vIFx0Y29kZSA9ICdpbXBvcnQgKiBhcyBfIGZyb20gXFwnbG9kYXNoXFwnO1xcbicgKyBjb2RlO1xuICAgIC8vIH1cbiAgICByZXR1cm4gZG9UcmFuc3BpbGUoY29kZSwgdGhpcy5wYXRjaGVzLCB0aGlzLnJlcXVpcmVMb2Rhc2hQb3MsIHRoaXMubG9kYXNoRnVuY3Rpb25zLCB0cnVlKTtcbiAgfVxuXG4gIHByaXZhdGUgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIHNyY2ZpbGU6IHRzLlNvdXJjZUZpbGUsIGxldmVsID0gMCkge1xuICAgIGNvbnN0IFN5bnRheEtpbmQgPSB0cy5TeW50YXhLaW5kO1xuICAgIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgY29uc3Qgbm9kZSA9IGFzdCBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIGlmIChub2RlLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pIHtcbiAgICAgICAgY29uc3QgbGVmdCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5leHByZXNzaW9uO1xuICAgICAgICBjb25zdCByaWdodCA9IChub2RlLmV4cHJlc3Npb24gYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lO1xuICAgICAgICBpZiAobGVmdC5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiYgKGxlZnQgYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ18nICYmXG4gICAgICAgICAgcmlnaHQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgdGhpcy5sb2Rhc2hGdW5jdGlvbnMuYWRkKHJpZ2h0LnRleHQpO1xuICAgICAgICAgIC8vIHRoaXMuaGFzTG9kYXNoQ2FsbCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLkltcG9ydERlY2xhcmF0aW9uICYmICgoYXN0IGFzIHRzLkltcG9ydERlY2xhcmF0aW9uKVxuICAgIC8vIC5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ2xvZGFzaCcpIHtcbiAgICAvLyBcdHRoaXMubG9kYXNoSW1wb3J0ZWQgPSB0cnVlO1xuICAgIC8vIH0gZWxzZSBcbiAgICBpZiAoYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuVmFyaWFibGVTdGF0ZW1lbnQpIHtcbiAgICAgIGNvbnN0IGRlY3MgPSAoYXN0IGFzIHRzLlZhcmlhYmxlU3RhdGVtZW50KS5kZWNsYXJhdGlvbkxpc3QuZGVjbGFyYXRpb25zO1xuICAgICAgZGVjcy5zb21lKGRlYyA9PiB7XG4gICAgICAgIGlmIChkZWMuaW5pdGlhbGl6ZXIgJiYgZGVjLmluaXRpYWxpemVyLmtpbmQgPT09IFN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICBjb25zdCBjYWxsRXhwID0gZGVjLmluaXRpYWxpemVyIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgICAgIGlmIChjYWxsRXhwLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmXG4gICAgICAgICAgICAoY2FsbEV4cC5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJiAoY2FsbEV4cC5hcmd1bWVudHNbMF0gYXMgYW55KS50ZXh0ID09PSAnbG9kYXNoJykge1xuICAgICAgICAgICAgICB0aGlzLnJlcXVpcmVMb2Rhc2hQb3MgPSBbYXN0LnBvcywgYXN0LmVuZF07XG4gICAgICAgICAgICAvLyB0aGlzLnBhdGNoZXMucHVzaCh7XG4gICAgICAgICAgICAvLyBcdHN0YXJ0OiBhc3QucG9zLFxuICAgICAgICAgICAgLy8gXHRlbmQ6IGFzdC5lbmQsXG4gICAgICAgICAgICAvLyBcdHJlcGxhY2VtZW50OiAnJ1xuICAgICAgICAgICAgLy8gfSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5FeHByZXNzaW9uU3RhdGVtZW50ICYmXG4gICAgICAoYXN0IGFzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQpLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgY29uc3QgY2FsbEV4cCA9IChhc3QgYXMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCkuZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgIGlmIChjYWxsRXhwLmV4cHJlc3Npb24ua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChjYWxsRXhwLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICAoY2FsbEV4cC5hcmd1bWVudHNbMF0gYXMgYW55KS50ZXh0ID09PSAnbG9kYXNoJykge1xuICAgICAgICBsb2cuZGVidWcoJ1JlbW92ZSBvcnBoYW4gc3RhdGVtZW50IHJlcXVpcmUoXCJsb2Rhc2hcIikgZnJvbVxcbiAgJywgdGhpcy5maWxlKTtcbiAgICAgICAgdGhpcy5wYXRjaGVzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3QucG9zLFxuICAgICAgICAgIGVuZDogYXN0LmVuZCxcbiAgICAgICAgICByZXBsYWNlbWVudDogJydcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIGFzdC5mb3JFYWNoQ2hpbGQoKHN1YjogdHMuTm9kZSkgPT4ge1xuICAgICAgdGhpcy50cmF2ZXJzZVRzQXN0KHN1Yiwgc3JjZmlsZSwgbGV2ZWwgKyAxKTtcbiAgICB9KTtcbiAgfVxufVxufVxuLy8gbW9kdWxlLmV4cG9ydHMuVFNQYXJzZXIgPSBUU1BhcnNlcjtcbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==
