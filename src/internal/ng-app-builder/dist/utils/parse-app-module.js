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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
// eslint-disable  max-classes-per-file
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
            // eslint-disable  max-len
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UtYXBwLW1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBhcnNlLWFwcC1tb2R1bGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUFpQztBQUNqQywyQ0FBNEM7QUFDNUMsMENBQTRCO0FBQzVCLDhEQUF5RDtBQUN6RCwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBRXpCLE1BQWEsaUJBQWlCO0lBTTVCLFlBQW1CLElBQVksRUFBUyxLQUFhLEVBQVMsR0FBVztRQUF0RCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFGekUsY0FBUyxHQUFHLEtBQUssQ0FBQztJQUUwRCxDQUFDO0lBRTdFLGdCQUFnQixDQUFDLE1BQWM7UUFDN0IsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7WUFDaEIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3hDO1FBQ0QsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLE1BQU07WUFDN0IsT0FBTyxNQUFNLENBQUM7YUFDWCxJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzVELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNqQzthQUFNLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDcEMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQ3ZCO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLE1BQU0scUNBQXFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxD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QUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1NBQ2xKO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDLENBQUM7SUFDNUcsQ0FBQztJQUVTLGlCQUFpQixDQUFDLElBQVk7UUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUN6QixPQUFPLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBQyxDQUFDO1NBQ2pDO1FBQ0QsT0FBTztZQUNMLFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO1lBQ2xGLFVBQVU7U0FDWCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBcExELGtDQW9MQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtTeW50YXhLaW5kIGFzIHNrfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuL3BhdGNoLXRleHQnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGNsYXNzIEVzSW1wb3J0U3RhdGVtZW50IHtcbiAgZGVmYXVsdE5hbWU/OiBzdHJpbmc7XG4gIG5hbWVzcGFjZT86IHN0cmluZztcbiAgbmFtZUJpbmRpbmc/OiB7W2FzOiBzdHJpbmddOiBzdHJpbmd9OyAvLyBrZXkgaXMgXCJhc1wiLCB2YWx1ZSBpcyBvcmlnaW5hbCBuYW1lXG4gIGlzRHluYW1pYyA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBmcm9tOiBzdHJpbmcsIHB1YmxpYyBzdGFydDogbnVtYmVyLCBwdWJsaWMgZW5kOiBudW1iZXIpIHt9XG5cbiAgYXNOYW1lVG9SZWFsTmFtZShhc05hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IGlkeE9mRG90ID0gYXNOYW1lLmluZGV4T2YoJy4nKTtcbiAgICBpZiAoaWR4T2ZEb3QgPiAwKSB7XG4gICAgICBhc05hbWUgPSBhc05hbWUuc3Vic3RyaW5nKDAsIGlkeE9mRG90KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZGVmYXVsdE5hbWUgPT09IGFzTmFtZSlcbiAgICAgIHJldHVybiBhc05hbWU7XG4gICAgZWxzZSBpZiAodGhpcy5uYW1lQmluZGluZyAmJiBfLmhhcyh0aGlzLm5hbWVCaW5kaW5nLCBhc05hbWUpKSB7XG4gICAgICByZXR1cm4gdGhpcy5uYW1lQmluZGluZ1thc05hbWVdO1xuICAgIH0gZWxzZSBpZiAoYXNOYW1lID09PSB0aGlzLm5hbWVzcGFjZSkge1xuICAgICAgcmV0dXJuIHRoaXMubmFtZXNwYWNlO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIFwiJHthc05hbWV9XCIgZm91bmQgaW4gaW1wb3J0IHN0YXRlbWVudCBmcm9tIFwiJHt0aGlzLmZyb219XCJgKTtcbiAgfVxufVxuZXhwb3J0IGNvbnN0IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4gPSBfLm1lbW9pemUoX2ZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4pO1xuXG5mdW5jdGlvbiBfZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbG9va3VwUGF0aCA9IFsnQXBwTW9kdWxlJywgJ0FwcFNlcnZlck1vZHVsZSddO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IGZvdW5kID0gZmluZEZpbGVCeUV4cG9ydE5hbWVzKG1haW5GaWxlLCAuLi5sb29rdXBQYXRoKTtcbiAgICBpZiAoZm91bmQgPT0gbnVsbCB8fCBmb3VuZC5zaXplID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZm91bmQgXCJBcHBNb2R1bGVcIiBvciBcIkFwcFNlcnZlck1vZHVsZSBmcm9tICcgKyBtYWluRmlsZSk7XG4gICAgfVxuICAgIGlmIChmb3VuZC5oYXMobG9va3VwUGF0aFswXSkpIHtcbiAgICAgIGxldCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKG1haW5GaWxlKSwgZm91bmQuZ2V0KGxvb2t1cFBhdGhbMF0pISk7XG4gICAgICBpZiAoIXRhcmdldC5lbmRzV2l0aCgnLnRzJykpXG4gICAgICAgIHRhcmdldCA9IHRhcmdldCArICcudHMnO1xuICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9XG4gICAgaWYgKGZvdW5kLmhhcyhsb29rdXBQYXRoWzFdKSkge1xuICAgICAgbWFpbkZpbGUgPSBQYXRoLnJlc29sdmUoUGF0aC5kaXJuYW1lKG1haW5GaWxlKSwgZm91bmQuZ2V0KGxvb2t1cFBhdGhbMV0pISk7XG4gICAgICBpZiAoIW1haW5GaWxlLmVuZHNXaXRoKCcudHMnKSlcbiAgICAgICAgbWFpbkZpbGUgKz0gJy50cyc7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRGaWxlQnlFeHBvcnROYW1lcyhmaWxlOiBzdHJpbmcsIC4uLmltcG9ydE5hbWU6IHN0cmluZ1tdKTogTWFwPHN0cmluZywgc3RyaW5nPiB7XG4gIGNvbnN0IHNyY2ZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgY29uc3QgcmVzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuICBmb3IoY29uc3Qgc3RtIG9mIHNyY2ZpbGUuc3RhdGVtZW50cykge1xuICAgIGlmIChzdG0ua2luZCA9PT0gc2suSW1wb3J0RGVjbGFyYXRpb24gJiYgXy5oYXMoc3RtLCAnaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MnKSkge1xuICAgICAgY29uc3QgYmluZGluZyA9IChzdG0gYXMgdHMuSW1wb3J0RGVjbGFyYXRpb24pLmltcG9ydENsYXVzZSEubmFtZWRCaW5kaW5ncyBhcyB0cy5OYW1lZEltcG9ydHM7XG4gICAgICBjb25zdCBmb3VuZCA9IF8uaW50ZXJzZWN0aW9uKGJpbmRpbmcuZWxlbWVudHMubWFwKGVsID0+IGVsLm5hbWUudGV4dCksIGltcG9ydE5hbWUpO1xuICAgICAgaWYgKGZvdW5kICYmIGZvdW5kLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgYXBwTW9kdWxlRmlsZSA9ICgoc3RtIGFzIHRzLkltcG9ydERlY2xhcmF0aW9uKS5tb2R1bGVTcGVjaWZpZXIgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dDtcbiAgICAgICAgZm91bmQuZm9yRWFjaChpbXBvcnROYW1lID0+IHJlcy5zZXQoaW1wb3J0TmFtZSwgYXBwTW9kdWxlRmlsZSkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0bS5raW5kID09PSBzay5FeHBvcnREZWNsYXJhdGlvbiAmJiAoc3RtIGFzIHRzLkV4cG9ydERlY2xhcmF0aW9uKS5leHBvcnRDbGF1c2UpIHtcbiAgICAgIGNvbnN0IGJpbmRpbmcgPSAoc3RtIGFzIHRzLkV4cG9ydERlY2xhcmF0aW9uKS5leHBvcnRDbGF1c2U7XG4gICAgICBpZiAoYmluZGluZyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5zdXBwb3J0ZWQgXCJleHBvcnQgKlwiIHN0YXRlbWVudDogJHtzdG0uZ2V0VGV4dChzcmNmaWxlKX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGZvdW5kID0gXy5pbnRlcnNlY3Rpb24oYmluZGluZy5lbGVtZW50cy5tYXAoZWwgPT4gZWwubmFtZS50ZXh0KSwgaW1wb3J0TmFtZSk7XG4gICAgICBpZiAoZm91bmQgJiYgZm91bmQubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBhcHBNb2R1bGVGaWxlID0gKChzdG0gYXMgdHMuRXhwb3J0RGVjbGFyYXRpb24pLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuICAgICAgICBmb3VuZC5mb3JFYWNoKGltcG9ydE5hbWUgPT4gcmVzLnNldChpbXBvcnROYW1lLCBhcHBNb2R1bGVGaWxlKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzO1xufVxuLy8gZXNsaW50LWRpc2FibGUgIG1heC1jbGFzc2VzLXBlci1maWxlXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBcHBNb2R1bGVQYXJzZXIge1xuXG4gIGZpbGU6IHN0cmluZztcbiAgZXNJbXBvcnRzTWFwOiBNYXA8c3RyaW5nLCBFc0ltcG9ydFN0YXRlbWVudD4gPSBuZXcgTWFwKCk7IC8vIGtleSBpcyBpbXBvcnRlZCBuYW1lXG4gIGR5bmFtaWNNb2R1bGVTZXQ6IFNldDxzdHJpbmc+OyAvLyBpbiBmb3JtIG9mICA8cGFja2FnZSBuYW1lPiM8ZXhwb3J0IG5hbWU+XG4gIC8vIG1vZHVsZXNUb0FkZFNldDogU2V0PHN0cmluZz47IC8vIGluIGZvcm0gb2YgIDxwYWNrYWdlIG5hbWU+IzxleHBvcnQgbmFtZT5cbiAgbW9kdWxlc1RvQWRkOiBBcnJheTx7bW9kdWxlTmFtZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmd9PiA9IFtdO1xuICByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW107XG4gIGxhc3RFc0ltcG9ydEVuZFBvczogbnVtYmVyOyAvLyBUaGUgZW5kIHBvc2l0aW9uIG9mIGxhc3QgYGltcG9ydGAgc3RhdGVtZW50LCB3ZSdyZSBnb2luZ3RvIGluc2VydCBuZXcgYWZ0ZXIgaXQuXG5cbiAgZmlsZUNvbnRlbnQ6IHN0cmluZztcbiAgc291cmNlRmlsZTogdHMuU291cmNlRmlsZTtcblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBmaWxlIGZpbGUgcGF0aFxuXHQgKiBAcGFyYW0gZmlsZUNvbnRlbnQgZmlsZSBjb250ZW50XG5cdCAqIEBwYXJhbSByZW1vdmFibGVNb2R1bGVzIGFycmF5IG9mIDxFUyBtb2R1bGUgcGF0aD4jPGV4cG9ydCBuYW1lPiwgZS5nLiBAZm9vL2Jhci9zcmMvbW9kdWxlI0RvY1JvdXRlXG5cdCAqIEBwYXJhbSBtb2R1bGVzVG9BZGQgYXJyYXkgb2YgPEVTIG1vZHVsZSBwYXRoPiM8ZXhwb3J0IG5hbWU+LCBlLmcuIEBmb28vYmFyL3NyYy9tb2R1bGUjRG9jUm91dGVcblx0ICogQHBhcmFtIGltcG9ydEFwcENvbXBvbmVudCBlLmcuIEBmb28vYmFyL3NyYy9tb2R1bGUjQXBwQ29tcG9uZW50XG5cdCAqL1xuICBwYXRjaEZpbGUoZmlsZTogc3RyaW5nLCBmaWxlQ29udGVudDogc3RyaW5nLCByZW1vdmFibGVNb2R1bGVzOiBzdHJpbmdbXSwgbW9kdWxlc1RvQWRkOiBzdHJpbmdbXSkge1xuICAgIHRoaXMuZmlsZUNvbnRlbnQgPSBmaWxlQ29udGVudDtcbiAgICB0aGlzLmZpbGUgPSBmaWxlO1xuXG4gICAgdGhpcy5keW5hbWljTW9kdWxlU2V0ID0gbmV3IFNldChyZW1vdmFibGVNb2R1bGVzKTtcbiAgICBmb3IgKGNvbnN0IGFkZCBvZiBuZXcgU2V0KG1vZHVsZXNUb0FkZCkudmFsdWVzKCkpIHtcbiAgICAgIHRoaXMubW9kdWxlc1RvQWRkLnB1c2godGhpcy5tb2R1bGVJbmZvRnJvbVN0cihhZGQpKTtcbiAgICB9XG4gICAgdGhpcy5yZXBsYWNlbWVudHMgPSBbXTtcblxuICAgIHRoaXMuc291cmNlRmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSwgZmlsZUNvbnRlbnQsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgZm9yKGNvbnN0IHN0bSBvZiB0aGlzLnNvdXJjZUZpbGUuc3RhdGVtZW50cykge1xuICAgICAgdGhpcy50cmF2ZXJzZVRzQXN0KHN0bSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcGxhY2VDb2RlKGZpbGVDb250ZW50LCB0aGlzLnJlcGxhY2VtZW50cyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZmluZEVzSW1wb3J0QnlOYW1lKG5hbWU6IHN0cmluZyk6IEVzSW1wb3J0U3RhdGVtZW50IHwgdW5kZWZpbmVkIHtcbiAgICBjb25zdCBsb29rdXAgPSBuYW1lLmluZGV4T2YoJy4nKSA+IDAgPyBuYW1lLnNwbGl0KCcuJylbMF0udHJpbSgpIDogbmFtZTtcbiAgICByZXR1cm4gdGhpcy5lc0ltcG9ydHNNYXAuZ2V0KGxvb2t1cCk7XG4gIH1cblxuICAvKipcblx0ICogMS4gUmVtZW1iZXIgdGhvc2UgTmdNb2R1bGUgaW1wb3J0cyB3aGljaCBhcmUgbm90IHJlbW92YWJsZVxuXHQgKiAgIChuZWl0aGVyIHJlbW92YWJsZSBub3IgVHlwZXNjcmlwdCBJZGVudGlmaWVyL0NhbGxFeHByZXNzaW9uKVxuXHQgKiAyLiBSZW1vdmUgRVMgaW1wb3J0IHN0YXRlbWVudCB3aGljaCBhcmUgcmVtb3ZhYmxlXG5cdCAqIDMuIEFkZCBuZXcgRVMgaW1wb3J0IHN0YXRlbWVudFxuXHQgKiA0LiBSZXBsYWNlIHdob2xlIE5nTW9kdWxlIGltcG9ydHMgYXJyYXJ5IHdpdGggdGhvc2Ugbm90IHJlbW92YWJsZXMgYW5kIG5ld2x5IGFkZGVkXG5cdCAqIEBwYXJhbSBuZ0ltcG9ydEFycmF5RXhwXG5cdCAqL1xuICBwcm90ZWN0ZWQgY2hlY2tBbmRQYXRjaChuZ0ltcG9ydEFycmF5RXhwOiB0cy5BcnJheUxpdGVyYWxFeHByZXNzaW9uKSB7XG4gICAgY29uc3Qga2VlcEltcG9ydEVsOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTsgLy8gMS4gUmVtZW1iZXIgdGhvc2UgTmdNb2R1bGUgaW1wb3J0cyB3aGljaCBhcmUgbm90IHJlbW92YWJsZVxuICAgIGZvciAoY29uc3QgZWwgb2YgbmdJbXBvcnRBcnJheUV4cC5lbGVtZW50cykge1xuICAgICAgbGV0IGV4cDogc3RyaW5nO1xuICAgICAgaWYgKGVsLmtpbmQgPT09IHNrLklkZW50aWZpZXIpIHtcbiAgICAgICAgZXhwID0gKGVsIGFzIHRzLklkZW50aWZpZXIpLnRleHQ7XG4gICAgICB9IGVsc2UgaWYgKGVsLmtpbmQgPT09IHNrLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgIGV4cCA9IChlbCBhcyB0cy5DYWxsRXhwcmVzc2lvbikuZXhwcmVzc2lvbi5nZXRUZXh0KHRoaXMuc291cmNlRmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZWVwSW1wb3J0RWwuYWRkKGVsLmdldFRleHQodGhpcy5zb3VyY2VGaWxlKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZXNJbXBvcnQgPSB0aGlzLmZpbmRFc0ltcG9ydEJ5TmFtZShleHApO1xuICAgICAgaWYgKGVzSW1wb3J0ID09IG51bGwpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcmVhbE5hbWUgPSBlc0ltcG9ydC5hc05hbWVUb1JlYWxOYW1lKGV4cCk7XG4gICAgICBpZiAoZXNJbXBvcnQuZnJvbS5zdGFydHNXaXRoKCdAYW5ndWxhci8nKSkge1xuICAgICAgICBrZWVwSW1wb3J0RWwuYWRkKGVsLmdldFRleHQodGhpcy5zb3VyY2VGaWxlKSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmR5bmFtaWNNb2R1bGVTZXQuaGFzKGVzSW1wb3J0LmZyb20gKyAnIycgKyByZWFsTmFtZSkpIHtcbiAgICAgICAgaWYgKCFlc0ltcG9ydC5pc0R5bmFtaWMpIHtcbiAgICAgICAgICAvLyAyLiBSZW1vdmUgRVMgaW1wb3J0IHN0YXRlbWVudCB3aGljaCBhcmUgcmVtb3ZhYmxlXG4gICAgICAgICAgdGhpcy5yZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IGVzSW1wb3J0LnN0YXJ0LCBlbmQ6IGVzSW1wb3J0LmVuZCwgdGV4dDogJyd9KTtcbiAgICAgICAgICBlc0ltcG9ydC5pc0R5bmFtaWMgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBrZWVwSW1wb3J0RWwuYWRkKGVsLmdldFRleHQodGhpcy5zb3VyY2VGaWxlKSk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIDMuIEFkZCBuZXcgRVMgaW1wb3J0IHN0YXRlbWVudFxuICAgIHRoaXMuYXBwZW5kTmdJbXBvcnRzKCk7XG4gICAgbGV0IGkgPSAwO1xuICAgIC8vIDQuIFJlcGxhY2Ugd2hvbGUgTmdNb2R1bGUgaW1wb3J0cyBhcnJhcnkgd2l0aCB0aG9zZSBub3QgcmVtb3ZhYmxlcyBhbmQgbmV3bHkgYWRkZWRcbiAgICBjb25zdCB3aG9sZU5nSW1wb3J0cyA9IEFycmF5LmZyb20oa2VlcEltcG9ydEVsLnZhbHVlcygpKTtcbiAgICAvLyB3aG9sZU5nSW1wb3J0cy51bnNoaWZ0KC4uLnRoaXMubW9kdWxlc1RvQWRkLm1hcChtID0+IG0uZXhwb3J0TmFtZSArICdfJyArIGkrKykpO1xuICAgIGNvbnN0IGluc2VydFBvcyA9IHdob2xlTmdJbXBvcnRzLmZpbmRJbmRleCh2YWx1ZSA9PiAvXlxccypSb3V0ZXJNb2R1bGVcXHMqXFwuXFxzKmZvclJvb3RcXCgvLnRlc3QodmFsdWUpKTtcbiAgICB3aG9sZU5nSW1wb3J0cy5zcGxpY2UoaW5zZXJ0UG9zLCAwLCAuLi50aGlzLm1vZHVsZXNUb0FkZC5tYXAobSA9PiBtLmV4cG9ydE5hbWUgKyAnXycgKyBpKyspKTtcbiAgICB0aGlzLnJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHN0YXJ0OiBuZ0ltcG9ydEFycmF5RXhwLmdldFN0YXJ0KHRoaXMuc291cmNlRmlsZSksXG4gICAgICBlbmQ6IG5nSW1wb3J0QXJyYXlFeHAuZ2V0RW5kKCksXG4gICAgICB0ZXh0OiAnW1xcbiAgICAnICsgd2hvbGVOZ0ltcG9ydHMuam9pbignLFxcbiAgICAnKSArICcgIF0nXG4gICAgfSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VUc0FzdChhc3Q6IHRzLk5vZGUsIGxldmVsID0gMCkge1xuICAgIGlmIChhc3Qua2luZCA9PT0gc2suSW1wb3J0RGVjbGFyYXRpb24pIHtcbiAgICAgIGNvbnN0IG5vZGUgPSBhc3QgYXMgdHMuSW1wb3J0RGVjbGFyYXRpb247XG4gICAgICBjb25zdCBmcm9tID0gKG5vZGUubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG4gICAgICBjb25zdCBpbXBvcnRJbmZvOiBFc0ltcG9ydFN0YXRlbWVudCA9IG5ldyBFc0ltcG9ydFN0YXRlbWVudChcbiAgICAgICAgZnJvbSwgbm9kZS5nZXRTdGFydCh0aGlzLnNvdXJjZUZpbGUsIGZhbHNlKSxub2RlLmdldEVuZCgpKTtcbiAgICAgIHRoaXMuZXNJbXBvcnRzTWFwLnNldChmcm9tLCBpbXBvcnRJbmZvKTtcblxuICAgICAgaWYgKF8uZ2V0KG5vZGUsICdpbXBvcnRDbGF1c2UubmFtZScpKSB7XG4gICAgICAgIGltcG9ydEluZm8uZGVmYXVsdE5hbWUgPSBub2RlLmltcG9ydENsYXVzZSEubmFtZSEudGV4dDtcbiAgICAgICAgdGhpcy5lc0ltcG9ydHNNYXAuc2V0KGltcG9ydEluZm8uZGVmYXVsdE5hbWUsIGltcG9ydEluZm8pO1xuICAgICAgfVxuICAgICAgaWYgKF8uZ2V0KG5vZGUsICdpbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncycpKSB7XG4gICAgICAgIGNvbnN0IG5iID0gbm9kZS5pbXBvcnRDbGF1c2UhLm5hbWVkQmluZGluZ3MhO1xuICAgICAgICBpZiAobmIua2luZCA9PT0gc2suTmFtZXNwYWNlSW1wb3J0KSB7XG4gICAgICAgICAgaW1wb3J0SW5mby5uYW1lc3BhY2UgPSBuYi5uYW1lLnRleHQ7XG4gICAgICAgICAgdGhpcy5lc0ltcG9ydHNNYXAuc2V0KGltcG9ydEluZm8ubmFtZXNwYWNlLCBpbXBvcnRJbmZvKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpbXBvcnRJbmZvLm5hbWVCaW5kaW5nID0ge307XG4gICAgICAgICAgbmIuZWxlbWVudHMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICAgICAgICAgIGltcG9ydEluZm8ubmFtZUJpbmRpbmchW2VsZW1lbnQubmFtZS50ZXh0XSA9IGVsZW1lbnQucHJvcGVydHlOYW1lID8gZWxlbWVudC5wcm9wZXJ0eU5hbWUudGV4dCA6IGVsZW1lbnQubmFtZS50ZXh0O1xuICAgICAgICAgICAgdGhpcy5lc0ltcG9ydHNNYXAuc2V0KGVsZW1lbnQubmFtZS50ZXh0LCBpbXBvcnRJbmZvKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdGhpcy5sYXN0RXNJbXBvcnRFbmRQb3MgPSBhc3QuZ2V0RW5kKCk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhpbXBvcnRJbmZvKTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKGFzdC5raW5kID09PSBzay5EZWNvcmF0b3IgJiYgKGFzdCBhcyB0cy5EZWNvcmF0b3IpLmV4cHJlc3Npb24ua2luZCA9PT0gc2suQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgIGNvbnN0IGV4cCA9IChhc3QgYXMgdHMuRGVjb3JhdG9yKS5leHByZXNzaW9uIGFzIHRzLkNhbGxFeHByZXNzaW9uO1xuICAgICAgaWYgKChleHAuZXhwcmVzc2lvbiBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAnTmdNb2R1bGUnKSB7XG4gICAgICAgIGNvbnN0IG5vdGF0aW9uID0gZXhwLmFyZ3VtZW50c1swXSBhcyB0cy5PYmplY3RMaXRlcmFsRXhwcmVzc2lvbjtcbiAgICAgICAgY29uc3QgbmdJbXBvcnRzID0gbm90YXRpb24ucHJvcGVydGllcy5maW5kKFxuICAgICAgICAgIGVsID0+IChlbC5uYW1lIGFzIHRzLklkZW50aWZpZXIpLnRleHQgPT09ICdpbXBvcnRzJyk7XG4gICAgICAgIGlmIChuZ0ltcG9ydHMgPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmaW5kIFwiaW1wb3J0c1wiIGluIFwiTmdNb2R1bGVcIiAnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobmdJbXBvcnRzLmtpbmQgIT09IHNrLlByb3BlcnR5QXNzaWdubWVudCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQE5nTW9kdWxlXFwnIHByb3BlcnR5IFwiaW1wb3J0c1wiIG11c3QgYmUgcGxhaW4gUHJvcGVydHlBc3NpZ25tZW50IGV4cHJlc3Npb24nKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpbXBvcnRBcnJheUV4cCA9ICgobmdJbXBvcnRzIGFzIHRzLlByb3BlcnR5QXNzaWdubWVudCkuaW5pdGlhbGl6ZXIgYXMgdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbik7XG4gICAgICAgIHRoaXMuY2hlY2tBbmRQYXRjaChpbXBvcnRBcnJheUV4cCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgYXN0LmZvckVhY2hDaGlsZCgoc3ViOiB0cy5Ob2RlKSA9PiB7XG4gICAgICB0aGlzLnRyYXZlcnNlVHNBc3Qoc3ViLCBsZXZlbCArIDEpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFwcGVuZE5nSW1wb3J0cygpIHtcbiAgICBsZXQgaSA9IDA7XG4gICAgbGV0IG5ld0VzSW1wb3J0ID0gJ1xcbic7XG4gICAgY29uc3QgZXNJbXBvcnRNYXA6IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PiA9IG5ldyBNYXAoKTtcbiAgICBmb3IgKGNvbnN0IGFkZCBvZiB0aGlzLm1vZHVsZXNUb0FkZCkge1xuICAgICAgLy8gdGhpcy5yZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IHBvcywgZW5kOiBwb3MsIHRleHQ6IGAsICR7YWRkLmV4cG9ydE5hbWV9XyR7aSsrfWB9KTtcbiAgICAgIGxldCBmcm9tTW9kdWxlID0gZXNJbXBvcnRNYXAuZ2V0KGFkZC5tb2R1bGVOYW1lKTtcbiAgICAgIGlmIChmcm9tTW9kdWxlID09IG51bGwpIHtcbiAgICAgICAgZnJvbU1vZHVsZSA9IG5ldyBTZXQoKTtcbiAgICAgICAgZXNJbXBvcnRNYXAuc2V0KGFkZC5tb2R1bGVOYW1lLCBmcm9tTW9kdWxlKTtcbiAgICAgIH1cbiAgICAgIGZyb21Nb2R1bGUuYWRkKGFkZC5leHBvcnROYW1lKTtcbiAgICB9XG4gICAgaSA9IDA7XG4gICAgZm9yIChjb25zdCBmcm9tTW9kdWxlIG9mIGVzSW1wb3J0TWFwLmVudHJpZXMoKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUgIG1heC1sZW5cbiAgICAgIG5ld0VzSW1wb3J0ICs9IGBpbXBvcnQgeyR7QXJyYXkuZnJvbShmcm9tTW9kdWxlWzFdLnZhbHVlcygpKS5tYXAoKG5hbWUpID0+IGAke25hbWV9IGFzICR7bmFtZX1fJHtpKyt9YCkuam9pbignLCAnKX19IGZyb20gJyR7ZnJvbU1vZHVsZVswXX0nO1xcbmA7XG4gICAgfVxuICAgIHRoaXMucmVwbGFjZW1lbnRzLnB1c2goe3N0YXJ0OiB0aGlzLmxhc3RFc0ltcG9ydEVuZFBvcywgZW5kOiB0aGlzLmxhc3RFc0ltcG9ydEVuZFBvcywgdGV4dDogbmV3RXNJbXBvcnR9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBtb2R1bGVJbmZvRnJvbVN0cihkZXNjOiBzdHJpbmcpOiB7bW9kdWxlTmFtZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmd9IHtcbiAgICBjb25zdCBpZHhIeXBoID0gZGVzYy5pbmRleE9mKCcjJyk7XG4gICAgY29uc3QgbW9kdWxlTmFtZSA9IGRlc2Muc3Vic3RyaW5nKDAsIGlkeEh5cGgpO1xuICAgIGNvbnN0IGV4cG9ydE5hbWUgPSBkZXNjLnN1YnN0cmluZyhpZHhIeXBoICsgMSk7XG4gICAgaWYgKCFkZXNjLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgcmV0dXJuIHttb2R1bGVOYW1lLCBleHBvcnROYW1lfTtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIG1vZHVsZU5hbWU6IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKHRoaXMuZmlsZSksIG1vZHVsZU5hbWUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIGV4cG9ydE5hbWVcbiAgICB9O1xuICB9XG59XG4iXX0=