"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.Query = exports.printFile = exports.setAstPropertyCache = exports.saveAstPropertyCache = exports.astSchemaCache = exports.typescript = void 0;
const fs = __importStar(require("fs"));
// import keysIn from 'lodash/keysIn';
const isRegExp_1 = __importDefault(require("lodash/isRegExp"));
const uniq_1 = __importDefault(require("lodash/uniq"));
const typescript_1 = __importStar(require("typescript"));
exports.typescript = typescript_1.default;
const chalk_1 = __importDefault(require("chalk"));
exports.astSchemaCache = {};
// let fileCounting = 0;
// let lastFile: string;
function saveAstPropertyCache(file) {
    fs.writeFileSync(file, JSON.stringify(exports.astSchemaCache, null, '  '));
}
exports.saveAstPropertyCache = saveAstPropertyCache;
function setAstPropertyCache(cache) {
    exports.astSchemaCache = cache;
}
exports.setAstPropertyCache = setAstPropertyCache;
function printFile(file, query, withType = true) {
    if (query) {
        const selector = new Selector(fs.readFileSync(file, 'utf8'), file);
        selector.findMapTo(query, (ast, path, parents) => {
            // eslint-disable-next-line no-console
            console.log(chalk_1.default.cyan(withType ? path.join(' > ') : path.map(el => el.slice(0, el.indexOf(':'))).join(' > ')));
            selector.traverse(ast, createPrintNodeCb(withType));
        });
    }
    else {
        if (withType)
            new Selector(fs.readFileSync(file, 'utf8'), file).printAll();
        else
            new Selector(fs.readFileSync(file, 'utf8'), file).printAllNoType();
    }
    // console.log(astSchemaCache);
}
exports.printFile = printFile;
function createPrintNodeCb(withType) {
    const printNode = (child, path, parents, isLeaf, comment) => {
        if (comment) {
            // eslint-disable-next-line no-console
            console.log((withType ? path.join(' > ') : path.map(pathExp).join('')) +
                ` ${chalk_1.default.yellow(comment)}`);
        }
        if (!isLeaf)
            return;
        // eslint-disable-next-line no-console
        console.log((withType ? path.join(' > ') : path.map(pathExp).join('')) +
            ` ${chalk_1.default.greenBright(child.getText())}`);
    };
    function pathExp(pathEl, idx, path) {
        const [exp, type] = pathEl.split(':');
        if (type === 'SourceFile') {
            return '';
        }
        else {
            return idx > 0 && path[idx - 1] === ':SourceFile' ? '^' + exp : ' > ' + exp;
        }
    }
    return printNode;
}
// type Callback = (ast: ts.Node, path: string[]) => boolean | void;
class Selector {
    constructor(src, file) {
        if (typeof src === 'string') {
            this.src = typescript_1.default.createSourceFile(file || 'unknown', src, typescript_1.default.ScriptTarget.ESNext, true, typescript_1.default.ScriptKind.TSX);
        }
        else {
            this.src = src;
        }
    }
    /**
       *
       * @param ast root AST node
       * @param query Like CSS select := ["^"] <selector element> (" " | ">") <selector element>
       *   where <selector element> := "." <property name> <index>? | ":" <Typescript Syntax kind name> | *
       *   where <index> := "[" "0"-"9" "]"
       * e.g.
       *  - .elements:ImportSpecifier > .name
       *  - .elements[2] > .name
       *  - .statements[0] :ImportSpecifier > :Identifier
     * @param cb return true to skip rest nodes
     */
    some(ast, query, cb) {
        const q = query ? new Query(query) : null;
        return !!this.traverse(ast || this.src, (ast, path, ...rest) => {
            if (q == null || q.matches(path)) {
                if (cb) {
                    return cb(ast, path, ...rest);
                }
                return true;
            }
        });
    }
    walkAst(ast, handlers) {
        if (Array.isArray(ast)) {
            handlers = ast;
            ast = this.src;
        }
        const queryMap = {};
        if (!handlers)
            return;
        handlers.forEach(h => queryMap[h.query] = new Query(h.query));
        this.traverse(ast, (ast, path, parents) => {
            const skip = false;
            handlers === null || handlers === void 0 ? void 0 : handlers.some(h => {
                if (queryMap[h.query].matches(path)) {
                    h.callback(ast, path, parents);
                    return true;
                }
                return false;
            });
            if (skip)
                return true;
        });
    }
    // eslint-disable-next-line max-len
    findMapTo(...arg) {
        let query;
        let ast;
        let callback;
        if (typeof arg[0] === 'string') {
            ast = this.src;
            query = arg[0];
            callback = arg[1];
        }
        else {
            ast = arg[0];
            query = arg[1];
            callback = arg[2];
        }
        let res = null;
        const q = new Query(query);
        this.traverse(ast, (ast, path, parents, isLeaf) => {
            if (res != null)
                return true;
            if (q.matches(path)) {
                res = callback(ast, path, parents, isLeaf);
                if (res != null)
                    return true;
            }
        });
        return res;
    }
    findAll(ast, query) {
        let q;
        if (typeof ast === 'string') {
            query = ast;
            q = new Query(ast);
            ast = this.src;
        }
        else {
            q = new Query(query);
        }
        const res = [];
        this.traverse(ast, (ast, path, _parents, _isLeaf) => {
            if (q.matches(path)) {
                res.push(ast);
            }
        });
        return res;
    }
    findFirst(ast, query) {
        let q;
        if (typeof ast === 'string') {
            query = ast;
            q = new Query(query);
            ast = this.src;
        }
        else {
            q = new Query(query);
        }
        let res;
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
    list(ast = this.src) {
        let out = '';
        this.traverse(ast, (node, path, _parents, noChild) => {
            if (noChild) {
                out += path.join('>') + ' ' + node.getText(this.src);
                out += '\n';
            }
        });
        return out;
    }
    printAll(ast = this.src) {
        this.traverse(ast, createPrintNodeCb(true));
    }
    printAllNoType(ast = this.src) {
        this.traverse(ast, createPrintNodeCb(false));
    }
    /**
       *
       * @param ast
       * @param cb return true to skip traversing child node and remaining sibling nodes
       * @param level default 0
     * @returns true - stop traverse remaining nodes
       */
    traverse(ast, cb, propName = '', parents = [], pathEls = []) {
        let needPopPathEl = false;
        // if (ast.kind !== ts.SyntaxKind.SourceFile) {
        // let propName = parents[parents.length - 1] === this.src ? '' : this._findParentPropName(ast, parents);
        let pathEl = ':' + typescript_1.SyntaxKind[ast.kind];
        if (propName)
            pathEl = '.' + propName + pathEl;
        pathEls.push(pathEl);
        // const jsdoc = ts.getJSDocTags(ast);
        // const comments = jsdoc ? jsdoc.map(t => t.comment).join() : '';
        const comments = this.src.getFullText().slice(ast.getStart(undefined, true), ast.getStart());
        needPopPathEl = true;
        // }
        const res = cb(ast, pathEls, parents, ast.getChildCount(this.src) <= 0, comments.trim());
        if (res !== 'SKIP' && res !== true) {
            parents.push(ast);
            const _value2key = new Map();
            createValue2KeyMap(ast, _value2key);
            /**
             * ts.forEachChild (or `Node.forEachChild()`) just can't list all the children like pure sytax tokens,
             * so I use Node.getChildrend() to get all child nodes.
             *
             * But ts.forEachChild is the only function which can get embedded array children node in form of NodeArray,
             * so I still need it here.
             */
            typescript_1.default.forEachChild(ast, child => {
                let propName = _value2key.get(child);
                if (propName == null) {
                    createValue2KeyMap(ast, _value2key, true);
                    propName = _value2key.get(child);
                }
                const isStop = this.traverse(child, cb, propName, parents, pathEls);
                return isStop;
                // return undefined;
            }, subArray => {
                let propName = _value2key.get(subArray);
                if (propName == null) {
                    createValue2KeyMap(ast, _value2key, true);
                    propName = _value2key.get(subArray);
                }
                return this.traverseArray(subArray, cb, propName, parents, pathEls);
            });
            parents.pop();
        }
        if (needPopPathEl)
            pathEls.pop();
        return res === true;
    }
    pathForAst(ast, withType = true) {
        const pathEls = [];
        let p = ast;
        while (p) {
            const propExp = this.propNameForAst(p);
            pathEls.push((propExp ? '.' + propExp : '') + (withType ? ':' + typescript_1.SyntaxKind[p.kind] : ''));
            if (p === this.src)
                break;
            p = p.parent;
        }
        return pathEls.reverse().join('>');
    }
    propNameForAst(ast) {
        const p = ast.parent;
        if (p == null)
            return null;
        const cachedProperties = exports.astSchemaCache[p.kind];
        let properties = cachedProperties;
        if (properties == null) {
            exports.astSchemaCache[p.kind] = properties = Object.keys(p);
        }
        for (const prop of properties) {
            const value = p[prop];
            if (['parent', 'kind', '_children', 'pos', 'end'].includes(prop))
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
            const isStop = this.traverse(ast, cb, propName + `[${i++}]`, parents, pathEls);
            if (isStop)
                return true;
        }
        return false;
    }
}
exports.default = Selector;
function createValue2KeyMap(ast, value2KeyMap, rebuild = false) {
    // const props = keysIn(ast)
    let props;
    const cached = exports.astSchemaCache[ast.kind];
    if (rebuild || cached == null) {
        props = Object.keys(ast)
            .filter(prop => typeof ast[prop] !== 'function' && !['parent', 'kind', '_children', 'pos', 'end'].includes(prop));
        if (cached == null) {
            exports.astSchemaCache[ast.kind] = props;
        }
        else {
            const schema = cached;
            schema.push(...props);
            (0, uniq_1.default)(schema);
            props = schema;
        }
    }
    else {
        props = cached;
    }
    for (const key of props) {
        value2KeyMap.set(ast[key], key);
    }
    return props;
}
class Query {
    constructor(query) {
        this.fromRoot = false;
        query = query.trim();
        if (query.startsWith('^')) {
            query = query.slice(1);
            this.fromRoot = true;
        }
        this.queryPaths = query.trim()
            .replace(/\s*>\s*/g, '>')
            .split(/\s+/)
            .map(paths => paths.split('>')
            .map(singleAstDesc => this._parseDesc(singleAstDesc)).reverse())
            .reverse();
    }
    matches(path) {
        let testPos = path.length - 1;
        const startTestPos = testPos;
        for (const consecutiveNodes of this.queryPaths.slice(0)) {
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
        return this.fromRoot ? testPos === 0 : true;
    }
    _parseDesc(singleAstDesc) {
        const astChar = {};
        // eslint-disable-next-line
        let m = /^(?:\.([a-zA-Z0-9_$]+)(?:\[([0-9]*)\])?)?(?:\:([a-zA-Z0-9_$]+))?$|^\*$/.exec(singleAstDesc);
        if (m == null) {
            throw new Error(`Invalid query string "${chalk_1.default.yellow(singleAstDesc)}"`);
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
            if ((0, isRegExp_1.default)(value)) {
                if (!value.test(target[key]))
                    return false;
            }
            else if (target[key] !== value)
                return false;
        }
        return true;
    }
    /**
     * predicte if it matches ">" connected path expression
     * @param queryNodes all items in reversed order
     * @param path
     * @param testPos starts with path.length - 1
     */
    matchesConsecutiveNodes(queryNodes, path, testPos) {
        if (queryNodes.length > testPos + 1)
            return false;
        for (const query of queryNodes.slice(0)) {
            const target = this._parseDesc(path[testPos--]);
            if (!this.matchesAst(query, target))
                return false;
        }
        return true;
    }
}
exports.Query = Query;
//# sourceMappingURL=ts-ast-query.js.map