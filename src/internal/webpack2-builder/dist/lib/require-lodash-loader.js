"use strict";
const tslib_1 = require("tslib");
// tslint:disable max-line-length
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBaUM7QUFDakM7Ozs7Ozs7Ozs7R0FVRztBQUNILGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsdURBQWlDO0FBQ2pDLGtDQUFrQztBQUNsQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUN4RCxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0IsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzFDLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2xELElBQUksY0FBYyxHQUFHLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN4RSxRQUFRLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztBQUMxRCxNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBRTdDLFNBQVMsTUFBTSxDQUFDLE9BQWUsRUFBRSxHQUFRO0lBQ3ZDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUTtRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztJQUN0RCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUU7UUFDN0IsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNyQztJQUNELFNBQVMsQ0FBQyxPQUFPLEVBQUUs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QyxPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7d0JBQ2QsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHO3dCQUNaLFdBQVcsRUFBRSxFQUFFO3FCQUNoQixDQUFDLENBQUM7aUJBQ0o7YUFDRjtZQUNELEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFZLEVBQUUsRUFBRTtnQkFDaEMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM5QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRjtJQS9FWSxlQUFRLFdBK0VwQixDQUFBO0FBQ0QsQ0FBQyxFQS9LUyxNQUFNLEtBQU4sTUFBTSxRQStLZjtBQUVELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGhcbi8qKlxuICogQmVjYXVzZSBtb3N0IG9mIHRoZSBsZWdhY3kgY29kZSBpcyB3cml0dGVuIGluIGNvbW1vbmpzIHN0eWxlLFxuICogYmFiZWwtbG9kYXNoLXBsdWdpbiBjYW4gbm90IGhlbHAgdG8gdHJlZS1zaGFrZSBsb2Rhc2ggYnVuZGxlIHNpemUuXG4gKiBUaGlzIGxvYWRlciBkbyBoZWxwIGluIHNvbHZpbmcgdGhpcyBwcm9ibGVtLFxuICogUmVwbGFjZSBcInZhciBfID0gcmVxdWlyZSgnbG9kYXNoJylcIiB0byBcbiAqICAgXCJ2YXIgXyA9IHtcbiAqICAgICAgICAgZGVib3VuY2U6IHJlcXVpcmUoJ2xvZGFzaC9kZWJvdW5kJyksXG4gKiAgICAgICAgIC4uLlxuICogICB9XCIgYmFzZWQgb24gY29kZSBhbmFseXNpcyByZXN1bHQuXG4gKlxuICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuLy8gY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgcGF0Y2hUZXh0ID0gcmVxdWlyZSgnLi4vLi4vbGliL3V0aWxzL3BhdGNoLXRleHQnKTtcbnZhciBhY29ybiA9IHJlcXVpcmUoJ2Fjb3JuJyk7XG52YXIgZXN0cmF2ZXJzZSA9IHJlcXVpcmUoJ2VzdHJhdmVyc2UtZmInKTtcbnZhciBhY29ybmpzeCA9IHJlcXVpcmUoJ2Fjb3JuLWpzeC9pbmplY3QnKShhY29ybik7XG52YXIgYWNvcm5JbXBJbmplY3QgPSByZXF1aXJlKCdhY29ybi1keW5hbWljLWltcG9ydC9saWIvaW5qZWN0JykuZGVmYXVsdDtcbmFjb3JuanN4ID0gYWNvcm5JbXBJbmplY3QoYWNvcm5qc3gpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnJlcXVpcmUtbG9kYXNoLWxvYWRlcicpO1xuY29uc3Qge2dldE9wdGlvbnN9ID0gcmVxdWlyZSgnbG9hZGVyLXV0aWxzJyk7XG5cbmZ1bmN0aW9uIGxvYWRlcihjb250ZW50OiBzdHJpbmcsIG1hcDogYW55KSB7XG4gIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2FwaS1sb2FkZXIgaXMgTm90IGEgc3luYyBsb2FkZXIhJyk7XG4gIGlmIChnZXRPcHRpb25zKHRoaXMpLmRpc2FibGVkKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGNvbnRlbnQsIG1hcCk7XG4gIH1cbiAgbG9hZEFzeW5jKGNvbnRlbnQsIHRoaXMpXG4gIC50aGVuKHJlc3VsdCA9PiBjYWxsYmFjayhudWxsLCByZXN1bHQsIG1hcCkpXG4gIC5jYXRjaChlcnIgPT4ge1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIGNhbGxiYWNrKGVycik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBsb2FkQXN5bmMoY29kZTogc3RyaW5nLCBsb2FkZXJDdHg6IGFueSk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZpbGUgPSBsb2FkZXJDdHgucmVzb3VyY2VQYXRoO1xuICBpZiAoZmlsZS5lbmRzV2l0aCgnLmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmpzeCcpKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobG9hZGVyLmRvRXMoY29kZSwgZmlsZSlbMF0pO1xuICBlbHNlIGlmIChmaWxlLmVuZHNXaXRoKCcudHMnKSB8fCBmaWxlLmVuZHNXaXRoKCcudHN4JykpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgbG9hZGVyLlRTUGFyc2VyKCkuZG9Ucyhjb2RlLCBmaWxlKSk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoY29kZSk7XG59XG5cbm5hbWVzcGFjZSBsb2FkZXIge1xuY29uc3QgRElTQUJMRV9CQU5ORVIgPSAvXFwvXFwqXFxzKm5vXFxzKyg/OmltcG9ydHxyZXF1aXJlKS1sb2Rhc2gtbG9hZGVyXFxzKlxcKlxcLy87XG5cbi8vIG1vZHVsZS5leHBvcnRzLmRvRXMgPSBkb0VzO1xuXG5leHBvcnQgZnVuY3Rpb24gZG9Fcyhjb2RlOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IFtzdHJpbmcsIGFueV0ge1xuICBpZiAoRElTQUJMRV9CQU5ORVIudGVzdChjb2RlKSlcbiAgICByZXR1cm4gW2NvZGUsIG51bGxdO1xuICB2YXIgYXN0O1xuICB2YXIgZmlyc3RDb21waWxlRXJyID0gbnVsbDtcbiAgdHJ5IHtcbiAgICBhc3QgPSBhY29ybmpzeC5wYXJzZShjb2RlLCB7YWxsb3dIYXNoQmFuZzogdHJ1ZSwgc291cmNlVHlwZTogJ21vZHVsZScsIHBsdWdpbnM6IHtqc3g6IHRydWUsIGR5bmFtaWNJbXBvcnQ6IHRydWV9fSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGZpcnN0Q29tcGlsZUVyciA9IGVycjtcbiAgICB0cnkge1xuICAgICAgYXN0ID0gYWNvcm5qc3gucGFyc2UoY29kZSwge2FsbG93SGFzaEJhbmc6IHRydWUsIHBsdWdpbnM6IHtqc3g6IHRydWUsIGR5bmFtaWNJbXBvcnQ6IHRydWV9fSk7XG4gICAgfSBjYXRjaCAoZXJyMikge1xuICAgICAgZmlyc3RDb21waWxlRXJyLm1lc3NhZ2UgKz0gJ1xcbk9yICcgKyBlcnIyLm1lc3NhZ2U7XG4gICAgICBmaXJzdENvbXBpbGVFcnIuc3RhY2sgKz0gJ1xcbkFub3RoZXIgcG9zc2libGUgY29tcGlsYXRpb24gZXJyb3IgaXNcXG4nICsgZXJyMi5zdGFjaztcbiAgICAgIHRocm93IGZpcnN0Q29tcGlsZUVycjtcbiAgICB9XG4gIH1cbiAgY29uc3QgcGF0Y2hlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCByZXBsYWNlbWVudDogc3RyaW5nfT4gPSBbXTtcblxuICAvLyBsZXQgbG9kYXNoSW1wb3J0ZWQgPSBmYWxzZTtcbiAgbGV0IHJlcXVpcmVMb2Rhc2hQb3M6IFtudW1iZXIsIG51bWJlcl0gPSBudWxsO1xuICAvLyBsZXQgaGFzRXhwb3J0cyA9IGZhbHNlO1xuICBjb25zdCBsb2Rhc2hGdW5jdGlvbnM6IFNldDxzdHJpbmc+ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZXN0cmF2ZXJzZS50cmF2ZXJzZShhc3QsIHtcbiAgICBlbnRlcihub2RlOiBhbnksIHBhcmVudDogYW55KSB7XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIG5vZGUuY2FsbGVlLnR5cGUgPT09ICdNZW1iZXJFeHByZXNzaW9uJyAmJlxuICAgICAgICBub2RlLmNhbGxlZS5vYmplY3QubmFtZSA9PT0gJ18nICYmIG5vZGUuY2FsbGVlLm9iamVjdC50eXBlID09PSAnSWRlbnRpZmllcicgJiZcbiAgICAgICAgbm9kZS5jYWxsZWUucHJvcGVydHkudHlwZSA9PT0gJ0lkZW50aWZpZXInKSB7XG4gICAgICAgIGxvZGFzaEZ1bmN0aW9ucy5hZGQobm9kZS5jYWxsZWUucHJvcGVydHkubmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobm9kZS50eXBlID09PSAnVmFyaWFibGVEZWNsYXJhdG9yJyAmJiBfLmdldChub2RlLCAnaWQubmFtZScpID09PSAnXycgJiZcbiAgICAgIF8uZ2V0KHBhcmVudCwgJ2RlY2xhcmF0aW9ucy5sZW5ndGgnKSA9PT0gMSkge1xuICAgICAgICBjb25zdCBpbml0ID0gbm9kZS5pbml0O1xuICAgICAgICBpZiAoaW5pdC50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmIF8uZ2V0KGluaXQsICdjYWxsZWUubmFtZScpID09PSAncmVxdWlyZScgJiZcbiAgICAgICAgICBfLmdldChpbml0LCAnYXJndW1lbnRzWzBdLnZhbHVlJykgPT09ICdsb2Rhc2gnKSB7XG4gICAgICAgICAgICByZXF1aXJlTG9kYXNoUG9zID0gW3BhcmVudC5zdGFydCwgcGFyZW50LmVuZF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocGFyZW50ICYmIHBhcmVudC50eXBlID09PSAnRXhwcmVzc2lvblN0YXRlbWVudCcgJiYgbm9kZS50eXBlID09PSAnQ2FsbEV4cHJlc3Npb24nICYmXG4gICAgICBfLmdldChub2RlLCAnY2FsbGVlLm5hbWUnKSA9PT0gJ3JlcXVpcmUnICYmXG4gICAgICBfLmdldChub2RlLCAnYXJndW1lbnRzWzBdLnZhbHVlJykgPT09ICdsb2Rhc2gnICYmIHBhcmVudC50eXBlID09PSAnRXhwcmVzc2lvblN0YXRlbWVudCcpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdSZW1vdmUgb3JwaGFuIHN0YXRlbWVudCByZXF1aXJlKFwibG9kYXNoXCIpIGZyb21cXG4lcyAgJywgZmlsZSk7XG4gICAgICAgIHBhdGNoZXMucHVzaCh7XG4gICAgICAgICAgc3RhcnQ6IHBhcmVudC5zdGFydCxcbiAgICAgICAgICBlbmQ6IHBhcmVudC5lbmQsXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgbGVhdmUobm9kZTogYW55LCBwYXJlbnQ6IGFueSkge1xuICAgIH0sXG4gICAga2V5czoge1xuICAgICAgSW1wb3J0OiBbXSwgSlNYVGV4dDogW11cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBbZG9UcmFuc3BpbGUoY29kZSwgcGF0Y2hlcywgcmVxdWlyZUxvZGFzaFBvcywgbG9kYXNoRnVuY3Rpb25zKSwgYXN0XTtcbn1cblxuZnVuY3Rpb24gZG9UcmFuc3BpbGUoY29kZTogc3RyaW5nLFxuICBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PixcbiAgcmVxdWlyZUxvZGFzaFBvczogW251bWJlciwgbnVtYmVyXSwgbG9kYXNoRnVuY3Rpb25zOiBTZXQ8c3RyaW5nPiwgaXNUeXBlc2NyaXB0ID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXF1aXJlTG9kYXNoUG9zKSB7XG4gICAgICBpZiAobG9kYXNoRnVuY3Rpb25zLnNpemUgPiAwKSB7XG4gICAgICAgIGxldCBjb2RlID0gYHZhciBfJHtpc1R5cGVzY3JpcHQgPyAnOiBhbnknIDogJyd9ID0ge2A7XG4gICAgICAgIGxldCBpID0gMDtcbiAgICAgICAgbG9kYXNoRnVuY3Rpb25zLmZvckVhY2goZnVuY05hbWUgPT4ge1xuICAgICAgICAgIGlmIChpKysgPiAwKVxuICAgICAgICAgICAgY29kZSArPSAnLCAnO1xuICAgICAgICAgIGNvZGUgKz0gYCR7ZnVuY05hbWV9OiByZXF1aXJlKCdsb2Rhc2gvJHtmdW5jTmFtZX0nKWA7XG4gICAgICAgIH0pO1xuICAgICAgICBjb2RlICs9ICd9Oyc7XG4gICAgICAgIHBhdGNoZXMucHVzaCh7XG4gICAgICAgICAgc3RhcnQ6IHJlcXVpcmVMb2Rhc2hQb3NbMF0sXG4gICAgICAgICAgZW5kOiByZXF1aXJlTG9kYXNoUG9zWzFdLFxuICAgICAgICAgIHJlcGxhY2VtZW50OiBjb2RlXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICBzdGFydDogcmVxdWlyZUxvZGFzaFBvc1swXSxcbiAgICAgICAgICBlbmQ6IHJlcXVpcmVMb2Rhc2hQb3NbMV0sXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhdGNoVGV4dChjb2RlLCBwYXRjaGVzKTtcbiAgICB9IGVsc2UgaWYgKHBhdGNoZXMpIHtcbiAgICAgIHJldHVybiBwYXRjaFRleHQoY29kZSwgcGF0Y2hlcyk7XG4gICAgfVxufVxuXG5leHBvcnQgY2xhc3MgVFNQYXJzZXIge1xuICAvLyBwcml2YXRlIGhhc0xvZGFzaENhbGwgPSBmYWxzZTtcbiAgLy8gcHJpdmF0ZSBsb2Rhc2hJbXBvcnRlZCA9IGZhbHNlO1xuICBwcml2YXRlIHJlcXVpcmVMb2Rhc2hQb3M6IFtudW1iZXIsIG51bWJlcl0gPSBudWxsO1xuICBwcml2YXRlIGxvZGFzaEZ1bmN0aW9uczogU2V0PHN0cmluZz4gPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBwcml2YXRlIGZpbGU6IHN0cmluZztcbiAgcHJpdmF0ZSBwYXRjaGVzOiBBcnJheTx7c3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIsIHJlcGxhY2VtZW50OiBzdHJpbmd9PiA9IFtdO1xuXG4gIGRvVHMoY29kZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuZmlsZSA9IGZpbGU7XG4gICAgY29uc3Qgc3JjZmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoJ2ZpbGUnLCBjb2RlLCB0cy5TY3JpcHRUYXJnZXQuRVMyMDE1KTtcbiAgICBmb3IoY29uc3Qgc3RtIG9mIHNyY2ZpbGUuc3RhdGVtZW50cykge1xuICAgICAgdGhpcy50cmF2ZXJzZVRzQXN0KHN0bSwgc3JjZmlsZSk7XG4gICAgfVxuICAgIC8vIGlmICh0aGlzLnBhdGNoZXMubGVuZ3RoID4gMCkge1xuICAgIC8vIFx0Y29kZSA9IHBhdGNoVGV4dChjb2RlLCB0aGlzLnBhdGNoZXMpO1xuICAgIC8vIFx0Y29kZSA9ICdpbXBvcnQgKiBhcyBfIGZyb20gXFwnbG9kYXNoXFwnO1xcbicgKyBjb2RlO1xuICAgIC8vIFx0bG9nLmRlYnVnKCdSZXBsYWNlIHJlcXVpcmUoXCJsb2Rhc2hcIikgd2l0aCBpbXBvcnQgc3ludGF4IGluXFxuICAnLCBjaGFsay55ZWxsb3coZmlsZSkpO1xuICAgIC8vIH0gZWxzZSBpZiAodGhpcy5oYXNMb2Rhc2hDYWxsICYmICF0aGlzLmxvZGFzaEltcG9ydGVkKSB7XG4gICAgLy8gXHRsb2cuZGVidWcoJyVzXFxuICBoYXMgbG9kYXNoIGZ1bmN0aW9uIGNhbGwsIGJ1dCBoYXMgbm8gbG9kYXNoIGltcG9ydGVkIGluIHNvdXJjZSBjb2RlJywgY2hhbGsueWVsbG93KGZpbGUpKTtcbiAgICAvLyBcdGNvZGUgPSAnaW1wb3J0ICogYXMgXyBmcm9tIFxcJ2xvZGFzaFxcJztcXG4nICsgY29kZTtcbiAgICAvLyB9XG4gICAgcmV0dXJuIGRvVHJhbnNwaWxlKGNvZGUsIHRoaXMucGF0Y2hlcywgdGhpcy5yZXF1aXJlTG9kYXNoUG9zLCB0aGlzLmxvZGFzaEZ1bmN0aW9ucywgdHJ1ZSk7XG4gIH1cblxuICBwcml2YXRlIHRyYXZlcnNlVHNBc3QoYXN0OiB0cy5Ob2RlLCBzcmNmaWxlOiB0cy5Tb3VyY2VGaWxlLCBsZXZlbCA9IDApIHtcbiAgICBjb25zdCBTeW50YXhLaW5kID0gdHMuU3ludGF4S2luZDtcbiAgICBpZiAoYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gICAgICBpZiAobm9kZS5leHByZXNzaW9uLmtpbmQgPT09IFN5bnRheEtpbmQuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKSB7XG4gICAgICAgIGNvbnN0IGxlZnQgPSAobm9kZS5leHByZXNzaW9uIGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikuZXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgcmlnaHQgPSAobm9kZS5leHByZXNzaW9uIGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZTtcbiAgICAgICAgaWYgKGxlZnQua2luZCA9PT0gU3ludGF4S2luZC5JZGVudGlmaWVyICYmIChsZWZ0IGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdfJyAmJlxuICAgICAgICAgIHJpZ2h0LmtpbmQgPT09IFN5bnRheEtpbmQuSWRlbnRpZmllcikge1xuICAgICAgICAgIHRoaXMubG9kYXNoRnVuY3Rpb25zLmFkZChyaWdodC50ZXh0KTtcbiAgICAgICAgICAvLyB0aGlzLmhhc0xvZGFzaENhbGwgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5JbXBvcnREZWNsYXJhdGlvbiAmJiAoKGFzdCBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbilcbiAgICAvLyAubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdsb2Rhc2gnKSB7XG4gICAgLy8gXHR0aGlzLmxvZGFzaEltcG9ydGVkID0gdHJ1ZTtcbiAgICAvLyB9IGVsc2UgXG4gICAgaWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLlZhcmlhYmxlU3RhdGVtZW50KSB7XG4gICAgICBjb25zdCBkZWNzID0gKGFzdCBhcyB0cy5WYXJpYWJsZVN0YXRlbWVudCkuZGVjbGFyYXRpb25MaXN0LmRlY2xhcmF0aW9ucztcbiAgICAgIGRlY3Muc29tZShkZWMgPT4ge1xuICAgICAgICBpZiAoZGVjLmluaXRpYWxpemVyICYmIGRlYy5pbml0aWFsaXplci5raW5kID09PSBTeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgY29uc3QgY2FsbEV4cCA9IGRlYy5pbml0aWFsaXplciBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcbiAgICAgICAgICBpZiAoY2FsbEV4cC5leHByZXNzaW9uLmtpbmQgPT09IFN5bnRheEtpbmQuSWRlbnRpZmllciAmJlxuICAgICAgICAgICAgKGNhbGxFeHAuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAncmVxdWlyZScgJiYgKGNhbGxFeHAuYXJndW1lbnRzWzBdIGFzIGFueSkudGV4dCA9PT0gJ2xvZGFzaCcpIHtcbiAgICAgICAgICAgICAgdGhpcy5yZXF1aXJlTG9kYXNoUG9zID0gW2FzdC5wb3MsIGFzdC5lbmRdO1xuICAgICAgICAgICAgLy8gdGhpcy5wYXRjaGVzLnB1c2goe1xuICAgICAgICAgICAgLy8gXHRzdGFydDogYXN0LnBvcyxcbiAgICAgICAgICAgIC8vIFx0ZW5kOiBhc3QuZW5kLFxuICAgICAgICAgICAgLy8gXHRyZXBsYWNlbWVudDogJydcbiAgICAgICAgICAgIC8vIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuRXhwcmVzc2lvblN0YXRlbWVudCAmJlxuICAgICAgKGFzdCBhcyB0cy5FeHByZXNzaW9uU3RhdGVtZW50KS5leHByZXNzaW9uLmtpbmQgPT09IFN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgIGNvbnN0IGNhbGxFeHAgPSAoYXN0IGFzIHRzLkV4cHJlc3Npb25TdGF0ZW1lbnQpLmV4cHJlc3Npb24gYXMgdHMuQ2FsbEV4cHJlc3Npb247XG4gICAgICBpZiAoY2FsbEV4cC5leHByZXNzaW9uLmtpbmQgPT09IFN5bnRheEtpbmQuSWRlbnRpZmllciAmJiAoY2FsbEV4cC5leHByZXNzaW9uIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdyZXF1aXJlJyAmJlxuICAgICAgKGNhbGxFeHAuYXJndW1lbnRzWzBdIGFzIGFueSkudGV4dCA9PT0gJ2xvZGFzaCcpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdSZW1vdmUgb3JwaGFuIHN0YXRlbWVudCByZXF1aXJlKFwibG9kYXNoXCIpIGZyb21cXG4gICcsIHRoaXMuZmlsZSk7XG4gICAgICAgIHRoaXMucGF0Y2hlcy5wdXNoKHtcbiAgICAgICAgICBzdGFydDogYXN0LnBvcyxcbiAgICAgICAgICBlbmQ6IGFzdC5lbmQsXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6ICcnXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBhc3QuZm9yRWFjaENoaWxkKChzdWI6IHRzLk5vZGUpID0+IHtcbiAgICAgIHRoaXMudHJhdmVyc2VUc0FzdChzdWIsIHNyY2ZpbGUsIGxldmVsICsgMSk7XG4gICAgfSk7XG4gIH1cbn1cbn1cbi8vIG1vZHVsZS5leHBvcnRzLlRTUGFyc2VyID0gVFNQYXJzZXI7XG5leHBvcnQgPSBsb2FkZXI7XG4iXX0=
