"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts = tslib_1.__importStar(require("typescript"));
const typescript_1 = require("typescript");
const _ = tslib_1.__importStar(require("lodash"));
const patch_text_1 = tslib_1.__importDefault(require("./patch-text"));
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy9wYXJzZS1hcHAtbW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVEQUFpQztBQUNqQywyQ0FBNEM7QUFDNUMsa0RBQTRCO0FBQzVCLHNFQUF5RDtBQUN6RCxtREFBNkI7QUFDN0IsK0NBQXlCO0FBRXpCLE1BQWEsaUJBQWlCO0lBTTdCLFlBQW1CLElBQVksRUFBUyxLQUFhLEVBQVMsR0FBVztRQUF0RCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUFTLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFGekUsY0FBUyxHQUFHLEtBQUssQ0FBQztJQUUwRCxDQUFDO0lBRTdFLGdCQUFnQixDQUFDLE1BQWM7UUFDOUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLFFBQVEsR0FBRyxDQUFDLEVBQUU7WUFDakIsTUFBTSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ3ZDO1FBQ0QsSUFBSSxJQUFJLENBQUMsV0FBVyxLQUFLLE1BQU07WUFDOUIsT0FBTyxNQUFNLENBQUM7YUFDVixJQUFJLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQzdELE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUNoQzthQUFNLElBQUksTUFBTSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUU7WUFDckMsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO1NBQ3RCO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxPQUFPLE1BQU0scUNBQXFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7Q0FDRDtB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QUUsRUFBRSxDQUFDLEdBQUcsSUFBSSxPQUFPLElBQUksSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO1NBQ2pKO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBQyxDQUFDLENBQUM7SUFDM0csQ0FBQztJQUVTLGlCQUFpQixDQUFDLElBQVk7UUFDdkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUMxQixPQUFPLEVBQUMsVUFBVSxFQUFFLFVBQVUsRUFBQyxDQUFDO1NBQ2hDO1FBQ0QsT0FBTztZQUNOLFVBQVUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO1lBQ2xGLFVBQVU7U0FDVixDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBcExELGtDQW9MQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy9wYXJzZS1hcHAtbW9kdWxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge1N5bnRheEtpbmQgYXMgc2t9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4vcGF0Y2gtdGV4dCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuXG5leHBvcnQgY2xhc3MgRXNJbXBvcnRTdGF0ZW1lbnQge1xuXHRkZWZhdWx0TmFtZT86IHN0cmluZztcblx0bmFtZXNwYWNlPzogc3RyaW5nO1xuXHRuYW1lQmluZGluZz86IHtbYXM6IHN0cmluZ106IHN0cmluZ307IC8vIGtleSBpcyBcImFzXCIsIHZhbHVlIGlzIG9yaWdpbmFsIG5hbWVcblx0aXNEeW5hbWljID0gZmFsc2U7XG5cblx0Y29uc3RydWN0b3IocHVibGljIGZyb206IHN0cmluZywgcHVibGljIHN0YXJ0OiBudW1iZXIsIHB1YmxpYyBlbmQ6IG51bWJlcikge31cblxuXHRhc05hbWVUb1JlYWxOYW1lKGFzTmFtZTogc3RyaW5nKSB7XG5cdFx0Y29uc3QgaWR4T2ZEb3QgPSBhc05hbWUuaW5kZXhPZignLicpO1xuXHRcdGlmIChpZHhPZkRvdCA+IDApIHtcblx0XHRcdGFzTmFtZSA9IGFzTmFtZS5zdWJzdHJpbmcoMCwgaWR4T2ZEb3QpO1xuXHRcdH1cblx0XHRpZiAodGhpcy5kZWZhdWx0TmFtZSA9PT0gYXNOYW1lKVxuXHRcdFx0cmV0dXJuIGFzTmFtZTtcblx0XHRlbHNlIGlmICh0aGlzLm5hbWVCaW5kaW5nICYmIF8uaGFzKHRoaXMubmFtZUJpbmRpbmcsIGFzTmFtZSkpIHtcblx0XHRcdHJldHVybiB0aGlzLm5hbWVCaW5kaW5nW2FzTmFtZV07XG5cdFx0fSBlbHNlIGlmIChhc05hbWUgPT09IHRoaXMubmFtZXNwYWNlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5uYW1lc3BhY2U7XG5cdFx0fVxuXHRcdHRocm93IG5ldyBFcnJvcihgTm8gXCIke2FzTmFtZX1cIiBmb3VuZCBpbiBpbXBvcnQgc3RhdGVtZW50IGZyb20gXCIke3RoaXMuZnJvbX1cImApO1xuXHR9XG59XG5leHBvcnQgY29uc3QgZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbiA9IF8ubWVtb2l6ZShfZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbik7XG5cbmZ1bmN0aW9uIF9maW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKG1haW5GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRjb25zdCBsb29rdXBQYXRoID0gWydBcHBNb2R1bGUnLCAnQXBwU2VydmVyTW9kdWxlJ107XG5cdHdoaWxlICh0cnVlKSB7XG5cdFx0Y29uc3QgZm91bmQgPSBmaW5kRmlsZUJ5RXhwb3J0TmFtZXMobWFpbkZpbGUsIC4uLmxvb2t1cFBhdGgpO1xuXHRcdGlmIChmb3VuZCA9PSBudWxsIHx8IGZvdW5kLnNpemUgPT09IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmb3VuZCBcIkFwcE1vZHVsZVwiIG9yIFwiQXBwU2VydmVyTW9kdWxlIGZyb20gJyArIG1haW5GaWxlKTtcblx0XHR9XG5cdFx0aWYgKGZvdW5kLmhhcyhsb29rdXBQYXRoWzBdKSkge1xuXHRcdFx0bGV0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobWFpbkZpbGUpLCBmb3VuZC5nZXQobG9va3VwUGF0aFswXSkhKTtcblx0XHRcdGlmICghdGFyZ2V0LmVuZHNXaXRoKCcudHMnKSlcblx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0ICsgJy50cyc7XG5cdFx0XHRyZXR1cm4gdGFyZ2V0O1xuXHRcdH1cblx0XHRpZiAoZm91bmQuaGFzKGxvb2t1cFBhdGhbMV0pKSB7XG5cdFx0XHRtYWluRmlsZSA9IFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUobWFpbkZpbGUpLCBmb3VuZC5nZXQobG9va3VwUGF0aFsxXSkhKTtcblx0XHRcdGlmICghbWFpbkZpbGUuZW5kc1dpdGgoJy50cycpKVxuXHRcdFx0XHRtYWluRmlsZSArPSAnLnRzJztcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gZmluZEZpbGVCeUV4cG9ydE5hbWVzKGZpbGU6IHN0cmluZywgLi4uaW1wb3J0TmFtZTogc3RyaW5nW10pOiBNYXA8c3RyaW5nLCBzdHJpbmc+IHtcblx0Y29uc3Qgc3JjZmlsZSA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSwgZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG5cdFx0dHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuXHRjb25zdCByZXM6IE1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKCk7XG5cdGZvcihjb25zdCBzdG0gb2Ygc3JjZmlsZS5zdGF0ZW1lbnRzKSB7XG5cdFx0aWYgKHN0bS5raW5kID09PSBzay5JbXBvcnREZWNsYXJhdGlvbiAmJiBfLmhhcyhzdG0sICdpbXBvcnRDbGF1c2UubmFtZWRCaW5kaW5ncycpKSB7XG5cdFx0XHRjb25zdCBiaW5kaW5nID0gKHN0bSBhcyB0cy5JbXBvcnREZWNsYXJhdGlvbikuaW1wb3J0Q2xhdXNlIS5uYW1lZEJpbmRpbmdzIGFzIHRzLk5hbWVkSW1wb3J0cztcblx0XHRcdGNvbnN0IGZvdW5kID0gXy5pbnRlcnNlY3Rpb24oYmluZGluZy5lbGVtZW50cy5tYXAoZWwgPT4gZWwubmFtZS50ZXh0KSwgaW1wb3J0TmFtZSk7XG5cdFx0XHRpZiAoZm91bmQgJiYgZm91bmQubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBhcHBNb2R1bGVGaWxlID0gKChzdG0gYXMgdHMuSW1wb3J0RGVjbGFyYXRpb24pLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuXHRcdFx0XHRmb3VuZC5mb3JFYWNoKGltcG9ydE5hbWUgPT4gcmVzLnNldChpbXBvcnROYW1lLCBhcHBNb2R1bGVGaWxlKSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoc3RtLmtpbmQgPT09IHNrLkV4cG9ydERlY2xhcmF0aW9uICYmIChzdG0gYXMgdHMuRXhwb3J0RGVjbGFyYXRpb24pLmV4cG9ydENsYXVzZSkge1xuXHRcdFx0Y29uc3QgYmluZGluZyA9IChzdG0gYXMgdHMuRXhwb3J0RGVjbGFyYXRpb24pLmV4cG9ydENsYXVzZTtcblx0XHRcdGlmIChiaW5kaW5nID09IG51bGwpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBVbnN1cHBvcnRlZCBcImV4cG9ydCAqXCIgc3RhdGVtZW50OiAke3N0bS5nZXRUZXh0KHNyY2ZpbGUpfWApO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZm91bmQgPSBfLmludGVyc2VjdGlvbihiaW5kaW5nLmVsZW1lbnRzLm1hcChlbCA9PiBlbC5uYW1lLnRleHQpLCBpbXBvcnROYW1lKTtcblx0XHRcdGlmIChmb3VuZCAmJiBmb3VuZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IGFwcE1vZHVsZUZpbGUgPSAoKHN0bSBhcyB0cy5FeHBvcnREZWNsYXJhdGlvbikubW9kdWxlU3BlY2lmaWVyIGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQ7XG5cdFx0XHRcdGZvdW5kLmZvckVhY2goaW1wb3J0TmFtZSA9PiByZXMuc2V0KGltcG9ydE5hbWUsIGFwcE1vZHVsZUZpbGUpKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXM7XG59XG4vLyB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZVxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQXBwTW9kdWxlUGFyc2VyIHtcblxuXHRmaWxlOiBzdHJpbmc7XG5cdGVzSW1wb3J0c01hcDogTWFwPHN0cmluZywgRXNJbXBvcnRTdGF0ZW1lbnQ+ID0gbmV3IE1hcCgpOyAvLyBrZXkgaXMgaW1wb3J0ZWQgbmFtZVxuXHRkeW5hbWljTW9kdWxlU2V0OiBTZXQ8c3RyaW5nPjsgLy8gaW4gZm9ybSBvZiAgPHBhY2thZ2UgbmFtZT4jPGV4cG9ydCBuYW1lPlxuXHQvLyBtb2R1bGVzVG9BZGRTZXQ6IFNldDxzdHJpbmc+OyAvLyBpbiBmb3JtIG9mICA8cGFja2FnZSBuYW1lPiM8ZXhwb3J0IG5hbWU+XG5cdG1vZHVsZXNUb0FkZDogQXJyYXk8e21vZHVsZU5hbWU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nfT4gPSBbXTtcblx0cmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdO1xuXHRsYXN0RXNJbXBvcnRFbmRQb3M6IG51bWJlcjsgLy8gVGhlIGVuZCBwb3NpdGlvbiBvZiBsYXN0IGBpbXBvcnRgIHN0YXRlbWVudCwgd2UncmUgZ29pbmd0byBpbnNlcnQgbmV3IGFmdGVyIGl0LlxuXG5cdGZpbGVDb250ZW50OiBzdHJpbmc7XG5cdHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGU7XG5cblx0LyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gZmlsZSBmaWxlIHBhdGhcblx0ICogQHBhcmFtIGZpbGVDb250ZW50IGZpbGUgY29udGVudFxuXHQgKiBAcGFyYW0gcmVtb3ZhYmxlTW9kdWxlcyBhcnJheSBvZiA8RVMgbW9kdWxlIHBhdGg+IzxleHBvcnQgbmFtZT4sIGUuZy4gQGZvby9iYXIvc3JjL21vZHVsZSNEb2NSb3V0ZVxuXHQgKiBAcGFyYW0gbW9kdWxlc1RvQWRkIGFycmF5IG9mIDxFUyBtb2R1bGUgcGF0aD4jPGV4cG9ydCBuYW1lPiwgZS5nLiBAZm9vL2Jhci9zcmMvbW9kdWxlI0RvY1JvdXRlXG5cdCAqIEBwYXJhbSBpbXBvcnRBcHBDb21wb25lbnQgZS5nLiBAZm9vL2Jhci9zcmMvbW9kdWxlI0FwcENvbXBvbmVudFxuXHQgKi9cblx0cGF0Y2hGaWxlKGZpbGU6IHN0cmluZywgZmlsZUNvbnRlbnQ6IHN0cmluZywgcmVtb3ZhYmxlTW9kdWxlczogc3RyaW5nW10sIG1vZHVsZXNUb0FkZDogc3RyaW5nW10pIHtcblx0XHR0aGlzLmZpbGVDb250ZW50ID0gZmlsZUNvbnRlbnQ7XG5cdFx0dGhpcy5maWxlID0gZmlsZTtcblxuXHRcdHRoaXMuZHluYW1pY01vZHVsZVNldCA9IG5ldyBTZXQocmVtb3ZhYmxlTW9kdWxlcyk7XG5cdFx0Zm9yIChjb25zdCBhZGQgb2YgbmV3IFNldChtb2R1bGVzVG9BZGQpLnZhbHVlcygpKSB7XG5cdFx0XHR0aGlzLm1vZHVsZXNUb0FkZC5wdXNoKHRoaXMubW9kdWxlSW5mb0Zyb21TdHIoYWRkKSk7XG5cdFx0fVxuXHRcdHRoaXMucmVwbGFjZW1lbnRzID0gW107XG5cblx0XHR0aGlzLnNvdXJjZUZpbGUgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUsIGZpbGVDb250ZW50LCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuXHRcdFx0dHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuXHRcdGZvcihjb25zdCBzdG0gb2YgdGhpcy5zb3VyY2VGaWxlLnN0YXRlbWVudHMpIHtcblx0XHRcdHRoaXMudHJhdmVyc2VUc0FzdChzdG0pO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXBsYWNlQ29kZShmaWxlQ29udGVudCwgdGhpcy5yZXBsYWNlbWVudHMpO1xuXHR9XG5cblx0cHJvdGVjdGVkIGZpbmRFc0ltcG9ydEJ5TmFtZShuYW1lOiBzdHJpbmcpOiBFc0ltcG9ydFN0YXRlbWVudCB8IHVuZGVmaW5lZCB7XG5cdFx0Y29uc3QgbG9va3VwID0gbmFtZS5pbmRleE9mKCcuJykgPiAwID8gbmFtZS5zcGxpdCgnLicpWzBdLnRyaW0oKSA6IG5hbWU7XG5cdFx0cmV0dXJuIHRoaXMuZXNJbXBvcnRzTWFwLmdldChsb29rdXApO1xuXHR9XG5cblx0LyoqXG5cdCAqIDEuIFJlbWVtYmVyIHRob3NlIE5nTW9kdWxlIGltcG9ydHMgd2hpY2ggYXJlIG5vdCByZW1vdmFibGVcblx0ICogICAobmVpdGhlciByZW1vdmFibGUgbm9yIFR5cGVzY3JpcHQgSWRlbnRpZmllci9DYWxsRXhwcmVzc2lvbilcblx0ICogMi4gUmVtb3ZlIEVTIGltcG9ydCBzdGF0ZW1lbnQgd2hpY2ggYXJlIHJlbW92YWJsZVxuXHQgKiAzLiBBZGQgbmV3IEVTIGltcG9ydCBzdGF0ZW1lbnRcblx0ICogNC4gUmVwbGFjZSB3aG9sZSBOZ01vZHVsZSBpbXBvcnRzIGFycmFyeSB3aXRoIHRob3NlIG5vdCByZW1vdmFibGVzIGFuZCBuZXdseSBhZGRlZFxuXHQgKiBAcGFyYW0gbmdJbXBvcnRBcnJheUV4cFxuXHQgKi9cblx0cHJvdGVjdGVkIGNoZWNrQW5kUGF0Y2gobmdJbXBvcnRBcnJheUV4cDogdHMuQXJyYXlMaXRlcmFsRXhwcmVzc2lvbikge1xuXHRcdGNvbnN0IGtlZXBJbXBvcnRFbDogU2V0PHN0cmluZz4gPSBuZXcgU2V0KCk7IC8vIDEuIFJlbWVtYmVyIHRob3NlIE5nTW9kdWxlIGltcG9ydHMgd2hpY2ggYXJlIG5vdCByZW1vdmFibGVcblx0XHRmb3IgKGNvbnN0IGVsIG9mIG5nSW1wb3J0QXJyYXlFeHAuZWxlbWVudHMpIHtcblx0XHRcdGxldCBleHA6IHN0cmluZztcblx0XHRcdGlmIChlbC5raW5kID09PSBzay5JZGVudGlmaWVyKSB7XG5cdFx0XHRcdGV4cCA9IChlbCBhcyB0cy5JZGVudGlmaWVyKS50ZXh0O1xuXHRcdFx0fSBlbHNlIGlmIChlbC5raW5kID09PSBzay5DYWxsRXhwcmVzc2lvbikge1xuXHRcdFx0XHRleHAgPSAoZWwgYXMgdHMuQ2FsbEV4cHJlc3Npb24pLmV4cHJlc3Npb24uZ2V0VGV4dCh0aGlzLnNvdXJjZUZpbGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0a2VlcEltcG9ydEVsLmFkZChlbC5nZXRUZXh0KHRoaXMuc291cmNlRmlsZSkpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IGVzSW1wb3J0ID0gdGhpcy5maW5kRXNJbXBvcnRCeU5hbWUoZXhwKTtcblx0XHRcdGlmIChlc0ltcG9ydCA9PSBudWxsKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdGNvbnN0IHJlYWxOYW1lID0gZXNJbXBvcnQuYXNOYW1lVG9SZWFsTmFtZShleHApO1xuXHRcdFx0aWYgKGVzSW1wb3J0LmZyb20uc3RhcnRzV2l0aCgnQGFuZ3VsYXIvJykpIHtcblx0XHRcdFx0a2VlcEltcG9ydEVsLmFkZChlbC5nZXRUZXh0KHRoaXMuc291cmNlRmlsZSkpO1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH0gZWxzZSBpZiAodGhpcy5keW5hbWljTW9kdWxlU2V0Lmhhcyhlc0ltcG9ydC5mcm9tICsgJyMnICsgcmVhbE5hbWUpKSB7XG5cdFx0XHRcdGlmICghZXNJbXBvcnQuaXNEeW5hbWljKSB7XG5cdFx0XHRcdFx0Ly8gMi4gUmVtb3ZlIEVTIGltcG9ydCBzdGF0ZW1lbnQgd2hpY2ggYXJlIHJlbW92YWJsZVxuXHRcdFx0XHRcdHRoaXMucmVwbGFjZW1lbnRzLnB1c2goe3N0YXJ0OiBlc0ltcG9ydC5zdGFydCwgZW5kOiBlc0ltcG9ydC5lbmQsIHRleHQ6ICcnfSk7XG5cdFx0XHRcdFx0ZXNJbXBvcnQuaXNEeW5hbWljID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0a2VlcEltcG9ydEVsLmFkZChlbC5nZXRUZXh0KHRoaXMuc291cmNlRmlsZSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQvLyAzLiBBZGQgbmV3IEVTIGltcG9ydCBzdGF0ZW1lbnRcblx0XHR0aGlzLmFwcGVuZE5nSW1wb3J0cygpO1xuXHRcdGxldCBpID0gMDtcblx0XHQvLyA0LiBSZXBsYWNlIHdob2xlIE5nTW9kdWxlIGltcG9ydHMgYXJyYXJ5IHdpdGggdGhvc2Ugbm90IHJlbW92YWJsZXMgYW5kIG5ld2x5IGFkZGVkXG5cdFx0Y29uc3Qgd2hvbGVOZ0ltcG9ydHMgPSBBcnJheS5mcm9tKGtlZXBJbXBvcnRFbC52YWx1ZXMoKSk7XG5cdFx0Ly8gd2hvbGVOZ0ltcG9ydHMudW5zaGlmdCguLi50aGlzLm1vZHVsZXNUb0FkZC5tYXAobSA9PiBtLmV4cG9ydE5hbWUgKyAnXycgKyBpKyspKTtcblx0XHRjb25zdCBpbnNlcnRQb3MgPSB3aG9sZU5nSW1wb3J0cy5maW5kSW5kZXgodmFsdWUgPT4gL15cXHMqUm91dGVyTW9kdWxlXFxzKlxcLlxccypmb3JSb290XFwoLy50ZXN0KHZhbHVlKSk7XG5cdFx0d2hvbGVOZ0ltcG9ydHMuc3BsaWNlKGluc2VydFBvcywgMCwgLi4udGhpcy5tb2R1bGVzVG9BZGQubWFwKG0gPT4gbS5leHBvcnROYW1lICsgJ18nICsgaSsrKSk7XG5cdFx0dGhpcy5yZXBsYWNlbWVudHMucHVzaCh7XG5cdFx0XHRzdGFydDogbmdJbXBvcnRBcnJheUV4cC5nZXRTdGFydCh0aGlzLnNvdXJjZUZpbGUpLFxuXHRcdFx0ZW5kOiBuZ0ltcG9ydEFycmF5RXhwLmdldEVuZCgpLFxuXHRcdFx0dGV4dDogJ1tcXG4gICAgJyArIHdob2xlTmdJbXBvcnRzLmpvaW4oJyxcXG4gICAgJykgKyAnICBdJ1xuXHRcdH0pO1xuXHR9XG5cblx0cHJvdGVjdGVkIHRyYXZlcnNlVHNBc3QoYXN0OiB0cy5Ob2RlLCBsZXZlbCA9IDApIHtcblx0XHRpZiAoYXN0LmtpbmQgPT09IHNrLkltcG9ydERlY2xhcmF0aW9uKSB7XG5cdFx0XHRjb25zdCBub2RlID0gYXN0IGFzIHRzLkltcG9ydERlY2xhcmF0aW9uO1xuXHRcdFx0Y29uc3QgZnJvbSA9IChub2RlLm1vZHVsZVNwZWNpZmllciBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0O1xuXHRcdFx0Y29uc3QgaW1wb3J0SW5mbzogRXNJbXBvcnRTdGF0ZW1lbnQgPSBuZXcgRXNJbXBvcnRTdGF0ZW1lbnQoXG5cdFx0XHRcdGZyb20sIG5vZGUuZ2V0U3RhcnQodGhpcy5zb3VyY2VGaWxlLCBmYWxzZSksbm9kZS5nZXRFbmQoKSk7XG5cdFx0XHR0aGlzLmVzSW1wb3J0c01hcC5zZXQoZnJvbSwgaW1wb3J0SW5mbyk7XG5cblx0XHRcdGlmIChfLmdldChub2RlLCAnaW1wb3J0Q2xhdXNlLm5hbWUnKSkge1xuXHRcdFx0XHRpbXBvcnRJbmZvLmRlZmF1bHROYW1lID0gbm9kZS5pbXBvcnRDbGF1c2UhLm5hbWUhLnRleHQ7XG5cdFx0XHRcdHRoaXMuZXNJbXBvcnRzTWFwLnNldChpbXBvcnRJbmZvLmRlZmF1bHROYW1lLCBpbXBvcnRJbmZvKTtcblx0XHRcdH1cblx0XHRcdGlmIChfLmdldChub2RlLCAnaW1wb3J0Q2xhdXNlLm5hbWVkQmluZGluZ3MnKSkge1xuXHRcdFx0XHRjb25zdCBuYiA9IG5vZGUuaW1wb3J0Q2xhdXNlIS5uYW1lZEJpbmRpbmdzITtcblx0XHRcdFx0aWYgKG5iLmtpbmQgPT09IHNrLk5hbWVzcGFjZUltcG9ydCkge1xuXHRcdFx0XHRcdGltcG9ydEluZm8ubmFtZXNwYWNlID0gbmIubmFtZS50ZXh0O1xuXHRcdFx0XHRcdHRoaXMuZXNJbXBvcnRzTWFwLnNldChpbXBvcnRJbmZvLm5hbWVzcGFjZSwgaW1wb3J0SW5mbyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aW1wb3J0SW5mby5uYW1lQmluZGluZyA9IHt9O1xuXHRcdFx0XHRcdG5iLmVsZW1lbnRzLmZvckVhY2goZWxlbWVudCA9PiB7XG5cdFx0XHRcdFx0XHRpbXBvcnRJbmZvLm5hbWVCaW5kaW5nIVtlbGVtZW50Lm5hbWUudGV4dF0gPSBlbGVtZW50LnByb3BlcnR5TmFtZSA/IGVsZW1lbnQucHJvcGVydHlOYW1lLnRleHQgOiBlbGVtZW50Lm5hbWUudGV4dDtcblx0XHRcdFx0XHRcdHRoaXMuZXNJbXBvcnRzTWFwLnNldChlbGVtZW50Lm5hbWUudGV4dCwgaW1wb3J0SW5mbyk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHRoaXMubGFzdEVzSW1wb3J0RW5kUG9zID0gYXN0LmdldEVuZCgpO1xuXHRcdFx0Ly8gY29uc29sZS5sb2coaW1wb3J0SW5mbyk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fSBlbHNlIGlmIChhc3Qua2luZCA9PT0gc2suRGVjb3JhdG9yICYmIChhc3QgYXMgdHMuRGVjb3JhdG9yKS5leHByZXNzaW9uLmtpbmQgPT09IHNrLkNhbGxFeHByZXNzaW9uKSB7XG5cdFx0XHRjb25zdCBleHAgPSAoYXN0IGFzIHRzLkRlY29yYXRvcikuZXhwcmVzc2lvbiBhcyB0cy5DYWxsRXhwcmVzc2lvbjtcblx0XHRcdGlmICgoZXhwLmV4cHJlc3Npb24gYXMgdHMuSWRlbnRpZmllcikudGV4dCA9PT0gJ05nTW9kdWxlJykge1xuXHRcdFx0XHRjb25zdCBub3RhdGlvbiA9IGV4cC5hcmd1bWVudHNbMF0gYXMgdHMuT2JqZWN0TGl0ZXJhbEV4cHJlc3Npb247XG5cdFx0XHRcdGNvbnN0IG5nSW1wb3J0cyA9IG5vdGF0aW9uLnByb3BlcnRpZXMuZmluZChcblx0XHRcdFx0XHRlbCA9PiAoZWwubmFtZSBhcyB0cy5JZGVudGlmaWVyKS50ZXh0ID09PSAnaW1wb3J0cycpO1xuXHRcdFx0XHRpZiAobmdJbXBvcnRzID09IG51bGwpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBcImltcG9ydHNcIiBpbiBcIk5nTW9kdWxlXCIgJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG5nSW1wb3J0cy5raW5kICE9PSBzay5Qcm9wZXJ0eUFzc2lnbm1lbnQpIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0BOZ01vZHVsZVxcJyBwcm9wZXJ0eSBcImltcG9ydHNcIiBtdXN0IGJlIHBsYWluIFByb3BlcnR5QXNzaWdubWVudCBleHByZXNzaW9uJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgaW1wb3J0QXJyYXlFeHAgPSAoKG5nSW1wb3J0cyBhcyB0cy5Qcm9wZXJ0eUFzc2lnbm1lbnQpLmluaXRpYWxpemVyIGFzIHRzLkFycmF5TGl0ZXJhbEV4cHJlc3Npb24pO1xuXHRcdFx0XHR0aGlzLmNoZWNrQW5kUGF0Y2goaW1wb3J0QXJyYXlFeHApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGFzdC5mb3JFYWNoQ2hpbGQoKHN1YjogdHMuTm9kZSkgPT4ge1xuXHRcdFx0dGhpcy50cmF2ZXJzZVRzQXN0KHN1YiwgbGV2ZWwgKyAxKTtcblx0XHR9KTtcblx0fVxuXG5cdHByb3RlY3RlZCBhcHBlbmROZ0ltcG9ydHMoKSB7XG5cdFx0bGV0IGkgPSAwO1xuXHRcdGxldCBuZXdFc0ltcG9ydCA9ICdcXG4nO1xuXHRcdGNvbnN0IGVzSW1wb3J0TWFwOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4gPSBuZXcgTWFwKCk7XG5cdFx0Zm9yIChjb25zdCBhZGQgb2YgdGhpcy5tb2R1bGVzVG9BZGQpIHtcblx0XHRcdC8vIHRoaXMucmVwbGFjZW1lbnRzLnB1c2goe3N0YXJ0OiBwb3MsIGVuZDogcG9zLCB0ZXh0OiBgLCAke2FkZC5leHBvcnROYW1lfV8ke2krK31gfSk7XG5cdFx0XHRsZXQgZnJvbU1vZHVsZSA9IGVzSW1wb3J0TWFwLmdldChhZGQubW9kdWxlTmFtZSk7XG5cdFx0XHRpZiAoZnJvbU1vZHVsZSA9PSBudWxsKSB7XG5cdFx0XHRcdGZyb21Nb2R1bGUgPSBuZXcgU2V0KCk7XG5cdFx0XHRcdGVzSW1wb3J0TWFwLnNldChhZGQubW9kdWxlTmFtZSwgZnJvbU1vZHVsZSk7XG5cdFx0XHR9XG5cdFx0XHRmcm9tTW9kdWxlLmFkZChhZGQuZXhwb3J0TmFtZSk7XG5cdFx0fVxuXHRcdGkgPSAwO1xuXHRcdGZvciAoY29uc3QgZnJvbU1vZHVsZSBvZiBlc0ltcG9ydE1hcC5lbnRyaWVzKCkpIHtcblx0XHRcdC8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuXHRcdFx0bmV3RXNJbXBvcnQgKz0gYGltcG9ydCB7JHtBcnJheS5mcm9tKGZyb21Nb2R1bGVbMV0udmFsdWVzKCkpLm1hcCgobmFtZSkgPT4gYCR7bmFtZX0gYXMgJHtuYW1lfV8ke2krK31gKS5qb2luKCcsICcpfX0gZnJvbSAnJHtmcm9tTW9kdWxlWzBdfSc7XFxuYDtcblx0XHR9XG5cdFx0dGhpcy5yZXBsYWNlbWVudHMucHVzaCh7c3RhcnQ6IHRoaXMubGFzdEVzSW1wb3J0RW5kUG9zLCBlbmQ6IHRoaXMubGFzdEVzSW1wb3J0RW5kUG9zLCB0ZXh0OiBuZXdFc0ltcG9ydH0pO1xuXHR9XG5cblx0cHJvdGVjdGVkIG1vZHVsZUluZm9Gcm9tU3RyKGRlc2M6IHN0cmluZyk6IHttb2R1bGVOYW1lOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ30ge1xuXHRcdGNvbnN0IGlkeEh5cGggPSBkZXNjLmluZGV4T2YoJyMnKTtcblx0XHRjb25zdCBtb2R1bGVOYW1lID0gZGVzYy5zdWJzdHJpbmcoMCwgaWR4SHlwaCk7XG5cdFx0Y29uc3QgZXhwb3J0TmFtZSA9IGRlc2Muc3Vic3RyaW5nKGlkeEh5cGggKyAxKTtcblx0XHRpZiAoIWRlc2Muc3RhcnRzV2l0aCgnLicpKSB7XG5cdFx0XHRyZXR1cm4ge21vZHVsZU5hbWUsIGV4cG9ydE5hbWV9O1xuXHRcdH1cblx0XHRyZXR1cm4ge1xuXHRcdFx0bW9kdWxlTmFtZTogUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUodGhpcy5maWxlKSwgbW9kdWxlTmFtZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuXHRcdFx0ZXhwb3J0TmFtZVxuXHRcdH07XG5cdH1cbn1cbiJdfQ==
