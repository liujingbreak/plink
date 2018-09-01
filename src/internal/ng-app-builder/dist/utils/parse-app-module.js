"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const typescript_1 = require("typescript");
const _ = require("lodash");
const patch_text_1 = require("./patch-text");
const Path = require("path");
const fs = require("fs");
class EsImportStatement {
    constructor(from, start, end) {
        this.from = from;
        this.start = start;
        this.end = end;
        this.isDynamic = false;
    }
    asNameToRealName(asName) {
        const idxOfDot = asName.indexOf('.');
        if (idxOfDot > 0) {
            asName = asName.substring(0, idxOfDot);
        }
        if (this.defaultName === asName)
            return asName;
        else if (this.nameBinding && _.has(this.nameBinding, asName)) {
            return this.nameBinding[asName];
        }
        else if (asName === this.namespace) {
            return this.namespace;
        }
        throw new Error(`No "${asName}" found in import statement from "${this.from}"`);
    }
}
exports.EsImportStatement = EsImportStatement;
exports.findAppModuleFileFromMain = _.memoize(_findAppModuleFileFromMain);
function _findAppModuleFileFromMain(mainFile) {
    const lookupPath = ['AppModule', 'AppServerModule'];
    while (true) {
        let found = findFileByExportNames(mainFile, ...lookupPath);
        if (found == null || found.size === 0) {
            throw new Error('Can not found "AppModule" or "AppServerModule from ' + mainFile);
        }
        if (found.has(lookupPath[0])) {
            let target = Path.resolve(Path.dirname(mainFile), found.get(lookupPath[0]));
            if (!target.endsWith('.ts'))
                target = target + '.ts';
            return target;
        }
        if (found.has(lookupPath[1])) {
            mainFile = Path.resolve(Path.dirname(mainFile), found.get(lookupPath[1]));
            if (!mainFile.endsWith('.ts'))
                mainFile += '.ts';
        }
    }
}
function findFileByExportNames(file, ...importName) {
    const srcfile = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
    const res = new Map();
    for (const stm of srcfile.statements) {
        if (stm.kind === typescript_1.SyntaxKind.ImportDeclaration && _.has(stm, 'importClause.namedBindings')) {
            const binding = stm.importClause.namedBindings;
            const found = _.intersection(binding.elements.map(el => el.name.text), importName);
            if (found && found.length > 0) {
                const appModuleFile = stm.moduleSpecifier.text;
                found.forEach(importName => res.set(importName, appModuleFile));
                break;
            }
        }
        else if (stm.kind === typescript_1.SyntaxKind.ExportDeclaration && stm.exportClause) {
            const binding = stm.exportClause;
            const found = _.intersection(binding.elements.map(el => el.name.text), importName);
            if (found && found.length > 0) {
                const appModuleFile = stm.moduleSpecifier.text;
                found.forEach(importName => res.set(importName, appModuleFile));
                break;
            }
        }
    }
    return res;
}
// tslint:disable max-classes-per-file
class AppModuleParser {
    constructor() {
        this.esImportsMap = new Map(); // key is imported name
        // modulesToAddSet: Set<string>; // in form of  <package name>#<export name>
        this.modulesToAdd = [];
    }
    /**
     *
     * @param file file path
     * @param fileContent file content
     * @param removableModules array of <ES module path>#<export name>, e.g. @foo/bar/src/module#DocRoute
     * @param modulesToAdd array of <ES module path>#<export name>, e.g. @foo/bar/src/module#DocRoute
     * @param importAppComponent e.g. @foo/bar/src/module#AppComponent
     */
    patchFile(file, fileContent, removableModules, modulesToAdd) {
        this.fileContent = fileContent;
        this.file = file;
        this.dynamicModuleSet = new Set(removableModules);
        for (const add of new Set(modulesToAdd).values()) {
            this.modulesToAdd.push(this.moduleInfoFromStr(add));
        }
        this.replacements = [];
        this.sourceFile = ts.createSourceFile(file, fileContent, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        for (const stm of this.sourceFile.statements) {
            this.traverseTsAst(stm);
        }
        return patch_text_1.default(fileContent, this.replacements);
    }
    findEsImportByName(name) {
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
    checkAndPatch(ngImportArrayExp) {
        const keepImportEl = new Set(); // 1. Remember those NgModule imports which are not removable
        for (const el of ngImportArrayExp.elements) {
            let exp;
            if (el.kind === typescript_1.SyntaxKind.Identifier) {
                exp = el.text;
            }
            else if (el.kind === typescript_1.SyntaxKind.CallExpression) {
                exp = el.expression.getText(this.sourceFile);
            }
            else {
                keepImportEl.add(el.getText(this.sourceFile));
                continue;
            }
            const esImport = this.findEsImportByName(exp);
            const realName = esImport.asNameToRealName(exp);
            if (esImport.from.startsWith('@angular/')) {
                keepImportEl.add(el.getText(this.sourceFile));
                continue;
            }
            else if (this.dynamicModuleSet.has(esImport.from + '#' + realName)) {
                if (!esImport.isDynamic) {
                    // 2. Remove ES import statement which are removable
                    this.replacements.push({ start: esImport.start, end: esImport.end, text: '' });
                    esImport.isDynamic = true;
                }
            }
            else {
                keepImportEl.add(el.getText(this.sourceFile));
            }
        }
        // 3. Add new ES import statement
        this.appendNgImports();
        let i = 0;
        // 4. Replace whole NgModule imports arrary with those not removables and newly added
        const wholeNgImports = Array.from(keepImportEl.values());
        wholeNgImports.unshift(...this.modulesToAdd.map(m => m.exportName + '_' + i++));
        this.replacements.push({
            start: ngImportArrayExp.getStart(this.sourceFile),
            end: ngImportArrayExp.getEnd(),
            text: '[\n    ' + wholeNgImports.join(',\n    ') + '  ]'
        });
    }
    traverseTsAst(ast, level = 0) {
        if (ast.kind === typescript_1.SyntaxKind.ImportDeclaration) {
            const node = ast;
            const from = node.moduleSpecifier.text;
            const importInfo = new EsImportStatement(from, node.getStart(this.sourceFile, false), node.getEnd());
            this.esImportsMap.set(from, importInfo);
            if (_.get(node, 'importClause.name')) {
                importInfo.defaultName = node.importClause.name.text;
                this.esImportsMap.set(importInfo.defaultName, importInfo);
            }
            if (_.get(node, 'importClause.namedBindings')) {
                let nb = node.importClause.namedBindings;
                if (nb.kind === typescript_1.SyntaxKind.NamespaceImport) {
                    importInfo.namespace = nb.name.text;
                    this.esImportsMap.set(importInfo.namespace, importInfo);
                }
                else {
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
        }
        else if (ast.kind === typescript_1.SyntaxKind.Decorator && ast.expression.kind === typescript_1.SyntaxKind.CallExpression) {
            const exp = ast.expression;
            if (exp.expression.text === 'NgModule') {
                const notation = exp.arguments[0];
                const ngImports = notation.properties.find(el => el.name.text === 'imports');
                if (ngImports.kind !== typescript_1.SyntaxKind.PropertyAssignment) {
                    throw new Error('@NgModule\' property "imports" must be plain PropertyAssignment expression');
                }
                const importArrayExp = ngImports.initializer;
                this.checkAndPatch(importArrayExp);
                return;
            }
        }
        ast.forEachChild((sub) => {
            this.traverseTsAst(sub, level + 1);
        });
    }
    appendNgImports() {
        let i = 0;
        let newEsImport = '\n';
        const esImportMap = new Map();
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
        this.replacements.push({ start: this.lastEsImportEndPos, end: this.lastEsImportEndPos, text: newEsImport });
    }
    moduleInfoFromStr(desc) {
        const idxHyph = desc.indexOf('#');
        const moduleName = desc.substring(0, idxHyph);
        const exportName = desc.substring(idxHyph + 1);
        if (!desc.startsWith('.')) {
            return { moduleName, exportName };
        }
        return {
            moduleName: Path.relative(Path.dirname(this.file), moduleName).replace(/\\/g, '/'),
            exportName
        };
    }
}
exports.default = AppModuleParser;

//# sourceMappingURL=parse-app-module.js.map
