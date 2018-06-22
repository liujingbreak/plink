import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import replaceCode, {ReplacementInf} from './patch-text';
import {trim} from 'lodash';
import api, {DrcpApi} from '__api';
import vm = require('vm');

const log = require('log4js').getLogger(api.packageName + '.api-aot-compiler');
export default class ApiAotCompiler {
	static idText(node: any) {
		return node.text;
	}
	ast: ts.SourceFile;

	replacements: ReplacementInf[] = [];

	constructor(protected file: string, protected src: string) {
	}

	parse() {
		let pk = api.findPackageByFile(this.file);
		if (pk == null)
			return this.src;

		this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext,
			true, ts.ScriptKind.TSX);
		for(let stm of this.ast.statements) {
			this.traverseTsAst(stm);
		}

		if (this.replacements.length > 0)
			log.info('Compile API call in ', this.file);
		let context = vm.createContext({__api: api.getNodeApiForPackage<DrcpApi>(pk)});

		for (let repl of this.replacements) {
			let origText = repl.text;
			let res = vm.runInNewContext(origText, context);
			repl.text = JSON.stringify(res);
			log.info(`Evaluate "${origText}" to: ${res}`);
		}
		log.debug(this.replacements);
		return replaceCode(this.src, this.replacements);
	}

	getApiForFile(file: string) {
		api.findPackageByFile(file);
	}

	private traverseTsAst(ast: ts.Node, level = 0) {
		if (ast.kind === sk.PropertyAccessExpression || ast.kind === sk.ElementAccessExpression) {
			let node = ast as (ts.PropertyAccessExpression | ts.ElementAccessExpression);
			if (node.expression.kind === sk.Identifier && ApiAotCompiler.idText(node.expression) === '__api') {
				if (node.parent.kind === sk.CallExpression && (node.parent as ts.CallExpression).expression === node) {
					// It is a function call __api.xxx()
					this.replacements.push({start: node.parent.pos, end: node.parent.end,
						text: this.nodeText(node.parent)});
				} else {
					this.replacements.push({start: node.pos, end: node.end, text: this.nodeText(node)});
				}
			}
		}
		ast.forEachChild((sub: ts.Node) => {
			this.traverseTsAst(sub, level + 1);
		});
	}

	private nodeText(ast: ts.Node) {
		return trim(this.src.substring(ast.pos, ast.end));
	}
}
