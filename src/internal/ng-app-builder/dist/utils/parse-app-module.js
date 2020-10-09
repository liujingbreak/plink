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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAppModuleFileFromMain = exports.EsImportStatement = void 0;
const ts = __importStar(require("typescript"));
const typescript_1 = require("typescript");
const _ = __importStar(require("lodash"));
const patch_text_1 = __importDefault(require("./patch-text"));
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
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
        const found = findFileByExportNames(mainFile, ...lookupPath);
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
            if (binding == null) {
                throw new Error(`Unsupported "export *" statement: ${stm.getText(srcfile)}`);
            }
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
            if (esImport == null)
                continue;
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
        // wholeNgImports.unshift(...this.modulesToAdd.map(m => m.exportName + '_' + i++));
        const insertPos = wholeNgImports.findIndex(value => /^\s*RouterModule\s*\.\s*forRoot\(/.test(value));
        wholeNgImports.splice(insertPos, 0, ...this.modulesToAdd.map(m => m.exportName + '_' + i++));
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
                const nb = node.importClause.namedBindings;
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
                if (ngImports == null) {
                    throw new Error('Can not find "imports" in "NgModule" ');
                }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy91dGlscy9wYXJzZS1hcHAtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQ0FBaUM7QUFDakMsMkNBQTRDO0FBQzVDLDBDQUE0QjtBQUM1Qiw4REFBeUQ7QUFDekQsMkNBQTZCO0FBQzdCLHVDQUF5QjtBQUV6QixNQUFhLGlCQUFpQjtJQU01QixZQUFtQixJQUFZLEVBQVMsS0FBYSxFQUFTLEdBQVc7UUFBdEQsU0FBSSxHQUFKLElBQUksQ0FBUTtRQUFTLFVBQUssR0FBTCxLQUFLLENBQVE7UUFBUyxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBRnpFLGNBQVMsR0FBRyxLQUFLLENBQUM7SUFFMEQsQ0FBQztJQUU3RSxnQkFBZ0IsQ0FBQyxNQUFjO1FBQzdCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFO1lBQ2hCLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztTQUN4QztRQUNELElBQUksSUFBSSxDQUFDLFdBQVcsS0FBSyxNQUFNO1lBQzdCLE9BQU8sTUFBTSxDQUFDO2FBQ1gsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsRUFBRTtZQUM1RCxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDakM7YUFBTSxJQUFJLE1BQU0sS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3BDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztTQUN2QjtRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxNQUFNLHFDQUFxQyxJQUFJ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
