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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL3RzL2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7OztHQVVHO0FBQ0gsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQyx1REFBaUM7QUFDakMsa0NBQWtDO0FBQ2xDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3hELElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3QixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDMUMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEQsSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hFLFFBQVEsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEMsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBQzFELE1BQU0sRUFBQyxVQUFVLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFFN0MsU0FBUyxNQUFNLENBQUMsT0FBZSxFQUFFLEdBQVE7SUFDeEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRO1FBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0lBQ3JELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRTtRQUM5QixPQUFPLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0tBQ3BDO0lBQ0QsU0FBUyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUM7U0FD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LENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQzt3QkFDakIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO3dCQUNkLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRzt3QkFDWixXQUFXLEVBQUUsRUFBRTtxQkFDZixDQUFDLENBQUM7aUJBQ0g7YUFDRDtZQUNELEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFZLEVBQUUsRUFBRTtnQkFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM3QyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7S0FDRDtJQS9FWSxlQUFRLFdBK0VwQixDQUFBO0FBQ0QsQ0FBQyxFQWhMUyxNQUFNLEtBQU4sTUFBTSxRQWdMZjtBQUVELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xpYi9yZXF1aXJlLWxvZGFzaC1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEJlY2F1c2UgbW9zdCBvZiB0aGUgbGVnYWN5IGNvZGUgaXMgd3JpdHRlbiBpbiBjb21tb25qcyBzdHlsZSxcbiAqIGJhYmVsLWxvZGFzaC1wbHVnaW4gY2FuIG5vdCBoZWxwIHRvIHRyZWUtc2hha2UgbG9kYXNoIGJ1bmRsZSBzaXplLlxuICogVGhpcyBsb2FkZXIgZG8gaGVscCBpbiBzb2x2aW5nIHRoaXMgcHJvYmxlbSxcbiAqIFJlcGxhY2UgXCJ2YXIgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpXCIgdG8gXG4gKiAgIFwidmFyIF8gPSB7XG4gKiAgICAgICAgIGRlYm91bmNlOiByZXF1aXJlKCdsb2Rhc2gvZGVib3VuZCcpLFxuICogICAgICAgICAuLi5cbiAqICAgfVwiIGJhc2VkIG9uIGNvZGUgYW5hbHlzaXMgcmVzdWx0LlxuICpcbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHBhdGNoVGV4dCA9IHJlcXVpcmUoJy4uLy4uL2xpYi91dGlscy9wYXRjaC10ZXh0Jyk7XG52YXIgYWNvcm4gPSByZXF1aXJlKCdhY29ybicpO1xudmFyIGVzdHJhdmVyc2UgPSByZXF1aXJlKCdlc3RyYXZlcnNlLWZiJyk7XG52YXIgYWNvcm5qc3ggPSByZXF1aXJlKCdhY29ybi1qc3gvaW5qZWN0JykoYWNvcm4pO1xudmFyIGFjb3JuSW1wSW5qZWN0ID0gcmVxdWlyZSgnYWNvcm4tZHluYW1pYy1pbXBvcnQvbGliL2luamVjdCcpLmRlZmF1bHQ7XG5hY29ybmpzeCA9IGFjb3JuSW1wSW5qZWN0KGFjb3JuanN4KTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5yZXF1aXJlLWxvZGFzaC1sb2FkZXInKTtcbmNvbnN0IHtnZXRPcHRpb25zfSA9IHJlcXVpcmUoJ2xvYWRlci11dGlscycpO1xuXG5mdW5jdGlvbiBsb2FkZXIoY29udGVudDogc3RyaW5nLCBtYXA6IGFueSkge1xuXHR2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG5cdGlmICghY2FsbGJhY2spXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdhcGktbG9hZGVyIGlzIE5vdCBhIHN5bmMgbG9hZGVyIScpO1xuXHRpZiAoZ2V0T3B0aW9ucyh0aGlzKS5kaXNhYmxlZCkge1xuXHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBjb250ZW50LCBtYXApO1xuXHR9XG5cdGxvYWRBc3luYyhjb250ZW50LCB0aGlzKVxuXHQudGhlbihyZXN1bHQgPT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0LCBtYXApKVxuXHQuY2F0Y2goZXJyID0+IHtcblx0XHRsb2cuZXJyb3IoZXJyKTtcblx0XHRjYWxsYmFjayhlcnIpO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gbG9hZEFzeW5jKGNvZGU6IHN0cmluZywgbG9hZGVyQ3R4OiBhbnkpOiBQcm9taXNlPHN0cmluZz4ge1xuXHRjb25zdCBmaWxlID0gbG9hZGVyQ3R4LnJlc291cmNlUGF0aDtcblx0aWYgKGZpbGUuZW5kc1dpdGgoJy5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5qc3gnKSlcblx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGxvYWRlci5kb0VzKGNvZGUsIGZpbGUpWzBdKTtcblx0ZWxzZSBpZiAoZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLnRzeCcpKVxuXHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUobmV3IGxvYWRlci5UU1BhcnNlcigpLmRvVHMoY29kZSwgZmlsZSkpO1xuXHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGNvZGUpO1xufVxuXG5uYW1lc3BhY2UgbG9hZGVyIHtcbmNvbnN0IERJU0FCTEVfQkFOTkVSID0gL1xcL1xcKlxccypub1xccysoPzppbXBvcnR8cmVxdWlyZSktbG9kYXNoLWxvYWRlclxccypcXCpcXC8vO1xuXG4vLyBtb2R1bGUuZXhwb3J0cy5kb0VzID0gZG9FcztcblxuZXhwb3J0IGZ1bmN0aW9uIGRvRXMoY29kZTogc3RyaW5nLCBmaWxlOiBzdHJpbmcpOiBbc3RyaW5nLCBhbnldIHtcblx0aWYgKERJU0FCTEVfQkFOTkVSLnRlc3QoY29kZSkpXG5cdFx0cmV0dXJuIFtjb2RlLCBudWxsXTtcblx0dmFyIGFzdDtcblx0dmFyIGZpcnN0Q29tcGlsZUVyciA9IG51bGw7XG5cdHRyeSB7XG5cdFx0YXN0ID0gYWNvcm5qc3gucGFyc2UoY29kZSwge2FsbG93SGFzaEJhbmc6IHRydWUsIHNvdXJjZVR5cGU6ICdtb2R1bGUnLCBwbHVnaW5zOiB7anN4OiB0cnVlLCBkeW5hbWljSW1wb3J0OiB0cnVlfX0pO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRmaXJzdENvbXBpbGVFcnIgPSBlcnI7XG5cdFx0dHJ5IHtcblx0XHRcdGFzdCA9IGFjb3JuanN4LnBhcnNlKGNvZGUsIHthbGxvd0hhc2hCYW5nOiB0cnVlLCBwbHVnaW5zOiB7anN4OiB0cnVlLCBkeW5hbWljSW1wb3J0OiB0cnVlfX0pO1xuXHRcdH0gY2F0Y2ggKGVycjIpIHtcblx0XHRcdGZpcnN0Q29tcGlsZUVyci5tZXNzYWdlICs9ICdcXG5PciAnICsgZXJyMi5tZXNzYWdlO1xuXHRcdFx0Zmlyc3RDb21waWxlRXJyLnN0YWNrICs9ICdcXG5Bbm90aGVyIHBvc3NpYmxlIGNvbXBpbGF0aW9uIGVycm9yIGlzXFxuJyArIGVycjIuc3RhY2s7XG5cdFx0XHR0aHJvdyBmaXJzdENvbXBpbGVFcnI7XG5cdFx0fVxuXHR9XG5cdGNvbnN0IHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+ID0gW107XG5cblx0Ly8gbGV0IGxvZGFzaEltcG9ydGVkID0gZmFsc2U7XG5cdGxldCByZXF1aXJlTG9kYXNoUG9zOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbCA9IG51bGw7XG5cdC8vIGxldCBoYXNFeHBvcnRzID0gZmFsc2U7XG5cdGNvbnN0IGxvZGFzaEZ1bmN0aW9uczogU2V0PHN0cmluZz4gPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuXHRlc3RyYXZlcnNlLnRyYXZlcnNlKGFzdCwge1xuXHRcdGVudGVyKG5vZGU6IGFueSwgcGFyZW50OiBhbnkpIHtcblx0XHRcdGlmIChub2RlLnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiYgbm9kZS5jYWxsZWUudHlwZSA9PT0gJ01lbWJlckV4cHJlc3Npb24nICYmXG5cdFx0XHRcdG5vZGUuY2FsbGVlLm9iamVjdC5uYW1lID09PSAnXycgJiYgbm9kZS5jYWxsZWUub2JqZWN0LnR5cGUgPT09ICdJZGVudGlmaWVyJyAmJlxuXHRcdFx0XHRub2RlLmNhbGxlZS5wcm9wZXJ0eS50eXBlID09PSAnSWRlbnRpZmllcicpIHtcblx0XHRcdFx0bG9kYXNoRnVuY3Rpb25zLmFkZChub2RlLmNhbGxlZS5wcm9wZXJ0eS5uYW1lKTtcblx0XHRcdH1cblx0XHRcdGlmIChub2RlLnR5cGUgPT09ICdWYXJpYWJsZURlY2xhcmF0b3InICYmIF8uZ2V0KG5vZGUsICdpZC5uYW1lJykgPT09ICdfJyAmJlxuXHRcdFx0Xy5nZXQocGFyZW50LCAnZGVjbGFyYXRpb25zLmxlbmd0aCcpID09PSAxKSB7XG5cdFx0XHRcdGNvbnN0IGluaXQgPSBub2RlLmluaXQ7XG5cdFx0XHRcdGlmIChpbml0LnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiYgXy5nZXQoaW5pdCwgJ2NhbGxlZS5uYW1lJykgPT09ICdyZXF1aXJlJyAmJlxuXHRcdFx0XHRcdF8uZ2V0KGluaXQsICdhcmd1bWVudHNbMF0udmFsdWUnKSA9PT0gJ2xvZGFzaCcpIHtcblx0XHRcdFx0XHRcdHJlcXVpcmVMb2Rhc2hQb3MgPSBbcGFyZW50LnN0YXJ0LCBwYXJlbnQuZW5kXTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmIChwYXJlbnQgJiYgcGFyZW50LnR5cGUgPT09ICdFeHByZXNzaW9uU3RhdGVtZW50JyAmJiBub2RlLnR5cGUgPT09ICdDYWxsRXhwcmVzc2lvbicgJiZcblx0XHRcdF8uZ2V0KG5vZGUsICdjYWxsZWUubmFtZScpID09PSAncmVxdWlyZScgJiZcblx0XHRcdF8uZ2V0KG5vZGUsICdhcmd1bWVudHNbMF0udmFsdWUnKSA9PT0gJ2xvZGFzaCcgJiYgcGFyZW50LnR5cGUgPT09ICdFeHByZXNzaW9uU3RhdGVtZW50Jykge1xuXHRcdFx0XHRsb2cuZGVidWcoJ1JlbW92ZSBvcnBoYW4gc3RhdGVtZW50IHJlcXVpcmUoXCJsb2Rhc2hcIikgZnJvbVxcbiVzICAnLCBmaWxlKTtcblx0XHRcdFx0cGF0Y2hlcy5wdXNoKHtcblx0XHRcdFx0XHRzdGFydDogcGFyZW50LnN0YXJ0LFxuXHRcdFx0XHRcdGVuZDogcGFyZW50LmVuZCxcblx0XHRcdFx0XHRyZXBsYWNlbWVudDogJydcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRsZWF2ZShub2RlOiBhbnksIHBhcmVudDogYW55KSB7XG5cdFx0fSxcblx0XHRrZXlzOiB7XG5cdFx0XHRJbXBvcnQ6IFtdLCBKU1hUZXh0OiBbXVxuXHRcdH1cblx0fSk7XG5cblx0cmV0dXJuIFtkb1RyYW5zcGlsZShjb2RlLCBwYXRjaGVzLCByZXF1aXJlTG9kYXNoUG9zLCBsb2Rhc2hGdW5jdGlvbnMpLCBhc3RdO1xufVxuXG5mdW5jdGlvbiBkb1RyYW5zcGlsZShjb2RlOiBzdHJpbmcsXG5cdHBhdGNoZXM6IEFycmF5PHtzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlciwgcmVwbGFjZW1lbnQ6IHN0cmluZ30+LFxuXHRyZXF1aXJlTG9kYXNoUG9zOiBbbnVtYmVyLCBudW1iZXJdIHwgbnVsbCwgbG9kYXNoRnVuY3Rpb25zOiBTZXQ8c3RyaW5nPiwgaXNUeXBlc2NyaXB0ID0gZmFsc2UpOiBzdHJpbmcge1xuXHRpZiAocmVxdWlyZUxvZGFzaFBvcykge1xuXHRcdGlmIChsb2Rhc2hGdW5jdGlvbnMuc2l6ZSA+IDApIHtcblx0XHRcdGxldCBjb2RlID0gYHZhciBfJHtpc1R5cGVzY3JpcHQgPyAnOiBhbnknIDogJyd9ID0ge2A7XG5cdFx0XHRsZXQgaSA9IDA7XG5cdFx0XHRsb2Rhc2hGdW5jdGlvbnMuZm9yRWFjaChmdW5jTmFtZSA9PiB7XG5cdFx0XHRcdGlmIChpKysgPiAwKVxuXHRcdFx0XHRcdGNvZGUgKz0gJywgJztcblx0XHRcdFx0Y29kZSArPSBgJHtmdW5jTmFtZX06IHJlcXVpcmUoJ2xvZGFzaC8ke2Z1bmNOYW1lfScpYDtcblx0XHRcdH0pO1xuXHRcdFx0Y29kZSArPSAnfTsnO1xuXHRcdFx0cGF0Y2hlcy5wdXNoKHtcblx0XHRcdFx0c3RhcnQ6IHJlcXVpcmVMb2Rhc2hQb3NbMF0sXG5cdFx0XHRcdGVuZDogcmVxdWlyZUxvZGFzaFBvc1sxXSxcblx0XHRcdFx0cmVwbGFjZW1lbnQ6IGNvZGVcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXRjaGVzLnB1c2goe1xuXHRcdFx0XHRzdGFydDogcmVxdWlyZUxvZGFzaFBvc1swXSxcblx0XHRcdFx0ZW5kOiByZXF1aXJlTG9kYXNoUG9zWzFdLFxuXHRcdFx0XHRyZXBsYWNlbWVudDogJydcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gcGF0Y2hUZXh0KGNvZGUsIHBhdGNoZXMpO1xuXHR9IGVsc2UgaWYgKHBhdGNoZXMpIHtcblx0XHRyZXR1cm4gcGF0Y2hUZXh0KGNvZGUsIHBhdGNoZXMpO1xuXHR9XG5cdHJldHVybiBjb2RlO1xufVxuXG5leHBvcnQgY2xhc3MgVFNQYXJzZXIge1xuXHQvLyBwcml2YXRlIGhhc0xvZGFzaENhbGwgPSBmYWxzZTtcblx0Ly8gcHJpdmF0ZSBsb2Rhc2hJbXBvcnRlZCA9IGZhbHNlO1xuXHRwcml2YXRlIHJlcXVpcmVMb2Rhc2hQb3M6IFtudW1iZXIsIG51bWJlcl0gfCBudWxsID0gbnVsbDtcblx0cHJpdmF0ZSBsb2Rhc2hGdW5jdGlvbnM6IFNldDxzdHJpbmc+ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cblx0cHJpdmF0ZSBmaWxlOiBzdHJpbmc7XG5cdHByaXZhdGUgcGF0Y2hlczogQXJyYXk8e3N0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyLCByZXBsYWNlbWVudDogc3RyaW5nfT4gPSBbXTtcblxuXHRkb1RzKGNvZGU6IHN0cmluZywgZmlsZTogc3RyaW5nKTogc3RyaW5nIHtcblx0XHR0aGlzLmZpbGUgPSBmaWxlO1xuXHRcdGNvbnN0IHNyY2ZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKCdmaWxlJywgY29kZSwgdHMuU2NyaXB0VGFyZ2V0LkVTMjAxNSk7XG5cdFx0Zm9yKGNvbnN0IHN0bSBvZiBzcmNmaWxlLnN0YXRlbWVudHMpIHtcblx0XHRcdHRoaXMudHJhdmVyc2VUc0FzdChzdG0sIHNyY2ZpbGUpO1xuXHRcdH1cblx0XHQvLyBpZiAodGhpcy5wYXRjaGVzLmxlbmd0aCA+IDApIHtcblx0XHQvLyBcdGNvZGUgPSBwYXRjaFRleHQoY29kZSwgdGhpcy5wYXRjaGVzKTtcblx0XHQvLyBcdGNvZGUgPSAnaW1wb3J0ICogYXMgXyBmcm9tIFxcJ2xvZGFzaFxcJztcXG4nICsgY29kZTtcblx0XHQvLyBcdGxvZy5kZWJ1ZygnUmVwbGFjZSByZXF1aXJlKFwibG9kYXNoXCIpIHdpdGggaW1wb3J0IHN5bnRheCBpblxcbiAgJywgY2hhbGsueWVsbG93KGZpbGUpKTtcblx0XHQvLyB9IGVsc2UgaWYgKHRoaXMuaGFzTG9kYXNoQ2FsbCAmJiAhdGhpcy5sb2Rhc2hJbXBvcnRlZCkge1xuXHRcdC8vIFx0bG9nLmRlYnVnKCclc1xcbiAgaGFzIGxvZGFzaCBmdW5jdGlvbiBjYWxsLCBidXQgaGFzIG5vIGxvZGFzaCBpbXBvcnRlZCBpbiBzb3VyY2UgY29kZScsIGNoYWxrLnllbGxvdyhmaWxlKSk7XG5cdFx0Ly8gXHRjb2RlID0gJ2ltcG9ydCAqIGFzIF8gZnJvbSBcXCdsb2Rhc2hcXCc7XFxuJyArIGNvZGU7XG5cdFx0Ly8gfVxuXHRcdHJldHVybiBkb1RyYW5zcGlsZShjb2RlLCB0aGlzLnBhdGNoZXMsIHRoaXMucmVxdWlyZUxvZGFzaFBvcywgdGhpcy5sb2Rhc2hGdW5jdGlvbnMsIHRydWUpO1xuXHR9XG5cblx0cHJpdmF0ZSB0cmF2ZXJzZVRzQXN0KGFzdDogdHMuTm9kZSwgc3JjZmlsZTogdHMuU291cmNlRmlsZSwgbGV2ZWwgPSAwKSB7XG5cdFx0Y29uc3QgU3ludGF4S2luZCA9IHRzLlN5bnRheEtpbmQ7XG5cdFx0aWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG5cdFx0XHRjb25zdCBub2RlID0gYXN0IGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuXHRcdFx0aWYgKG5vZGUuZXhwcmVzc2lvbi5raW5kID09PSBTeW50YXhLaW5kLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikge1xuXHRcdFx0XHRjb25zdCBsZWZ0ID0gKG5vZGUuZXhwcmVzc2lvbiBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLmV4cHJlc3Npb247XG5cdFx0XHRcdGNvbnN0IHJpZ2h0ID0gKG5vZGUuZXhwcmVzc2lvbiBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWU7XG5cdFx0XHRcdGlmIChsZWZ0LmtpbmQgPT09IFN5bnRheEtpbmQuSWRlbnRpZmllciAmJiAobGVmdCBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAnXycgJiZcblx0XHRcdFx0XHRyaWdodC5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIpIHtcblx0XHRcdFx0XHR0aGlzLmxvZGFzaEZ1bmN0aW9ucy5hZGQocmlnaHQudGV4dCk7XG5cdFx0XHRcdFx0Ly8gdGhpcy5oYXNMb2Rhc2hDYWxsID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyBpZiAoYXN0LmtpbmQgPT09IFN5bnRheEtpbmQuSW1wb3J0RGVjbGFyYXRpb24gJiYgKChhc3QgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb24pXG5cdFx0Ly8gLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0ID09PSAnbG9kYXNoJykge1xuXHRcdC8vIFx0dGhpcy5sb2Rhc2hJbXBvcnRlZCA9IHRydWU7XG5cdFx0Ly8gfSBlbHNlIFxuXHRcdGlmIChhc3Qua2luZCA9PT0gU3ludGF4S2luZC5WYXJpYWJsZVN0YXRlbWVudCkge1xuXHRcdFx0Y29uc3QgZGVjcyA9IChhc3QgYXMgdHMuVmFyaWFibGVTdGF0ZW1lbnQpLmRlY2xhcmF0aW9uTGlzdC5kZWNsYXJhdGlvbnM7XG5cdFx0XHRkZWNzLnNvbWUoZGVjID0+IHtcblx0XHRcdFx0aWYgKGRlYy5pbml0aWFsaXplciAmJiBkZWMuaW5pdGlhbGl6ZXIua2luZCA9PT0gU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuXHRcdFx0XHRcdGNvbnN0IGNhbGxFeHAgPSBkZWMuaW5pdGlhbGl6ZXIgYXMgdHMuQ2FsbEV4cHJlc3Npb247XG5cdFx0XHRcdFx0aWYgKGNhbGxFeHAuZXhwcmVzc2lvbi5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiZcblx0XHRcdFx0XHRcdChjYWxsRXhwLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ3JlcXVpcmUnICYmIChjYWxsRXhwLmFyZ3VtZW50c1swXSBhcyBhbnkpLnRleHQgPT09ICdsb2Rhc2gnKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMucmVxdWlyZUxvZGFzaFBvcyA9IFthc3QucG9zLCBhc3QuZW5kXTtcblx0XHRcdFx0XHRcdC8vIHRoaXMucGF0Y2hlcy5wdXNoKHtcblx0XHRcdFx0XHRcdC8vIFx0c3RhcnQ6IGFzdC5wb3MsXG5cdFx0XHRcdFx0XHQvLyBcdGVuZDogYXN0LmVuZCxcblx0XHRcdFx0XHRcdC8vIFx0cmVwbGFjZW1lbnQ6ICcnXG5cdFx0XHRcdFx0XHQvLyB9KTtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKGFzdC5raW5kID09PSBTeW50YXhLaW5kLkV4cHJlc3Npb25TdGF0ZW1lbnQgJiZcblx0XHRcdChhc3QgYXMgdHMuRXhwcmVzc2lvblN0YXRlbWVudCkuZXhwcmVzc2lvbi5raW5kID09PSBTeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG5cdFx0XHRjb25zdCBjYWxsRXhwID0gKGFzdCBhcyB0cy5FeHByZXNzaW9uU3RhdGVtZW50KS5leHByZXNzaW9uIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuXHRcdFx0aWYgKGNhbGxFeHAuZXhwcmVzc2lvbi5raW5kID09PSBTeW50YXhLaW5kLklkZW50aWZpZXIgJiYgKGNhbGxFeHAuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAncmVxdWlyZScgJiZcblx0XHRcdChjYWxsRXhwLmFyZ3VtZW50c1swXSBhcyBhbnkpLnRleHQgPT09ICdsb2Rhc2gnKSB7XG5cdFx0XHRcdGxvZy5kZWJ1ZygnUmVtb3ZlIG9ycGhhbiBzdGF0ZW1lbnQgcmVxdWlyZShcImxvZGFzaFwiKSBmcm9tXFxuICAnLCB0aGlzLmZpbGUpO1xuXHRcdFx0XHR0aGlzLnBhdGNoZXMucHVzaCh7XG5cdFx0XHRcdFx0c3RhcnQ6IGFzdC5wb3MsXG5cdFx0XHRcdFx0ZW5kOiBhc3QuZW5kLFxuXHRcdFx0XHRcdHJlcGxhY2VtZW50OiAnJ1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0YXN0LmZvckVhY2hDaGlsZCgoc3ViOiB0cy5Ob2RlKSA9PiB7XG5cdFx0XHR0aGlzLnRyYXZlcnNlVHNBc3Qoc3ViLCBzcmNmaWxlLCBsZXZlbCArIDEpO1xuXHRcdH0pO1xuXHR9XG59XG59XG4vLyBtb2R1bGUuZXhwb3J0cy5UU1BhcnNlciA9IFRTUGFyc2VyO1xuZXhwb3J0ID0gbG9hZGVyO1xuIl19
