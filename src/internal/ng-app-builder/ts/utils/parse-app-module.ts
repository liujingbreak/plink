import * as ts from 'typescript';
import {SyntaxKind as sk} from 'typescript';
import * as _ from 'lodash';
import replaceCode, {ReplacementInf} from './patch-text';
import * as Path from 'path';
import * as fs from 'fs';

export class EsImportStatement {
	defaultName?: string;
	namespace?: string;
	nameBinding?: {[as: string]: string}; // key is "as", value is original name
	isDynamic = false;

	constructor(public from: string, public start: number, public end: number) {}

	asNameToRealName(asName: string) {
		const idxOfDot = asName.indexOf('.');
		if (idxOfDot > 0) {
			asName = asName.substring(0, idxOfDot);
		}
		if (this.defaultName === asName)
			return asName;
		else if (this.nameBinding && _.has(this.nameBinding, asName)) {
			return this.nameBinding[asName];
		} else if (asName === this.namespace) {
			return this.namespace;
		}
		throw new Error(`No "${asName}" found in import statement from "${this.from}"`);
	}
}

export function findAppModuleFileFromMain(mainFile: string): string {
	const srcfile = ts.createSourceFile(mainFile, fs.readFileSync(mainFile, 'utf8'), ts.ScriptTarget.ESNext,
		true, ts.ScriptKind.TSX);
	let appModuleFile: string;
	for(const stm of srcfile.statements) {
		if (stm.kind === sk.ImportDeclaration && _.has(stm, 'importClause.namedBindings')) {
			const binding = (stm as ts.ImportDeclaration).importClause.namedBindings as ts.NamedImports;
			if (binding.elements.some(el => el.name.text === 'AppModule')) {
				appModuleFile = ((stm as ts.ImportDeclaration).moduleSpecifier as ts.StringLiteral).text;
				break;
			}
		}
	}
	if (appModuleFile == null) {
		throw new Error('Can not found "AppModule" from ' + mainFile);
	}
	return Path.resolve(Path.dirname(mainFile), appModuleFile);
}
// tslint:disable max-classes-per-file
export default class AppModuleParser {

	file: string;
	esImportsMap: Map<string, EsImportStatement> = new Map(); // key is imported name
	dynamicModuleSet: Set<string>; // in form of  <package name>#<export name>
	// modulesToAddSet: Set<string>; // in form of  <package name>#<export name>
	modulesToAdd: Array<{moduleName: string, exportName: string}> = [];
	replacements: ReplacementInf[];
	lastEsImportEndPos: number; // The end position of last `import` statement, we're goingto insert new after it.

	fileContent: string;
	sourceFile: ts.SourceFile;

	/**
	 * 
	 * @param file file path
	 * @param fileContent file content
	 * @param removableModules array of <ES module path>#<export name>, e.g. @foo/bar/src/module#DocRoute
	 * @param modulesToAdd array of <ES module path>#<export name>, e.g. @foo/bar/src/module#DocRoute
	 */
	patchFile(file: string, fileContent: string, removableModules: string[], modulesToAdd: string[]) {
		this.fileContent = fileContent;
		this.file = file;

		this.dynamicModuleSet = new Set(removableModules);
		for (const add of new Set(modulesToAdd).values()) {
			this.modulesToAdd.push(this.moduleInfoFromStr(add));
		}
		this.replacements = [];

		this.sourceFile = ts.createSourceFile(file, fileContent, ts.ScriptTarget.ESNext,
			true, ts.ScriptKind.TSX);
		for(const stm of this.sourceFile.statements) {
			this.traverseTsAst(stm);
		}

		return replaceCode(fileContent, this.replacements);
	}

	findEsImportByName(name: string): EsImportStatement {
		const lookup = name.indexOf('.') > 0 ? name.split('.')[0].trim() : name;
		return this.esImportsMap.get(lookup);
	}

