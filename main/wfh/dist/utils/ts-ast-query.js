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
exports.Query = exports.printFile = exports.setAstPropertyCache = exports.saveAstPropertyCache = exports.astSchemaCache = void 0;
const fs = __importStar(require("fs"));
// import keysIn from 'lodash/keysIn';
const isRegExp_1 = __importDefault(require("lodash/isRegExp"));
const uniq_1 = __importDefault(require("lodash/uniq"));
const typescript_1 = __importStar(require("typescript"));
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
            // tslint:disable-next-line: no-console
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
            // tslint:disable-next-line: no-console
            console.log((withType ? path.join(' > ') : path.map(pathExp).join('')) +
                ` ${chalk_1.default.yellow(comment)}`);
        }
        if (!isLeaf)
            return;
        // tslint:disable-next-line: no-console
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
            handlers.some(h => {
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
    // tslint:disable-next-line: max-line-length
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
       * @param cb return true to skip traversing child node
       * @param level default 0
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
        if (res !== true) {
            parents.push(ast);
            const _value2key = new Map();
            // tslint:disable-next-line:forin
            // for (const key in ast) {
            const self = this;
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
                const isStop = self.traverse(child, cb, propName, parents, pathEls);
                return isStop;
                // return undefined;
            }, subArray => {
                let propName = _value2key.get(subArray);
                if (propName == null) {
                    createValue2KeyMap(ast, _value2key, true);
                    propName = _value2key.get(subArray);
                }
                return self.traverseArray(subArray, cb, propName, parents, pathEls);
            });
            parents.pop();
        }
        if (needPopPathEl)
            pathEls.pop();
        return res;
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
                return isStop;
        }
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
        // tslint:disable-next-line
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvdHMtYXN0LXF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsc0NBQXNDO0FBQ3RDLCtEQUF1QztBQUN2Qyx1REFBK0I7QUFFL0IseURBQWlEO0FBQ2pELGtEQUEwQjtBQUVmLFFBQUEsY0FBYyxHQUErQixFQUFFLENBQUM7QUFDM0Qsd0JBQXdCO0FBQ3hCLHdCQUF3QjtBQUV4QixTQUFnQixvQkFBb0IsQ0FBQyxJQUFZO0lBQy9DLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQWMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxLQUE0QjtJQUM5RCxzQkFBYyxHQUFHLEtBQUssQ0FBQztBQUN6QixDQUFDO0FBRkQsa0RBRUM7QUFVRCxTQUFnQixTQUFTLENBQUMsSUFBWSxFQUFFLEtBQXFCLEVBQUUsUUFBUSxHQUFHLElBQUk7SUFDNUUsSUFBSSxLQUFLLEVBQUU7UUFDVCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0MsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FDcEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFD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SztnQkFDdkMsT0FBTyxLQUFLLENBQUM7U0FDaEI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNLLHVCQUF1QixDQUFDLFVBQTBCLEVBQUUsSUFBYyxFQUFFLE9BQWU7UUFDekYsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLE9BQU8sR0FBRyxDQUFDO1lBQ2pDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxNQUFNLEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDO2dCQUNqQyxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBbkZELHNCQW1GQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCBrZXlzSW4gZnJvbSAnbG9kYXNoL2tleXNJbic7XG5pbXBvcnQgaXNSZWdFeHAgZnJvbSAnbG9kYXNoL2lzUmVnRXhwJztcbmltcG9ydCB1bmlxIGZyb20gJ2xvZGFzaC91bmlxJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdHMsIHsgU3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQgbGV0IGFzdFNjaGVtYUNhY2hlOiB7W2tpbmQ6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuLy8gbGV0IGZpbGVDb3VudGluZyA9IDA7XG4vLyBsZXQgbGFzdEZpbGU6IHN0cmluZztcblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVBc3RQcm9wZXJ0eUNhY2hlKGZpbGU6IHN0cmluZykge1xuICBmcy53cml0ZUZpbGVTeW5jKGZpbGUsIEpTT04uc3RyaW5naWZ5KGFzdFNjaGVtYUNhY2hlLCBudWxsLCAnICAnKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRBc3RQcm9wZXJ0eUNhY2hlKGNhY2hlOiB0eXBlb2YgYXN0U2NoZW1hQ2FjaGUpIHtcbiAgYXN0U2NoZW1hQ2FjaGUgPSBjYWNoZTtcbn1cblxuZXhwb3J0IHR5cGUgQXN0SGFuZGxlcjxUPiA9IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzOiB0cy5Ob2RlW10sIGlzTGVhZjogYm9vbGVhbikgPT4gVDtcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZXRoeSB2YWx1ZSB0aGF0IGl0ZXJhdGlvbiBzdG9wcy5cbiAqL1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbmV4cG9ydCB0eXBlIHRyYXZlcnNlQ2JUeXBlID0gKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM6IHRzLk5vZGVbXSwgaXNMZWFmOiBib29sZWFuLCBjb21tZW50Pzogc3RyaW5nKSA9PiB0cnVlIHwgdm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50RmlsZShmaWxlOiBzdHJpbmcsIHF1ZXJ5Pzogc3RyaW5nIHwgbnVsbCwgd2l0aFR5cGUgPSB0cnVlKSB7XG4gIGlmIChxdWVyeSkge1xuICAgIGNvbnN0IHNlbGVjdG9yID0gbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKTtcbiAgICBzZWxlY3Rvci5maW5kTWFwVG8ocXVlcnksIChhc3QsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsuY3lhbihcbiAgICAgICAgd2l0aFR5cGUgPyBwYXRoLmpvaW4oJyA+ICcpIDogcGF0aC5tYXAoZWwgPT4gZWwuc2xpY2UoMCwgZWwuaW5kZXhPZignOicpKSkuam9pbignID4gJylcbiAgICAgICkpO1xuICAgICAgc2VsZWN0b3IudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYih3aXRoVHlwZSkpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGlmICh3aXRoVHlwZSlcbiAgICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGwoKTtcbiAgICBlbHNlXG4gICAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsTm9UeXBlKCk7XG4gIH1cbiAgLy8gY29uc29sZS5sb2coYXN0U2NoZW1hQ2FjaGUpO1xufVxuZnVuY3Rpb24gY3JlYXRlUHJpbnROb2RlQ2Iod2l0aFR5cGU6IGJvb2xlYW4pIHtcbiAgY29uc3QgcHJpbnROb2RlOiB0cmF2ZXJzZUNiVHlwZSA9IChjaGlsZCwgcGF0aCwgcGFyZW50cywgaXNMZWFmLCBjb21tZW50KSA9PiB7XG4gICAgaWYgKGNvbW1lbnQpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICh3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChwYXRoRXhwKS5qb2luKCcnKSkgK1xuICAgICAgICAgIGAgJHtjaGFsay55ZWxsb3coY29tbWVudCl9YFxuICAgICAgKTtcbiAgICB9XG4gICAgaWYgKCFpc0xlYWYpXG4gICAgICByZXR1cm47XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coXG4gICAgICAod2l0aFR5cGUgPyBwYXRoLmpvaW4oJyA+ICcpIDogcGF0aC5tYXAocGF0aEV4cCkuam9pbignJykpICtcbiAgICAgICAgYCAke2NoYWxrLmdyZWVuQnJpZ2h0KGNoaWxkLmdldFRleHQoKSl9YFxuICAgICk7XG4gIH07XG5cbiAgZnVuY3Rpb24gcGF0aEV4cChwYXRoRWw6IHN0cmluZywgaWR4OiBudW1iZXIsIHBhdGg6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgICBjb25zdCBbZXhwLCB0eXBlXSA9IHBhdGhFbC5zcGxpdCgnOicpO1xuICAgIGlmICh0eXBlID09PSAnU291cmNlRmlsZScpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGlkeCA+IDAgJiYgcGF0aFtpZHggLSAxXSA9PT0gJzpTb3VyY2VGaWxlJyA/ICdeJyArIGV4cCA6ICcgPiAnICsgZXhwO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHJpbnROb2RlO1xufVxuXG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Fsa0NhbGxiYWNrIHtcbiAgcXVlcnk6IHN0cmluZztcbiAgY2FsbGJhY2s6IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzPzogdHMuTm9kZVtdKSA9PiB0cnVlIHwgdm9pZDtcbn1cbi8vIHR5cGUgQ2FsbGJhY2sgPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWxlY3RvciB7XG4gIHNyYzogdHMuU291cmNlRmlsZTtcblxuICBjb25zdHJ1Y3RvcihzcmM6IHN0cmluZywgZmlsZTogc3RyaW5nKTtcbiAgY29uc3RydWN0b3Ioc3JjOiB0cy5Tb3VyY2VGaWxlKTtcbiAgY29uc3RydWN0b3Ioc3JjOiB0cy5Tb3VyY2VGaWxlIHwgc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gICAgaWYgKHR5cGVvZiBzcmMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSB8fCAndW5rbm93bicsIHNyYywgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNyYyA9IHNyYztcbiAgICB9XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBhc3Qgcm9vdCBBU1Qgbm9kZVxuXHQgKiBAcGFyYW0gcXVlcnkgTGlrZSBDU1Mgc2VsZWN0IDo9IFtcIl5cIl0gPHNlbGVjdG9yIGVsZW1lbnQ+IChcIiBcIiB8IFwiPlwiKSA8c2VsZWN0b3IgZWxlbWVudD5cblx0ICogICB3aGVyZSA8c2VsZWN0b3IgZWxlbWVudD4gOj0gXCIuXCIgPHByb3BlcnR5IG5hbWU+IDxpbmRleD4/IHwgXCI6XCIgPFR5cGVzY3JpcHQgU3ludGF4IGtpbmQgbmFtZT4gfCAqXG5cdCAqICAgd2hlcmUgPGluZGV4PiA6PSBcIltcIiBcIjBcIi1cIjlcIiBcIl1cIlxuXHQgKiBlLmcuXG5cdCAqICAtIC5lbGVtZW50czpJbXBvcnRTcGVjaWZpZXIgPiAubmFtZVxuXHQgKiAgLSAuZWxlbWVudHNbMl0gPiAubmFtZVxuXHQgKiAgLSAuc3RhdGVtZW50c1swXSA6SW1wb3J0U3BlY2lmaWVyID4gOklkZW50aWZpZXJcbiAgICogQHBhcmFtIGNiIHJldHVybiB0cnVlIHRvIHNraXAgcmVzdCBub2Rlc1xuICAgKi9cbiAgc29tZShhc3Q/OiB0cy5Ob2RlIHwgbnVsbCwgcXVlcnk/OiBzdHJpbmcgfCBudWxsLCBjYj86IHRyYXZlcnNlQ2JUeXBlIHwgbnVsbCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHEgPSBxdWVyeSA/IG5ldyBRdWVyeShxdWVyeSkgOiBudWxsO1xuICAgIHJldHVybiAhIXRoaXMudHJhdmVyc2UoYXN0IHx8IHRoaXMuc3JjLCAoYXN0LCBwYXRoLCAuLi5yZXN0KSA9PiB7XG4gICAgICBpZiAocSA9PSBudWxsIHx8IHEubWF0Y2hlcyhwYXRoKSkge1xuICAgICAgICBpZiAoY2IpIHtcbiAgICAgICAgICByZXR1cm4gY2IoYXN0LCBwYXRoLCAuLi5yZXN0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHdhbGtBc3QoaGFuZGxlcnM6IFdhbGtDYWxsYmFja1tdKTogdm9pZDtcbiAgd2Fsa0FzdChhc3Q6IHRzLk5vZGUsIGhhbmRsZXJzOiBXYWxrQ2FsbGJhY2tbXSk6IHZvaWQ7XG4gIHdhbGtBc3QoYXN0OiB0cy5Ob2RlfFdhbGtDYWxsYmFja1tdICwgaGFuZGxlcnM/OiBXYWxrQ2FsbGJhY2tbXSk6IHZvaWQge1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFzdCkpIHtcbiAgICAgIGhhbmRsZXJzID0gYXN0O1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfVxuXG4gICAgY29uc3QgcXVlcnlNYXA6IHtbc3RyOiBzdHJpbmddOiBRdWVyeX0gPSB7fTtcbiAgICBpZiAoIWhhbmRsZXJzKVxuICAgICAgcmV0dXJuO1xuICAgIGhhbmRsZXJzLmZvckVhY2goaCA9PiBxdWVyeU1hcFtoLnF1ZXJ5XSA9IG5ldyBRdWVyeShoLnF1ZXJ5KSk7XG5cbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgY29uc3Qgc2tpcCA9IGZhbHNlO1xuICAgICAgaGFuZGxlcnMhLnNvbWUoaCA9PiB7XG4gICAgICAgIGlmIChxdWVyeU1hcFtoLnF1ZXJ5XS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgICAgaC5jYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHNraXApXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gcXVlcnkgTGlrZSBDU1Mgc2VsZWN0IDo9IFtcIl5cIl0gPHNlbGVjdG9yIGVsZW1lbnQ+IChcIiBcIiB8IFwiPlwiKSA8c2VsZWN0b3IgZWxlbWVudD5cblx0ICogICB3aGVyZSA8c2VsZWN0b3IgZWxlbWVudD4gOj0gXCIuXCIgPHByb3BlcnR5IG5hbWU+IDxpbmRleD4/IHwgXCI6XCIgPFR5cGVzY3JpcHQgU3ludGF4IGtpbmQgbmFtZT4gfCAqXG5cdCAqICAgd2hlcmUgPGluZGV4PiA6PSBcIltcIiBcIjBcIi1cIjlcIiBcIl1cIlxuICAgKiBcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gXi5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuICAgKiBCZWdpbmluZyB3aXRoIFwiXlwiIG1lYW5pbmcgc3RyaWN0bHkgbWF0Y2hpbmcgc3RhcnRzIHdpdGggcm9vdCBub2RlXG5cdCAqIEBwYXJhbSBjYWxsYmFjayBcblx0ICovXG4gIGZpbmRNYXBUbzxUPihxdWVyeTogc3RyaW5nLCBjYWxsYmFjazogQXN0SGFuZGxlcjxUPik6IFQgfCBudWxsO1xuICBmaW5kTWFwVG88VD4oYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nLCBjYWxsYmFjazogQXN0SGFuZGxlcjxUPik6IFQgfCBudWxsO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICBmaW5kTWFwVG88VD4oLi4uYXJnOiBbcXVlcnlPckFzdDogc3RyaW5nIHwgdHMuTm9kZSwgY2FsbEJhY2tPclF1ZXJ5OiBBc3RIYW5kbGVyPFQ+fHN0cmluZywgY2FsbGJhY2s/OiBBc3RIYW5kbGVyPFQ+XSk6IFQgfCBudWxsIHtcbiAgICBsZXQgcXVlcnk6IHN0cmluZztcbiAgICBsZXQgYXN0OiB0cy5Ob2RlO1xuICAgIGxldCBjYWxsYmFjazogQXN0SGFuZGxlcjxUPjtcbiAgICBpZiAodHlwZW9mIGFyZ1swXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFzdCA9IHRoaXMuc3JjO1xuICAgICAgcXVlcnkgPSBhcmdbMF07XG4gICAgICBjYWxsYmFjayA9IGFyZ1sxXSBhcyBBc3RIYW5kbGVyPFQ+O1xuICAgIH0gZWxzZSB7XG4gICAgICBhc3QgPSBhcmdbMF07XG4gICAgICBxdWVyeSA9IGFyZ1sxXSBhcyBzdHJpbmc7XG4gICAgICBjYWxsYmFjayA9IGFyZ1syXSBhcyBBc3RIYW5kbGVyPFQ+O1xuICAgIH1cbiAgICBsZXQgcmVzOiBUIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcSA9IG5ldyBRdWVyeShxdWVyeSEpO1xuXG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZikgPT4ge1xuICAgICAgaWYgKHJlcyAhPSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzID0gY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYpO1xuICAgICAgICBpZiAocmVzICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEFsbChxdWVyeTogc3RyaW5nKTogdHMuTm9kZVtdO1xuICBmaW5kQWxsKGFzdDogdHMuTm9kZSwgcXVlcnk6IHN0cmluZyk6IHRzLk5vZGVbXTtcbiAgZmluZEFsbChhc3Q6IHRzLk5vZGUgfCBzdHJpbmcsIHF1ZXJ5Pzogc3RyaW5nKTogdHMuTm9kZVtdIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkoYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICBxID0gbmV3IFF1ZXJ5KHF1ZXJ5ISk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzOiB0cy5Ob2RlW10gPSBbXTtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgX3BhcmVudHMsIF9pc0xlYWYpID0+IHtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzLnB1c2goYXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEZpcnN0KHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmaW5kRmlyc3QoYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nKTogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgZmluZEZpcnN0KGFzdDogdHMuTm9kZSB8IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkpO1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkhKTtcbiAgICB9XG4gICAgbGV0IHJlczogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCkgPT4ge1xuICAgICAgaWYgKHJlcylcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBpZiAocS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIHJlcyA9IGFzdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGxpc3QoYXN0OiB0cy5Ob2RlID0gdGhpcy5zcmMpIHtcbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChub2RlLCBwYXRoLCBfcGFyZW50cywgbm9DaGlsZCkgPT4ge1xuICAgICAgaWYgKG5vQ2hpbGQpIHtcbiAgICAgICAgb3V0ICs9IHBhdGguam9pbignPicpICsgJyAnICsgbm9kZS5nZXRUZXh0KHRoaXMuc3JjKTtcbiAgICAgICAgb3V0ICs9ICdcXG4nO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwcmludEFsbChhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYih0cnVlKSk7XG4gIH1cblxuICBwcmludEFsbE5vVHlwZShhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYihmYWxzZSkpO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCBcblx0ICogQHBhcmFtIGNiIHJldHVybiB0cnVlIHRvIHNraXAgdHJhdmVyc2luZyBjaGlsZCBub2RlXG5cdCAqIEBwYXJhbSBsZXZlbCBkZWZhdWx0IDBcblx0ICovXG4gIHRyYXZlcnNlKGFzdDogdHMuTm9kZSxcbiAgICBjYjogdHJhdmVyc2VDYlR5cGUsXG4gICAgcHJvcE5hbWUgPSAnJywgcGFyZW50czogdHMuTm9kZVtdID0gW10sIHBhdGhFbHM6IHN0cmluZ1tdID0gW10pOiB0cnVlIHwgdm9pZCB7XG5cbiAgICBsZXQgbmVlZFBvcFBhdGhFbCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKGFzdC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGUpIHtcbiAgICAgIC8vIGxldCBwcm9wTmFtZSA9IHBhcmVudHNbcGFyZW50cy5sZW5ndGggLSAxXSA9PT0gdGhpcy5zcmMgPyAnJyA6IHRoaXMuX2ZpbmRQYXJlbnRQcm9wTmFtZShhc3QsIHBhcmVudHMpO1xuICAgIGxldCBwYXRoRWwgPSAnOicgKyBza1thc3Qua2luZF07XG4gICAgaWYgKHByb3BOYW1lKVxuICAgICAgcGF0aEVsID0gJy4nICsgcHJvcE5hbWUgKyBwYXRoRWw7XG4gICAgcGF0aEVscy5wdXNoKHBhdGhFbCk7XG5cbiAgICAvLyBjb25zdCBqc2RvYyA9IHRzLmdldEpTRG9jVGFncyhhc3QpO1xuICAgIC8vIGNvbnN0IGNvbW1lbnRzID0ganNkb2MgPyBqc2RvYy5tYXAodCA9PiB0LmNvbW1lbnQpLmpvaW4oKSA6ICcnO1xuICAgIGNvbnN0IGNvbW1lbnRzID0gdGhpcy5zcmMuZ2V0RnVsbFRleHQoKS5zbGljZShhc3QuZ2V0U3RhcnQodW5kZWZpbmVkLCB0cnVlKSwgYXN0LmdldFN0YXJ0KCkpO1xuICAgIG5lZWRQb3BQYXRoRWwgPSB0cnVlO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IHJlcyA9IGNiKGFzdCwgcGF0aEVscywgcGFyZW50cywgYXN0LmdldENoaWxkQ291bnQodGhpcy5zcmMpIDw9IDAsIGNvbW1lbnRzLnRyaW0oKSk7XG5cbiAgICBpZiAocmVzICE9PSB0cnVlKSB7XG4gICAgICBwYXJlbnRzLnB1c2goYXN0KTtcbiAgICAgIGNvbnN0IF92YWx1ZTJrZXkgPSBuZXcgTWFwPGFueSwgc3RyaW5nPigpO1xuXG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Zm9yaW5cbiAgICAgIC8vIGZvciAoY29uc3Qga2V5IGluIGFzdCkge1xuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG5cbiAgICAgIGNyZWF0ZVZhbHVlMktleU1hcChhc3QsIF92YWx1ZTJrZXkpO1xuXG4gICAgICAvKipcbiAgICAgICAqIHRzLmZvckVhY2hDaGlsZCAob3IgYE5vZGUuZm9yRWFjaENoaWxkKClgKSBqdXN0IGNhbid0IGxpc3QgYWxsIHRoZSBjaGlsZHJlbiBsaWtlIHB1cmUgc3l0YXggdG9rZW5zLFxuICAgICAgICogc28gSSB1c2UgTm9kZS5nZXRDaGlsZHJlbmQoKSB0byBnZXQgYWxsIGNoaWxkIG5vZGVzLlxuICAgICAgICogXG4gICAgICAgKiBCdXQgdHMuZm9yRWFjaENoaWxkIGlzIHRoZSBvbmx5IGZ1bmN0aW9uIHdoaWNoIGNhbiBnZXQgZW1iZWRkZWQgYXJyYXkgY2hpbGRyZW4gbm9kZSBpbiBmb3JtIG9mIE5vZGVBcnJheSxcbiAgICAgICAqIHNvIEkgc3RpbGwgbmVlZCBpdCBoZXJlLlxuICAgICAgICovXG4gICAgICB0cy5mb3JFYWNoQ2hpbGQoYXN0LCBjaGlsZCA9PiB7XG4gICAgICAgIGxldCBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KGNoaWxkKTtcbiAgICAgICAgaWYgKHByb3BOYW1lID09IG51bGwpIHtcbiAgICAgICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5LCB0cnVlKTtcbiAgICAgICAgICBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KGNoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBpc1N0b3AgPSBzZWxmLnRyYXZlcnNlKGNoaWxkLCBjYiwgcHJvcE5hbWUsIHBhcmVudHMsIHBhdGhFbHMpO1xuICAgICAgICByZXR1cm4gaXNTdG9wIGFzIHVua25vd24gYXMgdHJ1ZSB8IHVuZGVmaW5lZDtcbiAgICAgICAgICAvLyByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfSxcbiAgICAgICAgc3ViQXJyYXkgPT4ge1xuICAgICAgICAgIGxldCBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KHN1YkFycmF5KTtcbiAgICAgICAgICBpZiAocHJvcE5hbWUgPT0gbnVsbCkge1xuICAgICAgICAgICAgY3JlYXRlVmFsdWUyS2V5TWFwKGFzdCwgX3ZhbHVlMmtleSwgdHJ1ZSk7XG4gICAgICAgICAgICBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KHN1YkFycmF5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNlbGYudHJhdmVyc2VBcnJheShzdWJBcnJheSwgY2IsIHByb3BOYW1lLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIHBhcmVudHMucG9wKCk7XG4gICAgfVxuICAgIGlmIChuZWVkUG9wUGF0aEVsKVxuICAgICAgcGF0aEVscy5wb3AoKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcGF0aEZvckFzdChhc3Q6IHRzLk5vZGUsIHdpdGhUeXBlID0gdHJ1ZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aEVsczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgcCA9IGFzdDtcbiAgICB3aGlsZSAocCkge1xuICAgICAgY29uc3QgcHJvcEV4cCA9IHRoaXMucHJvcE5hbWVGb3JBc3QocCk7XG4gICAgICBwYXRoRWxzLnB1c2goKHByb3BFeHAgPyAnLicgKyBwcm9wRXhwIDogJycpICsgKHdpdGhUeXBlID8gJzonICsgc2tbcC5raW5kXSA6ICcnKSk7XG4gICAgICBpZiAocCA9PT0gdGhpcy5zcmMpXG4gICAgICAgIGJyZWFrO1xuICAgICAgcCA9IHAucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gcGF0aEVscy5yZXZlcnNlKCkuam9pbignPicpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHByb3BOYW1lRm9yQXN0KGFzdDogdHMuTm9kZSk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IHAgPSBhc3QucGFyZW50O1xuICAgIGlmIChwID09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGNhY2hlZFByb3BlcnRpZXMgPSBhc3RTY2hlbWFDYWNoZVtwLmtpbmRdO1xuXG4gICAgbGV0IHByb3BlcnRpZXMgPSBjYWNoZWRQcm9wZXJ0aWVzO1xuICAgIGlmIChwcm9wZXJ0aWVzID09IG51bGwpIHtcbiAgICAgIGFzdFNjaGVtYUNhY2hlW3Aua2luZF0gPSBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMocCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gKHAgYXMgYW55KVtwcm9wXTtcbiAgICAgIGlmIChbJ3BhcmVudCcsICdraW5kJywgJ19jaGlsZHJlbicsICdwb3MnLCAnZW5kJ10uaW5jbHVkZXMocHJvcCkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9ICh2YWx1ZSBhcyBhbnlbXSkuaW5kZXhPZihhc3QpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICByZXR1cm4gcHJvcCArIGBbJHtpZHh9XWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gYXN0KSB7XG4gICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VBcnJheShub2RlczogdHMuTm9kZUFycmF5PHRzLk5vZGU+IHwgdHMuTm9kZVtdLFxuICAgIGNiOiAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4pID0+IHRydWUgfCB2b2lkLFxuICAgIHByb3BOYW1lID0gJycsIHBhcmVudHM6IHRzLk5vZGVbXSA9IFtdLCBwYXRoRWxzOiBzdHJpbmdbXSA9IFtdKTogdHJ1ZSB8IHVuZGVmaW5lZCB7XG5cbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBhc3Qgb2Ygbm9kZXMpIHtcbiAgICAgIGNvbnN0IGlzU3RvcCA9IHRoaXMudHJhdmVyc2UoYXN0LCBjYiwgcHJvcE5hbWUgKyBgWyR7aSsrfV1gLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICAgIGlmIChpc1N0b3ApXG4gICAgICAgIHJldHVybiBpc1N0b3AgYXMgdW5rbm93biBhcyB0cnVlIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0OiB0cy5Ob2RlLCB2YWx1ZTJLZXlNYXA6IE1hcDxhbnksIHN0cmluZz4sIHJlYnVpbGQgPSBmYWxzZSk6IHN0cmluZ1tdIHtcbiAgLy8gY29uc3QgcHJvcHMgPSBrZXlzSW4oYXN0KVxuICBsZXQgcHJvcHM6IHN0cmluZ1tdO1xuICBjb25zdCBjYWNoZWQgPSBhc3RTY2hlbWFDYWNoZVthc3Qua2luZF07XG5cbiAgaWYgKHJlYnVpbGQgfHwgY2FjaGVkID09IG51bGwpIHtcbiAgICBwcm9wcyA9IE9iamVjdC5rZXlzKGFzdClcbiAgICAgIC5maWx0ZXIocHJvcCA9PiB0eXBlb2YgYXN0W3Byb3BdICE9PSAnZnVuY3Rpb24nICYmICFbJ3BhcmVudCcsICdraW5kJywgJ19jaGlsZHJlbicsICdwb3MnLCAnZW5kJ10uaW5jbHVkZXMocHJvcCkpO1xuICAgIGlmIChjYWNoZWQgPT0gbnVsbCkge1xuICAgICAgYXN0U2NoZW1hQ2FjaGVbYXN0LmtpbmRdID0gcHJvcHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHNjaGVtYSA9IGNhY2hlZDtcbiAgICAgIHNjaGVtYS5wdXNoKC4uLnByb3BzKTtcbiAgICAgIHVuaXEoc2NoZW1hKTtcbiAgICAgIHByb3BzID0gc2NoZW1hO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBwcm9wcyA9IGNhY2hlZDtcbiAgfVxuICBmb3IgKGNvbnN0IGtleSBvZiBwcm9wcyEpIHtcbiAgICB2YWx1ZTJLZXlNYXAuc2V0KChhc3QgYXMgYW55KVtrZXldLCBrZXkpO1xuICB9XG4gIHJldHVybiBwcm9wcyE7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN0Q2hhcmFjdGVyIHtcbiAgcHJvcGVydHlOYW1lPzogc3RyaW5nO1xuICBwcm9wSW5kZXg/OiBudW1iZXI7XG4gIGtpbmQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXN0UXVlcnkgZXh0ZW5kcyBBc3RDaGFyYWN0ZXIge1xuICB0ZXh0PzogUmVnRXhwO1xufVxuXG5leHBvcnQgY2xhc3MgUXVlcnkge1xuICBxdWVyeVBhdGhzOiBBc3RDaGFyYWN0ZXJbXVtdOyAvLyBpbiByZXZlcnNlZCBvcmRlclxuICBwcml2YXRlIGZyb21Sb290ID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocXVlcnk6IHN0cmluZykge1xuICAgIHF1ZXJ5ID0gcXVlcnkudHJpbSgpO1xuICAgIGlmIChxdWVyeS5zdGFydHNXaXRoKCdeJykpIHtcbiAgICAgIHF1ZXJ5ID0gcXVlcnkuc2xpY2UoMSk7XG4gICAgICB0aGlzLmZyb21Sb290ID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5xdWVyeVBhdGhzID0gcXVlcnkudHJpbSgpXG4gICAgICAucmVwbGFjZSgvXFxzKj5cXHMqL2csICc+JylcbiAgICAgIC5zcGxpdCgvXFxzKy8pXG4gICAgICAubWFwKHBhdGhzID0+IHBhdGhzLnNwbGl0KCc+JylcbiAgICAgICAgLm1hcChzaW5nbGVBc3REZXNjID0+IHRoaXMuX3BhcnNlRGVzYyhzaW5nbGVBc3REZXNjKSkucmV2ZXJzZSgpKVxuICAgICAgLnJldmVyc2UoKTtcbiAgfVxuXG4gIG1hdGNoZXMocGF0aDogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgICBsZXQgdGVzdFBvcyA9IHBhdGgubGVuZ3RoIC0gMTtcbiAgICBjb25zdCBzdGFydFRlc3RQb3MgPSB0ZXN0UG9zO1xuICAgIGZvciAoY29uc3QgY29uc2VjdXRpdmVOb2RlcyBvZiB0aGlzLnF1ZXJ5UGF0aHMuc2xpY2UoMCkpIHtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIGlmICh0aGlzLm1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKGNvbnNlY3V0aXZlTm9kZXMsIHBhdGgsIHRlc3RQb3MpKSB7XG4gICAgICAgICAgdGVzdFBvcyAtPSBjb25zZWN1dGl2ZU5vZGVzLmxlbmd0aDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfSBlbHNlIGlmICh0ZXN0UG9zID09PSBzdGFydFRlc3RQb3MpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGVzdFBvcy0tO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zZWN1dGl2ZU5vZGVzLmxlbmd0aCA+IHRlc3RQb3MgKyAxKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZnJvbVJvb3QgPyB0ZXN0UG9zID09PSAwIDogdHJ1ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfcGFyc2VEZXNjKHNpbmdsZUFzdERlc2M6IHN0cmluZyk6IEFzdFF1ZXJ5IHtcbiAgICBjb25zdCBhc3RDaGFyOiBBc3RRdWVyeSA9IHt9O1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRsZXQgbSA9IC9eKD86XFwuKFthLXpBLVowLTlfJF0rKSg/OlxcWyhbMC05XSopXFxdKT8pPyg/OlxcOihbYS16QS1aMC05XyRdKykpPyR8XlxcKiQvLmV4ZWMoc2luZ2xlQXN0RGVzYyk7XG4gICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHF1ZXJ5IHN0cmluZyBcIiR7Y2hhbGsueWVsbG93KHNpbmdsZUFzdERlc2MpfVwiYCk7XG4gICAgfVxuICAgIGlmIChtWzFdKSB7XG4gICAgICBhc3RDaGFyLnByb3BlcnR5TmFtZSA9IG1bMV07XG4gICAgICBpZiAobVsyXSlcbiAgICAgICAgYXN0Q2hhci5wcm9wSW5kZXggPSBwYXJzZUludChtWzJdLCAxMCk7XG4gICAgfVxuICAgIGlmIChtWzNdKVxuICAgICAgYXN0Q2hhci5raW5kID0gbVszXTtcbiAgICByZXR1cm4gYXN0Q2hhcjtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hlc0FzdChxdWVyeTogQXN0UXVlcnksIHRhcmdldDogQXN0Q2hhcmFjdGVyKTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocXVlcnkpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IChxdWVyeSBhcyBhbnkpW2tleV07XG4gICAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICAgIGlmICghKHZhbHVlIGFzIFJlZ0V4cCkudGVzdCgodGFyZ2V0IGFzIGFueSlba2V5XSkpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIGlmICgodGFyZ2V0IGFzIGFueSlba2V5XSAhPT0gdmFsdWUpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogcHJlZGljdGUgaWYgaXQgbWF0Y2hlcyBcIj5cIiBjb25uZWN0ZWQgcGF0aCBleHByZXNzaW9uIFxuICAgKiBAcGFyYW0gcXVlcnlOb2RlcyBhbGwgaXRlbXMgaW4gcmV2ZXJzZWQgb3JkZXJcbiAgICogQHBhcmFtIHBhdGggXG4gICAqIEBwYXJhbSB0ZXN0UG9zIHN0YXJ0cyB3aXRoIHBhdGgubGVuZ3RoIC0gMVxuICAgKi9cbiAgcHJpdmF0ZSBtYXRjaGVzQ29uc2VjdXRpdmVOb2RlcyhxdWVyeU5vZGVzOiBBc3RDaGFyYWN0ZXJbXSwgcGF0aDogc3RyaW5nW10sIHRlc3RQb3M6IG51bWJlcikge1xuICAgIGlmIChxdWVyeU5vZGVzLmxlbmd0aCA+IHRlc3RQb3MgKyAxKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgcXVlcnkgb2YgcXVlcnlOb2Rlcy5zbGljZSgwKSkge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcy5fcGFyc2VEZXNjKHBhdGhbdGVzdFBvcy0tXSk7XG4gICAgICBpZiAoIXRoaXMubWF0Y2hlc0FzdChxdWVyeSwgdGFyZ2V0KSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuIl19