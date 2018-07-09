import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import replaceCode, {ReplacementInf} from './patch-text';
import {trim} from 'lodash';
import api, {DrcpApi} from '__api';
import vm = require('vm');
import ImportClauseTranspile from './default-import-ts-transpiler';

const chalk = require('chalk');
// import chalk from 'chalk';

const log = require('log4js').getLogger(api.packageName + '.api-aot-compiler');
export default class ApiAotCompiler {
	static idText(node: any) {
		return node.text;
	}
	ast: ts.SourceFile;

	replacements: ReplacementInf[] = [];

	importTranspiler: ImportClauseTranspile;

	constructor(protected file: string, protected src: string) {
		if (api.ssr) {
			this.importTranspiler = new ImportClauseTranspile({
				file: this.file,
				modules: [/^lodash(?:\/|$)/]
			});
		}
	}

	parse(transpileExp: (source: string) => string): string {
		const pk = api.findPackageByFile(this.file);
		if (pk == null)
			return this.src;

		this.ast = ts.createSourceFile(this.file, this.src, ts.ScriptTarget.ESNext,
			true, ts.ScriptKind.TSX);
		for(const stm of this.ast.statements) {
			this.traverseTsAst(stm);
		}

		const context = vm.createContext({__api: api.getNodeApiForPackage<DrcpApi>(pk)});

		for (const repl of this.replacements) {
			const origText = repl.text;
			let res;
			try {
				res = vm.runInNewContext(transpileExp(origText), context);
				repl.text = JSON.stringify(res);
				// To bypass TS error "Unreachable code detected" if
				// compiler option "allowUnreachableCode: false"
				// e.g. if (false) {...} --> if (!!false) {...}
				if (repl.text === 'true' || repl.text === 'false')
					repl.text = '!!' + repl.text;
			} catch(ex) {
				log.warn('Evaluate %s, result:', origText, res);
				throw ex;
			}
			log.info(`Evaluate "${chalk.yellow(origText)}" to: ${chalk.cyan(repl.text)}`);
		}
		if (this.importTranspiler)
			this.importTranspiler.parse(this.ast, this.replacements);

		if (this.replacements.length === 0)
			return this.src;
		log.debug(this.replacements);
		return replaceCode(this.src, this.replacements);
	}

	getApiForFile(file: string) {
		api.findPackageByFile(file);
	}

	protected traverseTsAst(ast: ts.Node, level = 0) {
		if (ast.kind === sk.PropertyAccessExpression || ast.kind === sk.ElementAccessExpression) {
			const node = ast as (ts.PropertyAccessExpression | ts.ElementAccessExpression);
			if (node.expression.kind === sk.Identifier && ApiAotCompiler.idText(node.expression) === '__api') {
				// keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
				let evaluateNode = this.goUpToParentExpress(node);
				this.replacements.push({start: evaluateNode.pos, end: evaluateNode.end, text: this.nodeText(evaluateNode)});
			}
		}
		ast.forEachChild((sub: ts.Node) => {
			this.traverseTsAst(sub, level + 1);
		});
	}

	/**
	 * keep looking up for parents until it is not CallExpression, ElementAccessExpression or PropertyAccessExpression
	 */
	protected goUpToParentExpress(currNode: ts.Node): ts.Node {
		while(true) {
			let kind = currNode.parent.kind;
			if (kind === sk.CallExpression && (currNode.parent as ts.CallExpression).expression === currNode ||
				kind === sk.PropertyAccessExpression && (currNode.parent as ts.PropertyAccessExpression).expression === currNode ||
				kind === sk.ElementAccessExpression && (currNode.parent as ts.ElementAccessExpression).expression === currNode) {
				currNode = currNode.parent;
			} else {
				break;
			}
		}
		return currNode;
	}

	protected nodeText(ast: ts.Node) {
		return trim(this.src.substring(ast.pos, ast.end));
	}
}