	/**
	 * 1. Remember those NgModule imports which are not removable
	 *   (neither removable nor Typescript Identifier/CallExpression)
	 * 2. Remove ES import statement which are removable
	 * 3. Add new ES import statement
	 * 4. Replace whole NgModule imports arrary with those not removables and newly added
	 * @param ngImportArrayExp
	 */
	protected checkAndPatch(ngImportArrayExp: ts.ArrayLiteralExpression) {
		const keepImportEl: Set<string> = new Set(); // 1. Remember those NgModule imports which are not removable
		for (const el of ngImportArrayExp.elements) {
			let exp: string;
			if (el.kind === sk.Identifier) {
				exp = (el as ts.Identifier).text;
			} else if (el.kind === sk.CallExpression) {
				exp = (el as ts.CallExpression).expression.getText(this.sourceFile);
			} else {
				keepImportEl.add(el.getText(this.sourceFile));
				continue;
			}
			const esImport = this.findEsImportByName(exp);
			const realName = esImport.asNameToRealName(exp);
			if (esImport.from.startsWith('@angular/')) {
				keepImportEl.add(el.getText(this.sourceFile));
				continue;
			} else if (this.dynamicModuleSet.has(esImport.from + '#' + realName)) {
				if (!esImport.isDynamic) {
					// 2. Remove ES import statement which are removable
					this.replacements.push({start: esImport.start, end: esImport.end, text: ''});
					esImport.isDynamic = true;
				}
			} else {
				keepImportEl.add(el.getText(this.sourceFile));
			}
		}
		// 3. Add new ES import statement
		this.appendNgImports();
		let i = 0;
		// 4. Replace whole NgModule imports arrary with those not removables and newly added
		const wholeNgImports = Array.from(keepImportEl.values());
		wholeNgImports.push(...this.modulesToAdd.map(m => m.exportName + '_' + i++));
		this.replacements.push({
			start: ngImportArrayExp.getStart(),
			end: ngImportArrayExp.getEnd(),
			text: '[\n    ' + wholeNgImports.join(',\n    ') + '  ]'
		});
	}

	protected traverseTsAst(ast: ts.Node, level = 0) {
		if (ast.kind === sk.ImportDeclaration) {
			const node = ast as ts.ImportDeclaration;
			const from = (node.moduleSpecifier as ts.StringLiteral).text;
			const importInfo: EsImportStatement = new EsImportStatement(
				from, node.getStart(this.sourceFile, false),node.getEnd());
			this.esImportsMap.set(from, importInfo);

			if (_.get(node, 'importClause.name')) {
				importInfo.defaultName = node.importClause.name.text;
				this.esImportsMap.set(importInfo.defaultName, importInfo);
			}
			if (_.get(node, 'importClause.namedBindings')) {
				let nb = node.importClause.namedBindings;
				if (nb.kind === sk.NamespaceImport) {
					importInfo.namespace = nb.name.text;
					this.esImportsMap.set(importInfo.namespace, importInfo);
				} else {
					importInfo.nameBinding = {};
					nb.elements.forEach(element => {
						importInfo.nameBinding[element.name.text] = element.propertyName ? element.propertyName.text : element.name.text;
						this.esImportsMap.set(element.name.text, importInfo);
					});
				}
			}
			this.lastEsImportEndPos = ast.getEnd();
			// console.log(importInfo);
			return;
		} else if (ast.kind === sk.Decorator && (ast as ts.Decorator).expression.kind === sk.CallExpression) {
			const exp = (ast as ts.Decorator).expression as ts.CallExpression;
			if ((exp.expression as ts.Identifier).text === 'NgModule') {
				const notation = exp.arguments[0] as ts.ObjectLiteralExpression;
				const ngImports = notation.properties.find(
					el => (el.name as ts.Identifier).text === 'imports');
				if (ngImports.kind !== sk.PropertyAssignment) {
					throw new Error('@NgModule\' property "imports" must be plain PropertyAssignment expression');
				}
				const importArrayExp = ((ngImports as ts.PropertyAssignment).initializer as ts.ArrayLiteralExpression);
				this.checkAndPatch(importArrayExp);
				return;
			}
		}
		ast.forEachChild((sub: ts.Node) => {
			this.traverseTsAst(sub, level + 1);
		});
	}

	protected appendNgImports() {
		let i = 0;
		let newEsImport = '\n';
		const esImportMap: Map<string, Set<string>> = new Map();
		for (const add of this.modulesToAdd) {
			// this.replacements.push({start: pos, end: pos, text: `, ${add.exportName}_${i++}`});
			let fromModule = esImportMap.get(add.moduleName);
			if (fromModule == null) {
				fromModule = new Set();
				esImportMap.set(add.moduleName, fromModule);
			}
			fromModule.add(add.exportName);
		}
		i = 0;
		for (const fromModule of esImportMap.entries()) {
			// tslint:disable max-line-length
			newEsImport += `import {${Array.from(fromModule[1].values()).map((name) => `${name} as ${name}_${i++}`).join(', ')}} from '${fromModule[0]}';\n`;
		}
		this.replacements.push({start: this.lastEsImportEndPos, end: this.lastEsImportEndPos, text: newEsImport});
	}

	protected moduleInfoFromStr(desc: string): {moduleName: string, exportName: string} {
		const idxHyph = desc.indexOf('#');
		const moduleName = desc.substring(0, idxHyph);
		const exportName = desc.substring(idxHyph + 1);
		if (!desc.startsWith('.')) {
			return {moduleName, exportName};
		}
		return {
			moduleName: Path.relative(Path.dirname(this.file), moduleName).replace(/\\/g, '/'),
			exportName
		};
	}
}
