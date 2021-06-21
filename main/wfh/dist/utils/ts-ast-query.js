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
            uniq_1.default(schema);
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
            if (isRegExp_1.default(value)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvdHMtYXN0LXF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsc0NBQXNDO0FBQ3RDLCtEQUF1QztBQUN2Qyx1REFBK0I7QUFFL0IseURBQWlEO0FBRW5DLHFCQUZQLG9CQUFFLENBRWU7QUFEeEIsa0RBQTBCO0FBR2YsUUFBQSxjQUFjLEdBQStCLEVBQUUsQ0FBQztBQUMzRCx3QkFBd0I7QUFDeEIsd0JBQXdCO0FBRXhCLFNBQWdCLG9CQUFvQixDQUFDLElBQVk7SUFDL0MsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFGRCxvREFFQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLEtBQTRCO0lBQzlELHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3pCLENBQUM7QUFGRCxrREFFQztBQVVELFNBQWdCLFNBQVMsQ0FBQyxJQUFZLEVBQUUsS0FBcUIsRUFBRSxRQUFRLEdBQUcsSUFBSTtJQUM1RSxJQUFJLEtBQUssRUFBRTtRQUNULE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25FLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUMvQyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUNwQixRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxD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SSxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssS0FBSztnQkFDOUIsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLHVCQUF1QixDQUFDLFVBQTBCLEVBQUUsSUFBYyxFQUFFLE9BQWU7UUFDekYsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDO1lBQ2pDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxNQUFNLEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDO2dCQUNqQyxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBbkZELHNCQW1GQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCBrZXlzSW4gZnJvbSAnbG9kYXNoL2tleXNJbic7XG5pbXBvcnQgaXNSZWdFeHAgZnJvbSAnbG9kYXNoL2lzUmVnRXhwJztcbmltcG9ydCB1bmlxIGZyb20gJ2xvZGFzaC91bmlxJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdHMsIHsgU3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuZXhwb3J0IHt0cyBhcyB0eXBlc2NyaXB0fTtcblxuZXhwb3J0IGxldCBhc3RTY2hlbWFDYWNoZToge1traW5kOiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcbi8vIGxldCBmaWxlQ291bnRpbmcgPSAwO1xuLy8gbGV0IGxhc3RGaWxlOiBzdHJpbmc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlQXN0UHJvcGVydHlDYWNoZShmaWxlOiBzdHJpbmcpOiB2b2lkIHtcbiAgZnMud3JpdGVGaWxlU3luYyhmaWxlLCBKU09OLnN0cmluZ2lmeShhc3RTY2hlbWFDYWNoZSwgbnVsbCwgJyAgJykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0QXN0UHJvcGVydHlDYWNoZShjYWNoZTogdHlwZW9mIGFzdFNjaGVtYUNhY2hlKTogdm9pZCB7XG4gIGFzdFNjaGVtYUNhY2hlID0gY2FjaGU7XG59XG5cbmV4cG9ydCB0eXBlIEFzdEhhbmRsZXI8VD4gPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4pID0+IFQ7XG5cbi8qKlxuICogQHJldHVybnMgdHJ1ZSAtIG1ha2UgaXRlcmF0aW9uIHN0b3BzLCBgU0tJUGAgLSB0byBza2lwIGludGVyYXRpbmcgY2hpbGQgbm9kZXMgKG1vdmUgb24gdG8gbmV4dCBzaWJsaW5nIG5vZGUpIFxuICovXG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuZXhwb3J0IHR5cGUgdHJhdmVyc2VDYlR5cGUgPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4sIGNvbW1lbnQ/OiBzdHJpbmcpID0+ICdTS0lQJyB8IGJvb2xlYW4gfCB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRGaWxlKGZpbGU6IHN0cmluZywgcXVlcnk/OiBzdHJpbmcgfCBudWxsLCB3aXRoVHlwZSA9IHRydWUpOiB2b2lkIHtcbiAgaWYgKHF1ZXJ5KSB7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIHNlbGVjdG9yLmZpbmRNYXBUbyhxdWVyeSwgKGFzdCwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLmN5YW4oXG4gICAgICAgIHdpdGhUeXBlID8gcGF0aC5qb2luKCcgPiAnKSA6IHBhdGgubWFwKGVsID0+IGVsLnNsaWNlKDAsIGVsLmluZGV4T2YoJzonKSkpLmpvaW4oJyA+ICcpXG4gICAgICApKTtcbiAgICAgIHNlbGVjdG9yLnRyYXZlcnNlKGFzdCwgY3JlYXRlUHJpbnROb2RlQ2Iod2l0aFR5cGUpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpZiAod2l0aFR5cGUpXG4gICAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsKCk7XG4gICAgZWxzZVxuICAgICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbE5vVHlwZSgpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKGFzdFNjaGVtYUNhY2hlKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZVByaW50Tm9kZUNiKHdpdGhUeXBlOiBib29sZWFuKSB7XG4gIGNvbnN0IHByaW50Tm9kZTogdHJhdmVyc2VDYlR5cGUgPSAoY2hpbGQsIHBhdGgsIHBhcmVudHMsIGlzTGVhZiwgY29tbWVudCkgPT4ge1xuICAgIGlmIChjb21tZW50KSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICh3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChwYXRoRXhwKS5qb2luKCcnKSkgK1xuICAgICAgICAgIGAgJHtjaGFsay55ZWxsb3coY29tbWVudCl9YFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKCFpc0xlYWYpXG4gICAgICByZXR1cm47XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICh3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChwYXRoRXhwKS5qb2luKCcnKSkgK1xuICAgICAgICBgICR7Y2hhbGsuZ3JlZW5CcmlnaHQoY2hpbGQuZ2V0VGV4dCgpKX1gXG4gICAgKTtcbiAgfTtcblxuICBmdW5jdGlvbiBwYXRoRXhwKHBhdGhFbDogc3RyaW5nLCBpZHg6IG51bWJlciwgcGF0aDogc3RyaW5nW10pOiBzdHJpbmcge1xuICAgIGNvbnN0IFtleHAsIHR5cGVdID0gcGF0aEVsLnNwbGl0KCc6Jyk7XG4gICAgaWYgKHR5cGUgPT09ICdTb3VyY2VGaWxlJykge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaWR4ID4gMCAmJiBwYXRoW2lkeCAtIDFdID09PSAnOlNvdXJjZUZpbGUnID8gJ14nICsgZXhwIDogJyA+ICcgKyBleHA7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcmludE5vZGU7XG59XG5cblxuZXhwb3J0IGludGVyZmFjZSBXYWxrQ2FsbGJhY2sge1xuICBxdWVyeTogc3RyaW5nO1xuICBjYWxsYmFjazogKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM/OiB0cy5Ob2RlW10pID0+IHRydWUgfCB2b2lkO1xufVxuLy8gdHlwZSBDYWxsYmFjayA9IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdKSA9PiBib29sZWFuIHwgdm9pZDtcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNlbGVjdG9yIHtcbiAgc3JjOiB0cy5Tb3VyY2VGaWxlO1xuXG4gIGNvbnN0cnVjdG9yKHNyYzogc3RyaW5nLCBmaWxlOiBzdHJpbmcpO1xuICBjb25zdHJ1Y3RvcihzcmM6IHRzLlNvdXJjZUZpbGUpO1xuICBjb25zdHJ1Y3RvcihzcmM6IHRzLlNvdXJjZUZpbGUgfCBzdHJpbmcsIGZpbGU/OiBzdHJpbmcpIHtcbiAgICBpZiAodHlwZW9mIHNyYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRoaXMuc3JjID0gdHMuY3JlYXRlU291cmNlRmlsZShmaWxlIHx8ICd1bmtub3duJywgc3JjLCB0cy5TY3JpcHRUYXJnZXQuRVNOZXh0LFxuICAgICAgICB0cnVlLCB0cy5TY3JpcHRLaW5kLlRTWCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc3JjID0gc3JjO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuICAgKiBAcGFyYW0gY2IgcmV0dXJuIHRydWUgdG8gc2tpcCByZXN0IG5vZGVzXG4gICAqL1xuICBzb21lKGFzdD86IHRzLk5vZGUgfCBudWxsLCBxdWVyeT86IHN0cmluZyB8IG51bGwsIGNiPzogdHJhdmVyc2VDYlR5cGUgfCBudWxsKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcSA9IHF1ZXJ5ID8gbmV3IFF1ZXJ5KHF1ZXJ5KSA6IG51bGw7XG4gICAgcmV0dXJuICEhdGhpcy50cmF2ZXJzZShhc3QgfHwgdGhpcy5zcmMsIChhc3QsIHBhdGgsIC4uLnJlc3QpID0+IHtcbiAgICAgIGlmIChxID09IG51bGwgfHwgcS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIGlmIChjYikge1xuICAgICAgICAgIHJldHVybiBjYihhc3QsIHBhdGgsIC4uLnJlc3QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgd2Fsa0FzdChoYW5kbGVyczogV2Fsa0NhbGxiYWNrW10pOiB2b2lkO1xuICB3YWxrQXN0KGFzdDogdHMuTm9kZSwgaGFuZGxlcnM6IFdhbGtDYWxsYmFja1tdKTogdm9pZDtcbiAgd2Fsa0FzdChhc3Q6IHRzLk5vZGV8V2Fsa0NhbGxiYWNrW10gLCBoYW5kbGVycz86IFdhbGtDYWxsYmFja1tdKTogdm9pZCB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXN0KSkge1xuICAgICAgaGFuZGxlcnMgPSBhc3Q7XG4gICAgICBhc3QgPSB0aGlzLnNyYztcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeU1hcDoge1tzdHI6IHN0cmluZ106IFF1ZXJ5fSA9IHt9O1xuICAgIGlmICghaGFuZGxlcnMpXG4gICAgICByZXR1cm47XG4gICAgaGFuZGxlcnMuZm9yRWFjaChoID0+IHF1ZXJ5TWFwW2gucXVlcnldID0gbmV3IFF1ZXJ5KGgucXVlcnkpKTtcblxuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICBjb25zdCBza2lwID0gZmFsc2U7XG4gICAgICBoYW5kbGVycz8uc29tZShoID0+IHtcbiAgICAgICAgaWYgKHF1ZXJ5TWFwW2gucXVlcnldLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgICBoLmNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBpZiAoc2tpcClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG4gICAqIFxuXHQgKiBlLmcuXG5cdCAqICAtIC5lbGVtZW50czpJbXBvcnRTcGVjaWZpZXIgPiAubmFtZVxuXHQgKiAgLSAuZWxlbWVudHNbMl0gPiAubmFtZVxuXHQgKiAgLSBeLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG4gICAqIEJlZ2luaW5nIHdpdGggXCJeXCIgbWVhbmluZyBzdHJpY3RseSBtYXRjaGluZyBzdGFydHMgd2l0aCByb290IG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIFxuXHQgKi9cbiAgZmluZE1hcFRvPFQ+KHF1ZXJ5OiBzdHJpbmcsIGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+KTogVCB8IG51bGw7XG4gIGZpbmRNYXBUbzxUPihhc3Q6IHRzLk5vZGUsIHF1ZXJ5OiBzdHJpbmcsIGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+KTogVCB8IG51bGw7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gIGZpbmRNYXBUbzxUPiguLi5hcmc6IFtxdWVyeU9yQXN0OiBzdHJpbmcgfCB0cy5Ob2RlLCBjYWxsQmFja09yUXVlcnk6IEFzdEhhbmRsZXI8VD58c3RyaW5nLCBjYWxsYmFjaz86IEFzdEhhbmRsZXI8VD5dKTogVCB8IG51bGwge1xuICAgIGxldCBxdWVyeTogc3RyaW5nO1xuICAgIGxldCBhc3Q6IHRzLk5vZGU7XG4gICAgbGV0IGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+O1xuICAgIGlmICh0eXBlb2YgYXJnWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgICBxdWVyeSA9IGFyZ1swXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzFdIGFzIEFzdEhhbmRsZXI8VD47XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzdCA9IGFyZ1swXTtcbiAgICAgIHF1ZXJ5ID0gYXJnWzFdIGFzIHN0cmluZztcbiAgICAgIGNhbGxiYWNrID0gYXJnWzJdIGFzIEFzdEhhbmRsZXI8VD47XG4gICAgfVxuICAgIGxldCByZXM6IFQgfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KHF1ZXJ5ISk7XG5cbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmKSA9PiB7XG4gICAgICBpZiAocmVzICE9IG51bGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgaWYgKHEubWF0Y2hlcyhwYXRoKSkge1xuICAgICAgICByZXMgPSBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZik7XG4gICAgICAgIGlmIChyZXMgIT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IHJvb3QgQVNUIG5vZGVcblx0ICogQHBhcmFtIHF1ZXJ5IExpa2UgQ1NTIHNlbGVjdCA6PSBbXCJeXCJdIDxzZWxlY3RvciBlbGVtZW50PiAoXCIgXCIgfCBcIj5cIikgPHNlbGVjdG9yIGVsZW1lbnQ+XG5cdCAqICAgd2hlcmUgPHNlbGVjdG9yIGVsZW1lbnQ+IDo9IFwiLlwiIDxwcm9wZXJ0eSBuYW1lPiA8aW5kZXg+PyB8IFwiOlwiIDxUeXBlc2NyaXB0IFN5bnRheCBraW5kIG5hbWU+IHwgKlxuXHQgKiAgIHdoZXJlIDxpbmRleD4gOj0gXCJbXCIgXCIwXCItXCI5XCIgXCJdXCJcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG5cdCAqL1xuICBmaW5kQWxsKHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlW107XG4gIGZpbmRBbGwoYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nKTogdHMuTm9kZVtdO1xuICBmaW5kQWxsKGFzdDogdHMuTm9kZSB8IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiB0cy5Ob2RlW10ge1xuICAgIGxldCBxOiBRdWVyeTtcbiAgICBpZiAodHlwZW9mIGFzdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5ID0gYXN0O1xuICAgICAgcSA9IG5ldyBRdWVyeShhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkhKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXM6IHRzLk5vZGVbXSA9IFtdO1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoLCBfcGFyZW50cywgX2lzTGVhZikgPT4ge1xuICAgICAgaWYgKHEubWF0Y2hlcyhwYXRoKSkge1xuICAgICAgICByZXMucHVzaChhc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH1cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IHJvb3QgQVNUIG5vZGVcblx0ICogQHBhcmFtIHF1ZXJ5IExpa2UgQ1NTIHNlbGVjdCA6PSBbXCJeXCJdIDxzZWxlY3RvciBlbGVtZW50PiAoXCIgXCIgfCBcIj5cIikgPHNlbGVjdG9yIGVsZW1lbnQ+XG5cdCAqICAgd2hlcmUgPHNlbGVjdG9yIGVsZW1lbnQ+IDo9IFwiLlwiIDxwcm9wZXJ0eSBuYW1lPiA8aW5kZXg+PyB8IFwiOlwiIDxUeXBlc2NyaXB0IFN5bnRheCBraW5kIG5hbWU+IHwgKlxuXHQgKiAgIHdoZXJlIDxpbmRleD4gOj0gXCJbXCIgXCIwXCItXCI5XCIgXCJdXCJcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG5cdCAqL1xuICBmaW5kRmlyc3QocXVlcnk6IHN0cmluZyk6IHRzLk5vZGUgfCB1bmRlZmluZWQ7XG4gIGZpbmRGaXJzdChhc3Q6IHRzLk5vZGUsIHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmaW5kRmlyc3QoYXN0OiB0cy5Ob2RlIHwgc3RyaW5nLCBxdWVyeT86IHN0cmluZyk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgIGxldCBxOiBRdWVyeTtcbiAgICBpZiAodHlwZW9mIGFzdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5ID0gYXN0O1xuICAgICAgcSA9IG5ldyBRdWVyeShxdWVyeSk7XG4gICAgICBhc3QgPSB0aGlzLnNyYztcbiAgICB9IGVsc2Uge1xuICAgICAgcSA9IG5ldyBRdWVyeShxdWVyeSEpO1xuICAgIH1cbiAgICBsZXQgcmVzOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoKSA9PiB7XG4gICAgICBpZiAocmVzKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzID0gYXN0O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgbGlzdChhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIGxldCBvdXQgPSAnJztcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKG5vZGUsIHBhdGgsIF9wYXJlbnRzLCBub0NoaWxkKSA9PiB7XG4gICAgICBpZiAobm9DaGlsZCkge1xuICAgICAgICBvdXQgKz0gcGF0aC5qb2luKCc+JykgKyAnICcgKyBub2RlLmdldFRleHQodGhpcy5zcmMpO1xuICAgICAgICBvdXQgKz0gJ1xcbic7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHByaW50QWxsKGFzdDogdHMuTm9kZSA9IHRoaXMuc3JjKTogdm9pZCB7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIGNyZWF0ZVByaW50Tm9kZUNiKHRydWUpKTtcbiAgfVxuXG4gIHByaW50QWxsTm9UeXBlKGFzdDogdHMuTm9kZSA9IHRoaXMuc3JjKTogdm9pZCB7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIGNyZWF0ZVByaW50Tm9kZUNiKGZhbHNlKSk7XG4gIH1cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IFxuXHQgKiBAcGFyYW0gY2IgcmV0dXJuIHRydWUgdG8gc2tpcCB0cmF2ZXJzaW5nIGNoaWxkIG5vZGUgYW5kIHJlbWFpbmluZyBzaWJsaW5nIG5vZGVzXG5cdCAqIEBwYXJhbSBsZXZlbCBkZWZhdWx0IDBcbiAgICogQHJldHVybnMgdHJ1ZSAtIHN0b3AgdHJhdmVyc2UgcmVtYWluaW5nIG5vZGVzXG5cdCAqL1xuICB0cmF2ZXJzZShhc3Q6IHRzLk5vZGUsXG4gICAgY2I6IHRyYXZlcnNlQ2JUeXBlLFxuICAgIHByb3BOYW1lID0gJycsIHBhcmVudHM6IHRzLk5vZGVbXSA9IFtdLCBwYXRoRWxzOiBzdHJpbmdbXSA9IFtdKTogYm9vbGVhbiB7XG5cbiAgICBsZXQgbmVlZFBvcFBhdGhFbCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKGFzdC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGUpIHtcbiAgICAgIC8vIGxldCBwcm9wTmFtZSA9IHBhcmVudHNbcGFyZW50cy5sZW5ndGggLSAxXSA9PT0gdGhpcy5zcmMgPyAnJyA6IHRoaXMuX2ZpbmRQYXJlbnRQcm9wTmFtZShhc3QsIHBhcmVudHMpO1xuICAgIGxldCBwYXRoRWwgPSAnOicgKyBza1thc3Qua2luZF07XG4gICAgaWYgKHByb3BOYW1lKVxuICAgICAgcGF0aEVsID0gJy4nICsgcHJvcE5hbWUgKyBwYXRoRWw7XG4gICAgcGF0aEVscy5wdXNoKHBhdGhFbCk7XG5cbiAgICAvLyBjb25zdCBqc2RvYyA9IHRzLmdldEpTRG9jVGFncyhhc3QpO1xuICAgIC8vIGNvbnN0IGNvbW1lbnRzID0ganNkb2MgPyBqc2RvYy5tYXAodCA9PiB0LmNvbW1lbnQpLmpvaW4oKSA6ICcnO1xuICAgIGNvbnN0IGNvbW1lbnRzID0gdGhpcy5zcmMuZ2V0RnVsbFRleHQoKS5zbGljZShhc3QuZ2V0U3RhcnQodW5kZWZpbmVkLCB0cnVlKSwgYXN0LmdldFN0YXJ0KCkpO1xuICAgIG5lZWRQb3BQYXRoRWwgPSB0cnVlO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IHJlcyA9IGNiKGFzdCwgcGF0aEVscywgcGFyZW50cywgYXN0LmdldENoaWxkQ291bnQodGhpcy5zcmMpIDw9IDAsIGNvbW1lbnRzLnRyaW0oKSk7XG5cbiAgICBpZiAocmVzICE9PSAnU0tJUCcgJiYgcmVzICE9PSB0cnVlKSB7XG4gICAgICBwYXJlbnRzLnB1c2goYXN0KTtcbiAgICAgIGNvbnN0IF92YWx1ZTJrZXkgPSBuZXcgTWFwPGFueSwgc3RyaW5nPigpO1xuXG4gICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5KTtcblxuICAgICAgLyoqXG4gICAgICAgKiB0cy5mb3JFYWNoQ2hpbGQgKG9yIGBOb2RlLmZvckVhY2hDaGlsZCgpYCkganVzdCBjYW4ndCBsaXN0IGFsbCB0aGUgY2hpbGRyZW4gbGlrZSBwdXJlIHN5dGF4IHRva2VucyxcbiAgICAgICAqIHNvIEkgdXNlIE5vZGUuZ2V0Q2hpbGRyZW5kKCkgdG8gZ2V0IGFsbCBjaGlsZCBub2Rlcy5cbiAgICAgICAqIFxuICAgICAgICogQnV0IHRzLmZvckVhY2hDaGlsZCBpcyB0aGUgb25seSBmdW5jdGlvbiB3aGljaCBjYW4gZ2V0IGVtYmVkZGVkIGFycmF5IGNoaWxkcmVuIG5vZGUgaW4gZm9ybSBvZiBOb2RlQXJyYXksXG4gICAgICAgKiBzbyBJIHN0aWxsIG5lZWQgaXQgaGVyZS5cbiAgICAgICAqL1xuICAgICAgdHMuZm9yRWFjaENoaWxkKGFzdCwgY2hpbGQgPT4ge1xuICAgICAgICBsZXQgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChjaGlsZCk7XG4gICAgICAgIGlmIChwcm9wTmFtZSA9PSBudWxsKSB7XG4gICAgICAgICAgY3JlYXRlVmFsdWUyS2V5TWFwKGFzdCwgX3ZhbHVlMmtleSwgdHJ1ZSk7XG4gICAgICAgICAgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChjaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgaXNTdG9wID0gdGhpcy50cmF2ZXJzZShjaGlsZCwgY2IsIHByb3BOYW1lLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICAgICAgcmV0dXJuIGlzU3RvcDtcbiAgICAgICAgICAvLyByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgICAgc3ViQXJyYXkgPT4ge1xuICAgICAgICAgIGxldCBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KHN1YkFycmF5KTtcbiAgICAgICAgICBpZiAocHJvcE5hbWUgPT0gbnVsbCkge1xuICAgICAgICAgICAgY3JlYXRlVmFsdWUyS2V5TWFwKGFzdCwgX3ZhbHVlMmtleSwgdHJ1ZSk7XG4gICAgICAgICAgICBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KHN1YkFycmF5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMudHJhdmVyc2VBcnJheShzdWJBcnJheSwgY2IsIHByb3BOYW1lLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIHBhcmVudHMucG9wKCk7XG4gICAgfVxuICAgIGlmIChuZWVkUG9wUGF0aEVsKVxuICAgICAgcGF0aEVscy5wb3AoKTtcbiAgICByZXR1cm4gcmVzID09PSB0cnVlO1xuICB9XG5cbiAgcGF0aEZvckFzdChhc3Q6IHRzLk5vZGUsIHdpdGhUeXBlID0gdHJ1ZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aEVsczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgcCA9IGFzdDtcbiAgICB3aGlsZSAocCkge1xuICAgICAgY29uc3QgcHJvcEV4cCA9IHRoaXMucHJvcE5hbWVGb3JBc3QocCk7XG4gICAgICBwYXRoRWxzLnB1c2goKHByb3BFeHAgPyAnLicgKyBwcm9wRXhwIDogJycpICsgKHdpdGhUeXBlID8gJzonICsgc2tbcC5raW5kXSA6ICcnKSk7XG4gICAgICBpZiAocCA9PT0gdGhpcy5zcmMpXG4gICAgICAgIGJyZWFrO1xuICAgICAgcCA9IHAucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gcGF0aEVscy5yZXZlcnNlKCkuam9pbignPicpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHByb3BOYW1lRm9yQXN0KGFzdDogdHMuTm9kZSk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IHAgPSBhc3QucGFyZW50O1xuICAgIGlmIChwID09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGNhY2hlZFByb3BlcnRpZXMgPSBhc3RTY2hlbWFDYWNoZVtwLmtpbmRdO1xuXG4gICAgbGV0IHByb3BlcnRpZXMgPSBjYWNoZWRQcm9wZXJ0aWVzO1xuICAgIGlmIChwcm9wZXJ0aWVzID09IG51bGwpIHtcbiAgICAgIGFzdFNjaGVtYUNhY2hlW3Aua2luZF0gPSBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMocCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcFtwcm9wXSBhcyB1bmtub3duO1xuICAgICAgaWYgKFsncGFyZW50JywgJ2tpbmQnLCAnX2NoaWxkcmVuJywgJ3BvcycsICdlbmQnXS5pbmNsdWRlcyhwcm9wKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgY29uc3QgaWR4ID0gKHZhbHVlIGFzIHRzLk5vZGVbXSkuaW5kZXhPZihhc3QpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICByZXR1cm4gcHJvcCArIGBbJHtpZHh9XWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gYXN0KSB7XG4gICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VBcnJheShub2RlczogdHMuTm9kZUFycmF5PHRzLk5vZGU+IHwgdHMuTm9kZVtdLFxuICAgIGNiOiB0cmF2ZXJzZUNiVHlwZSxcbiAgICBwcm9wTmFtZSA9ICcnLCBwYXJlbnRzOiB0cy5Ob2RlW10gPSBbXSwgcGF0aEVsczogc3RyaW5nW10gPSBbXSk6IGJvb2xlYW4ge1xuXG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgYXN0IG9mIG5vZGVzKSB7XG4gICAgICBjb25zdCBpc1N0b3AgPSB0aGlzLnRyYXZlcnNlKGFzdCwgY2IsIHByb3BOYW1lICsgYFske2krK31dYCwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICBpZiAoaXNTdG9wKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVZhbHVlMktleU1hcChhc3Q6IHRzLk5vZGUsIHZhbHVlMktleU1hcDogTWFwPGFueSwgc3RyaW5nPiwgcmVidWlsZCA9IGZhbHNlKTogc3RyaW5nW10ge1xuICAvLyBjb25zdCBwcm9wcyA9IGtleXNJbihhc3QpXG4gIGxldCBwcm9wczogc3RyaW5nW107XG4gIGNvbnN0IGNhY2hlZCA9IGFzdFNjaGVtYUNhY2hlW2FzdC5raW5kXTtcblxuICBpZiAocmVidWlsZCB8fCBjYWNoZWQgPT0gbnVsbCkge1xuICAgIHByb3BzID0gT2JqZWN0LmtleXMoYXN0KVxuICAgICAgLmZpbHRlcihwcm9wID0+IHR5cGVvZiBhc3RbcHJvcF0gIT09ICdmdW5jdGlvbicgJiYgIVsncGFyZW50JywgJ2tpbmQnLCAnX2NoaWxkcmVuJywgJ3BvcycsICdlbmQnXS5pbmNsdWRlcyhwcm9wKSk7XG4gICAgaWYgKGNhY2hlZCA9PSBudWxsKSB7XG4gICAgICBhc3RTY2hlbWFDYWNoZVthc3Qua2luZF0gPSBwcm9wcztcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc2NoZW1hID0gY2FjaGVkO1xuICAgICAgc2NoZW1hLnB1c2goLi4ucHJvcHMpO1xuICAgICAgdW5pcShzY2hlbWEpO1xuICAgICAgcHJvcHMgPSBzY2hlbWE7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHByb3BzID0gY2FjaGVkO1xuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIHByb3BzISkge1xuICAgIHZhbHVlMktleU1hcC5zZXQoYXN0W2tleV0sIGtleSk7XG4gIH1cbiAgcmV0dXJuIHByb3BzITtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RDaGFyYWN0ZXIge1xuICBwcm9wZXJ0eU5hbWU/OiBzdHJpbmc7XG4gIHByb3BJbmRleD86IG51bWJlcjtcbiAga2luZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RRdWVyeSBleHRlbmRzIEFzdENoYXJhY3RlciB7XG4gIHRleHQ/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBjbGFzcyBRdWVyeSB7XG4gIHF1ZXJ5UGF0aHM6IEFzdENoYXJhY3RlcltdW107IC8vIGluIHJldmVyc2VkIG9yZGVyXG4gIHByaXZhdGUgZnJvbVJvb3QgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihxdWVyeTogc3RyaW5nKSB7XG4gICAgcXVlcnkgPSBxdWVyeS50cmltKCk7XG4gICAgaWYgKHF1ZXJ5LnN0YXJ0c1dpdGgoJ14nKSkge1xuICAgICAgcXVlcnkgPSBxdWVyeS5zbGljZSgxKTtcbiAgICAgIHRoaXMuZnJvbVJvb3QgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnF1ZXJ5UGF0aHMgPSBxdWVyeS50cmltKClcbiAgICAgIC5yZXBsYWNlKC9cXHMqPlxccyovZywgJz4nKVxuICAgICAgLnNwbGl0KC9cXHMrLylcbiAgICAgIC5tYXAocGF0aHMgPT4gcGF0aHMuc3BsaXQoJz4nKVxuICAgICAgICAubWFwKHNpbmdsZUFzdERlc2MgPT4gdGhpcy5fcGFyc2VEZXNjKHNpbmdsZUFzdERlc2MpKS5yZXZlcnNlKCkpXG4gICAgICAucmV2ZXJzZSgpO1xuICB9XG5cbiAgbWF0Y2hlcyhwYXRoOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICAgIGxldCB0ZXN0UG9zID0gcGF0aC5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHN0YXJ0VGVzdFBvcyA9IHRlc3RQb3M7XG4gICAgZm9yIChjb25zdCBjb25zZWN1dGl2ZU5vZGVzIG9mIHRoaXMucXVlcnlQYXRocy5zbGljZSgwKSkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgaWYgKHRoaXMubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoY29uc2VjdXRpdmVOb2RlcywgcGF0aCwgdGVzdFBvcykpIHtcbiAgICAgICAgICB0ZXN0UG9zIC09IGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKHRlc3RQb3MgPT09IHN0YXJ0VGVzdFBvcykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0ZXN0UG9zLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoID4gdGVzdFBvcyArIDEpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mcm9tUm9vdCA/IHRlc3RQb3MgPT09IDAgOiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9wYXJzZURlc2Moc2luZ2xlQXN0RGVzYzogc3RyaW5nKTogQXN0UXVlcnkge1xuICAgIGNvbnN0IGFzdENoYXI6IEFzdFF1ZXJ5ID0ge307XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdGxldCBtID0gL14oPzpcXC4oW2EtekEtWjAtOV8kXSspKD86XFxbKFswLTldKilcXF0pPyk/KD86XFw6KFthLXpBLVowLTlfJF0rKSk/JHxeXFwqJC8uZXhlYyhzaW5nbGVBc3REZXNjKTtcbiAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcXVlcnkgc3RyaW5nIFwiJHtjaGFsay55ZWxsb3coc2luZ2xlQXN0RGVzYyl9XCJgKTtcbiAgICB9XG4gICAgaWYgKG1bMV0pIHtcbiAgICAgIGFzdENoYXIucHJvcGVydHlOYW1lID0gbVsxXTtcbiAgICAgIGlmIChtWzJdKVxuICAgICAgICBhc3RDaGFyLnByb3BJbmRleCA9IHBhcnNlSW50KG1bMl0sIDEwKTtcbiAgICB9XG4gICAgaWYgKG1bM10pXG4gICAgICBhc3RDaGFyLmtpbmQgPSBtWzNdO1xuICAgIHJldHVybiBhc3RDaGFyO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaGVzQXN0KHF1ZXJ5OiBBc3RRdWVyeSwgdGFyZ2V0OiBBc3RDaGFyYWN0ZXIpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhxdWVyeSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gcXVlcnlba2V5XSBhcyB1bmtub3duO1xuICAgICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICBpZiAoIXZhbHVlLnRlc3QodGFyZ2V0W2tleV0pKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAodGFyZ2V0W2tleV0gIT09IHZhbHVlKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIHByZWRpY3RlIGlmIGl0IG1hdGNoZXMgXCI+XCIgY29ubmVjdGVkIHBhdGggZXhwcmVzc2lvbiBcbiAgICogQHBhcmFtIHF1ZXJ5Tm9kZXMgYWxsIGl0ZW1zIGluIHJldmVyc2VkIG9yZGVyXG4gICAqIEBwYXJhbSBwYXRoIFxuICAgKiBAcGFyYW0gdGVzdFBvcyBzdGFydHMgd2l0aCBwYXRoLmxlbmd0aCAtIDFcbiAgICovXG4gIHByaXZhdGUgbWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMocXVlcnlOb2RlczogQXN0Q2hhcmFjdGVyW10sIHBhdGg6IHN0cmluZ1tdLCB0ZXN0UG9zOiBudW1iZXIpIHtcbiAgICBpZiAocXVlcnlOb2Rlcy5sZW5ndGggPiB0ZXN0UG9zICsgMSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHF1ZXJ5IG9mIHF1ZXJ5Tm9kZXMuc2xpY2UoMCkpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuX3BhcnNlRGVzYyhwYXRoW3Rlc3RQb3MtLV0pO1xuICAgICAgaWYgKCF0aGlzLm1hdGNoZXNBc3QocXVlcnksIHRhcmdldCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==