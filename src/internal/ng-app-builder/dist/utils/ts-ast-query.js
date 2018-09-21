"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const typescript_1 = require("typescript");
const fs = require("fs");
// import * as _ from 'lodash';
const { green, red, yellow } = require('chalk');
// const log = require('log4js').getLogger('ts-ast-query');
function printFile(fileName) {
    new Selector(fs.readFileSync(fileName, 'utf8')).printAll();
}
exports.printFile = printFile;
class Selector {
    constructor(src, file) {
        if (typeof src === 'string') {
            this.src = ts.createSourceFile(file, src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        }
    }
    /**
     *
     * @param ast root AST node
     * @param query Like CSS select := <selector element> (" " | ">") <selector element>
     *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
     *   where <index> := "[" "0"-"9" "]"
     * e.g.
     *  - .elements:ImportSpecifier > .name
     *  - .elements[2] > .name
     *  - .statements[0] :ImportSpecifier > :Identifier
     */
    findAll(query, ast = this.src) {
        const q = new Query(query);
        const res = [];
        this.traverse(ast, (ast, path, parents, isLeaf) => {
            if (q.matches(path)) {
                res.push(ast);
            }
        });
        return res;
    }
    findFirst(query, ast = this.src) {
        const q = new Query(query);
        let res = null;
        this.traverse(ast, (ast, path) => {
            if (res)
                return true;
            if (q.matches(path)) {
                res = ast;
                return true;
            }
        });
        return res;
    }
    printAll() {
        this.traverse(this.src, (node, path, parents, noChild) => {
            if (noChild) {
                // tslint:disable-next-line:no-console
                console.log(path.join('>'), green(node.getText(this.src)));
                // console.log('= ' + this.pathForAst(node));
            }
        });
    }
    printAllNoType() {
        this.traverse(this.src, (node, path, parents, noChild) => {
            if (noChild) {
                // tslint:disable-next-line:no-console
                console.log(path.map(name => name.split(':')[0]).join('>'), green(node.getText(this.src)));
            }
        });
    }
    /**
     *
     * @param ast
     * @param cb return true to skip traversing child node
     * @param level default 0
     */
    traverse(ast, cb, propName = '', parents = [], pathEls = []) {
        let needPopPathEl = false;
        if (parents.length > 0) { // `> 1` to skip source file
            // let propName = parents[parents.length - 1] === this.src ? '' : this._findParentPropName(ast, parents);
            let pathEl = ':' + typescript_1.SyntaxKind[ast.kind];
            if (propName)
                pathEl = '.' + propName + pathEl;
            else
                pathEl = red(pathEl);
            pathEls.push(pathEl);
            needPopPathEl = true;
        }
        const res = cb(ast, pathEls, parents, ast.getChildCount(this.src) <= 0);
        if (res !== true) {
            parents.push(ast);
            const _value2key = new Map();
            // tslint:disable-next-line:forin
            // for (const key in ast) {
            const self = this;
            for (const key of Object.keys(ast)) {
                if (key === 'parent' || key === 'kind')
                    continue;
                _value2key.set(ast[key], key);
            }
            ts.forEachChild(ast, sub => {
                self.traverse(sub, cb, _value2key.get(sub), parents, pathEls);
            }, subArray => self.traverseArray(subArray, cb, _value2key.get(subArray), parents, pathEls));
            parents.pop();
        }
        if (needPopPathEl)
            pathEls.pop();
    }
    pathForAst(ast) {
        const pathEls = [];
        let p = ast;
        while (p && p !== this.src) {
            pathEls.push(this.propNameForAst(p) + ':' + typescript_1.SyntaxKind[p.kind]);
            p = p.parent;
        }
        return pathEls.reverse().join('>');
    }
    propNameForAst(ast) {
        const p = ast.parent;
        for (const prop of Object.keys(p)) {
            const value = p[prop];
            if (prop === 'parent' || prop === 'kind')
                continue;
            if (Array.isArray(value)) {
                const idx = value.indexOf(ast);
                if (idx >= 0) {
                    return prop + `[${idx}]`;
                }
            }
            if (value === ast) {
                return prop;
            }
        }
        return '';
    }
    traverseArray(nodes, cb, propName = '', parents = [], pathEls = []) {
        let i = 0;
        for (const ast of nodes) {
            this.traverse(ast, cb, propName + `[${i++}]`, parents, pathEls);
        }
    }
}
exports.default = Selector;
class Query {
    constructor(query) {
        this.queryPaths = query.trim().replace(/\s*>\s*/g, '>').split(' ').map(paths => paths.split('>')
            .map(singleAstDesc => this._parseDesc(singleAstDesc)));
    }
    matches(path) {
        let testPos = path.length - 1;
        const startTestPos = testPos;
        for (const consecutiveNodes of this.queryPaths.slice(0).reverse()) {
            while (true) {
                if (this.matchesConsecutiveNodes(consecutiveNodes, path, testPos)) {
                    testPos -= consecutiveNodes.length;
                    break;
                }
                else if (testPos === startTestPos) {
                    return false;
                }
                else {
                    testPos--;
                }
                if (consecutiveNodes.length > testPos + 1)
                    return false;
            }
        }
        return true;
    }
    _parseDesc(singleAstDesc) {
        const astChar = {};
        let m = /^(?:\.([a-zA-Z0-9_$]+)(?:\[([0-9]*)\])?)?(?:\:([a-zA-Z0-9_$]+))?$|^\*$/.exec(singleAstDesc);
        if (m == null) {
            throw new Error(`Invalid query string "${yellow(singleAstDesc)}"`);
        }
        if (m[1]) {
            astChar.propertyName = m[1];
            if (m[2])
                astChar.propIndex = parseInt(m[2], 10);
        }
        if (m[3])
            astChar.kind = m[3];
        return astChar;
    }
    matchesAst(query, target) {
        for (const key of Object.keys(query)) {
            const value = query[key];
            if (target[key] !== value)
                return false;
        }
        return true;
    }
    matchesConsecutiveNodes(queryNodes, path, testPos) {
        if (queryNodes.length > testPos + 1)
            return false;
        for (const query of queryNodes.slice(0).reverse()) {
            const target = this._parseDesc(path[testPos--]);
            if (!this.matchesAst(query, target))
                return false;
        }
        return true;
    }
}
exports.Query = Query;

//# sourceMappingURL=ts-ast-query.js.map
