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
import * as _ from 'lodash';
import * as log4js from 'log4js';
import * as ts from 'typescript';
// const chalk = require('chalk');
const patchText = require('../../lib/utils/patch-text');
var acorn = require('acorn');
var estraverse = require('estraverse-fb');
var acornjsx = require('acorn-jsx/inject')(acorn);
var acornImpInject = require('acorn-dynamic-import/lib/inject').default;
acornjsx = acornImpInject(acornjsx);
const log = log4js.getLogger('wfh.require-lodash-loader');
const {getOptions} = require('loader-utils');

function loader(content: string, map: any) {
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

function loadAsync(code: string, loaderCtx: any): Promise<string> {
	let file = loaderCtx.resourcePath;
	if (file.endsWith('.js') || file.endsWith('.jsx'))
		return Promise.resolve(loader.doEs(code, file)[0]);
	else if (file.endsWith('.ts') || file.endsWith('.tsx'))
		return Promise.resolve(new loader.TSParser().doTs(code, file));
	return Promise.resolve(code);
}

namespace loader {
const DISABLE_BANNER = /\/\*\s*no\s+(?:import|require)-lodash-loader\s*\*\//;

// module.exports.doEs = doEs;

export function doEs(code: string, file: string): [string, any] {
	if (DISABLE_BANNER.test(code))
		return [code, null];
	var ast;
	try {
		ast = acornjsx.parse(code, {allowHashBang: true, sourceType: 'module', plugins: {jsx: true, dynamicImport: true}});
	} catch (err) {
		ast = acornjsx.parse(code, {allowHashBang: true, plugins: {jsx: true, dynamicImport: true}});
	}
	let patches: Array<{start: number, end: number, replacement: string}> = [];

	// let lodashImported = false;
	let requireLodashPos: [number, number] = null;
	// let hasExports = false;
	let lodashFunctions: Set<string> = new Set<string>();

	estraverse.traverse(ast, {
		enter(node: any, parent: any) {
			if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
				node.callee.object.name === '_' && node.callee.object.type === 'Identifier' &&
				node.callee.property.type === 'Identifier') {
				lodashFunctions.add(node.callee.property.name);
			}
			// if (node.type === 'MemberExpression' && node.object.type === 'Identifier' &&
			// (node.object.name === 'exports' || node.object.name === 'module' && node.property.name === 'exports')) {
			// 	hasExports = true;
			// }
			// if (node.type === 'ImportDeclaration' && node.source.value === 'lodash') {
			// 	lodashImported = true;
			// } else 
			if (node.type === 'VariableDeclarator' && _.get(node, 'id.name') === '_' &&
			_.get(parent, 'declarations.length') === 1) {
				let init = node.init;
				if (init.type === 'CallExpression' && _.get(init, 'callee.name') === 'require' &&
					_.get(init, 'arguments[0].value') === 'lodash') {
						requireLodashPos = [parent.start, parent.end];
						// patches.push({
						// 	start: parent.start,
						// 	end: parent.end,
						// 	replacement: ''
						// });
				}
			} else if (parent && parent.type === 'ExpressionStatement' && node.type === 'CallExpression' &&
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
		leave(node: any, parent: any) {
		},
		keys: {
			Import: [], JSXText: []
		}
	});

	return [doTranspile(code, patches, requireLodashPos, lodashFunctions), ast];
}

function doTranspile(code: string,
	patches: Array<{start: number, end: number, replacement: string}>,
	requireLodashPos: [number, number], lodashFunctions: Set<string>, isTypescript = false): string {
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
			} else {
				patches.push({
					start: requireLodashPos[0],
					end: requireLodashPos[1],
					replacement: ''
				});
			}
			return patchText(code, patches);
		} else if (patches) {
			return patchText(code, patches);
		}
}

export class TSParser {
	// private hasLodashCall = false;
	// private lodashImported = false;
	private requireLodashPos: [number, number] = null;
	private lodashFunctions: Set<string> = new Set<string>();

	private file: string;
	private patches: Array<{start: number, end: number, replacement: string}> = [];

	doTs(code: string, file: string): string {
		this.file = file;
		let srcfile = ts.createSourceFile('file', code, ts.ScriptTarget.ES2015);
		for(let stm of srcfile.statements) {
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

	private traverseTsAst(ast: ts.Node, srcfile: ts.SourceFile, level = 0) {
		let SyntaxKind = ts.SyntaxKind;
		if (ast.kind === SyntaxKind.CallExpression) {
			let node = ast as ts.CallExpression;
			if (node.expression.kind === SyntaxKind.PropertyAccessExpression) {
				let left = (node.expression as ts.PropertyAccessExpression).expression;
				let right = (node.expression as ts.PropertyAccessExpression).name;
				if (left.kind === SyntaxKind.Identifier && (left as ts.Identifier).text === '_' &&
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
			let decs = (ast as ts.VariableStatement).declarationList.declarations;
			decs.some(dec => {
				if (dec.initializer && dec.initializer.kind === SyntaxKind.CallExpression) {
					let callExp = dec.initializer as ts.CallExpression;
					if (callExp.expression.kind === SyntaxKind.Identifier &&
						(callExp.expression as ts.Identifier).text === 'require' && (callExp.arguments[0] as any).text === 'lodash') {
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
		} else if (ast.kind === SyntaxKind.ExpressionStatement &&
			(ast as ts.ExpressionStatement).expression.kind === SyntaxKind.CallExpression) {
			let callExp = (ast as ts.ExpressionStatement).expression as ts.CallExpression;
			if (callExp.expression.kind === SyntaxKind.Identifier && (callExp.expression as ts.Identifier).text === 'require' &&
			(callExp.arguments[0] as any).text === 'lodash') {
				log.debug('Remove orphan statement require("lodash") from\n  ', this.file);
				this.patches.push({
					start: ast.pos,
					end: ast.end,
					replacement: ''
				});
			}
		}
		ast.forEachChild((sub: ts.Node) => {
			this.traverseTsAst(sub, srcfile, level + 1);
		});
	}
}
}
// module.exports.TSParser = TSParser;
export = loader;
