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
            console.log((withType ? path.join(' > ') : path.map(el => el.slice(0, el.indexOf(':'))).join(' > ')) +
                ` ${chalk_1.default.yellow(comment)}`);
        }
        if (!isLeaf)
            return;
        // tslint:disable-next-line: no-console
        console.log((withType ? path.join(' > ') : path.map(el => el.slice(0, el.indexOf(':'))).join(' > ')) +
            ` ${chalk_1.default.greenBright(child.getText())}`);
    };
    return printNode;
}
// type Callback = (ast: ts.Node, path: string[]) => boolean | void;
class Selector {
    constructor(src, file) {
        // if (file) {
        //   if (file === lastFile) {
        //     debugger;
        //   }
        //   lastFile = file;
        // }
        // console.log(`No. ${++fileCounting} ${chalk.red(file || 'unknown')} schema size: ${_.size(astSchemaCache)}`);
        if (typeof src === 'string') {
            this.src = typescript_1.default.createSourceFile(file || 'unknown', src, typescript_1.default.ScriptTarget.ESNext, true, typescript_1.default.ScriptKind.TSX);
        }
        else {
            this.src = src;
        }
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
            let skip = false;
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
        const comments = this.src.getFullText().slice(ast.getStart(this.src, true), ast.getStart());
        needPopPathEl = true;
        // }
        const res = cb(ast, pathEls, parents, ast.getChildCount(this.src) <= 0, comments);
        if (res !== true) {
            parents.push(ast);
            const _value2key = new Map();
            // tslint:disable-next-line:forin
            // for (const key in ast) {
            const self = this;
            createValue2KeyMap(ast, _value2key);
            // for (const child of ast.getChildren()) {
            //   if ((child as SyntaxList)._children) {
            //     // const subArray = (child as SyntaxList)._children;
            //     continue;
            //   } else {
            //     let propName = _value2key.get(child);
            //     if (propName == null) {
            //       createValue2KeyMap(ast, _value2key);
            //       propName = _value2key.get(child);
            //     }
            //     const isStop = self.traverse(child, cb, propName, parents, pathEls);
            //     if (isStop === true)
            //       break;
            //   }
            // }
            /**
             * ts.forEachChild (or `Node.forEachChild()`) just can't list all the children like pure sytax tokens,
             * so I use Node.getChildrend() to get all child nodes.
             *
             * But ts.forEachChild is the only function which can get embedded array children node in form of NodeArray,
             * so I still need it here.
             */
            ast.forEachChild(child => {
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
    let cached = exports.astSchemaCache[ast.kind];
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
        // if (m[4])
        // 	astChar.text = new RegExp(m[4]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvdHMtYXN0LXF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsc0NBQXNDO0FBQ3RDLCtEQUF1QztBQUN2Qyx1REFBK0I7QUFFL0IseURBQ3FCO0FBQ3JCLGtEQUEwQjtBQUVmLFFBQUEsY0FBYyxHQUErQixFQUFFLENBQUM7QUFDM0Qsd0JBQXdCO0FBQ3hCLHdCQUF3QjtBQUV4QixTQUFnQixvQkFBb0IsQ0FBQyxJQUFZO0lBQy9DLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQWMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxLQUE0QjtJQUM5RCxzQkFBYyxHQUFHLEtBQUssQ0FBQztBQUN6QixDQUFDO0FBRkQsa0RBRUM7QUFTRCxTQUFnQixTQUFTLENBQUMsSUFBWSxFQUFFLEtBQXFCLEVBQUUsUUFBUSxHQUFHLElBQUk7SUFDNUUsSUFBSSxLQUFLLEVBQUU7UUFDVCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0MsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FDcEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFD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QUFDO0NBQ0Y7QUFyRkQsc0JBcUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IGtleXNJbiBmcm9tICdsb2Rhc2gva2V5c0luJztcbmltcG9ydCBpc1JlZ0V4cCBmcm9tICdsb2Rhc2gvaXNSZWdFeHAnO1xuaW1wb3J0IHVuaXEgZnJvbSAnbG9kYXNoL3VuaXEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB0cywgeyBTeW50YXhLaW5kIGFzIHNrLy8gLCBTeW50YXhMaXN0XG4gfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBsZXQgYXN0U2NoZW1hQ2FjaGU6IHtba2luZDogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4vLyBsZXQgZmlsZUNvdW50aW5nID0gMDtcbi8vIGxldCBsYXN0RmlsZTogc3RyaW5nO1xuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUFzdFByb3BlcnR5Q2FjaGUoZmlsZTogc3RyaW5nKSB7XG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgSlNPTi5zdHJpbmdpZnkoYXN0U2NoZW1hQ2FjaGUsIG51bGwsICcgICcpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEFzdFByb3BlcnR5Q2FjaGUoY2FjaGU6IHR5cGVvZiBhc3RTY2hlbWFDYWNoZSkge1xuICBhc3RTY2hlbWFDYWNoZSA9IGNhY2hlO1xufVxuXG5leHBvcnQgdHlwZSBBc3RIYW5kbGVyPFQ+ID0gKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM6IHRzLk5vZGVbXSwgaXNMZWFmOiBib29sZWFuKSA9PiBUO1xuXG4vKipcbiAqIFJldHVybiB0cnVldGh5IHZhbHVlIHRoYXQgaXRlcmF0aW9uIHN0b3BzLlxuICovXG5leHBvcnQgdHlwZSB0cmF2ZXJzZUNiVHlwZSA9IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzOiB0cy5Ob2RlW10sIGlzTGVhZjogYm9vbGVhbiwgY29tbWVudD86IHN0cmluZykgPT4gdHJ1ZSB8IHZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludEZpbGUoZmlsZTogc3RyaW5nLCBxdWVyeT86IHN0cmluZyB8IG51bGwsIHdpdGhUeXBlID0gdHJ1ZSkge1xuICBpZiAocXVlcnkpIHtcbiAgICBjb25zdCBzZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSk7XG4gICAgc2VsZWN0b3IuZmluZE1hcFRvKHF1ZXJ5LCAoYXN0LCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLmN5YW4oXG4gICAgICAgIHdpdGhUeXBlID8gcGF0aC5qb2luKCcgPiAnKSA6IHBhdGgubWFwKGVsID0+IGVsLnNsaWNlKDAsIGVsLmluZGV4T2YoJzonKSkpLmpvaW4oJyA+ICcpXG4gICAgICApKTtcbiAgICAgIHNlbGVjdG9yLnRyYXZlcnNlKGFzdCwgY3JlYXRlUHJpbnROb2RlQ2Iod2l0aFR5cGUpKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpZiAod2l0aFR5cGUpXG4gICAgICBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpLnByaW50QWxsKCk7XG4gICAgZWxzZVxuICAgICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbE5vVHlwZSgpO1xuICB9XG4gIC8vIGNvbnNvbGUubG9nKGFzdFNjaGVtYUNhY2hlKTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZVByaW50Tm9kZUNiKHdpdGhUeXBlOiBib29sZWFuKSB7XG4gIGNvbnN0IHByaW50Tm9kZTogdHJhdmVyc2VDYlR5cGUgPSAoY2hpbGQsIHBhdGgsIHBhcmVudHMsIGlzTGVhZiwgY29tbWVudCkgPT4ge1xuICAgIGlmIChjb21tZW50KSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKFxuICAgICAgICAod2l0aFR5cGUgPyBwYXRoLmpvaW4oJyA+ICcpIDogcGF0aC5tYXAoZWwgPT4gZWwuc2xpY2UoMCwgZWwuaW5kZXhPZignOicpKSkuam9pbignID4gJykpICtcbiAgICAgICAgICBgICR7Y2hhbGsueWVsbG93KGNvbW1lbnQpfWBcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghaXNMZWFmKVxuICAgICAgcmV0dXJuO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKFxuICAgICAgKHdpdGhUeXBlID8gcGF0aC5qb2luKCcgPiAnKSA6IHBhdGgubWFwKGVsID0+IGVsLnNsaWNlKDAsIGVsLmluZGV4T2YoJzonKSkpLmpvaW4oJyA+ICcpKSArXG4gICAgICAgIGAgJHtjaGFsay5ncmVlbkJyaWdodChjaGlsZC5nZXRUZXh0KCkpfWBcbiAgICApO1xuICB9O1xuICByZXR1cm4gcHJpbnROb2RlO1xufVxuXG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Fsa0NhbGxiYWNrIHtcbiAgcXVlcnk6IHN0cmluZztcbiAgY2FsbGJhY2s6IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzPzogdHMuTm9kZVtdKSA9PiB0cnVlIHwgdm9pZDtcbn1cbi8vIHR5cGUgQ2FsbGJhY2sgPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWxlY3RvciB7XG4gIHNyYzogdHMuU291cmNlRmlsZTtcblxuICBjb25zdHJ1Y3RvcihzcmM6IHN0cmluZywgZmlsZTogc3RyaW5nKTtcbiAgY29uc3RydWN0b3Ioc3JjOiB0cy5Tb3VyY2VGaWxlKTtcbiAgY29uc3RydWN0b3Ioc3JjOiB0cy5Tb3VyY2VGaWxlIHwgc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gICAgLy8gaWYgKGZpbGUpIHtcbiAgICAvLyAgIGlmIChmaWxlID09PSBsYXN0RmlsZSkge1xuICAgIC8vICAgICBkZWJ1Z2dlcjtcbiAgICAvLyAgIH1cbiAgICAvLyAgIGxhc3RGaWxlID0gZmlsZTtcbiAgICAvLyB9XG4gICAgLy8gY29uc29sZS5sb2coYE5vLiAkeysrZmlsZUNvdW50aW5nfSAke2NoYWxrLnJlZChmaWxlIHx8ICd1bmtub3duJyl9IHNjaGVtYSBzaXplOiAke18uc2l6ZShhc3RTY2hlbWFDYWNoZSl9YCk7XG4gICAgaWYgKHR5cGVvZiBzcmMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSB8fCAndW5rbm93bicsIHNyYywgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNyYyA9IHNyYztcbiAgICB9XG4gIH1cblxuICB3YWxrQXN0KGhhbmRsZXJzOiBXYWxrQ2FsbGJhY2tbXSk6IHZvaWQ7XG4gIHdhbGtBc3QoYXN0OiB0cy5Ob2RlLCBoYW5kbGVyczogV2Fsa0NhbGxiYWNrW10pOiB2b2lkO1xuICB3YWxrQXN0KGFzdDogdHMuTm9kZXxXYWxrQ2FsbGJhY2tbXSAsIGhhbmRsZXJzPzogV2Fsa0NhbGxiYWNrW10pOiB2b2lkIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhc3QpKSB7XG4gICAgICBoYW5kbGVycyA9IGFzdDtcbiAgICAgIGFzdCA9IHRoaXMuc3JjO1xuICAgIH1cblxuICAgIGNvbnN0IHF1ZXJ5TWFwOiB7W3N0cjogc3RyaW5nXTogUXVlcnl9ID0ge307XG4gICAgaWYgKCFoYW5kbGVycylcbiAgICAgIHJldHVybjtcbiAgICBoYW5kbGVycy5mb3JFYWNoKGggPT4gcXVlcnlNYXBbaC5xdWVyeV0gPSBuZXcgUXVlcnkoaC5xdWVyeSkpO1xuXG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChhc3QsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgIGxldCBza2lwID0gZmFsc2U7XG4gICAgICBoYW5kbGVycyEuc29tZShoID0+IHtcbiAgICAgICAgaWYgKHF1ZXJ5TWFwW2gucXVlcnldLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgICBoLmNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBpZiAoc2tpcClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG4gICAqIFxuXHQgKiBlLmcuXG5cdCAqICAtIC5lbGVtZW50czpJbXBvcnRTcGVjaWZpZXIgPiAubmFtZVxuXHQgKiAgLSAuZWxlbWVudHNbMl0gPiAubmFtZVxuXHQgKiAgLSBeLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG4gICAqIEJlZ2luaW5nIHdpdGggXCJeXCIgbWVhbnMgc3RyaWN0bHkgY29tcGFyaW5nIGZyb20gZmlyc3QgcXVlcmllZCBBU1Qgbm9kZVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgXG5cdCAqL1xuICBmaW5kTWFwVG88VD4ocXVlcnk6IHN0cmluZywgY2FsbGJhY2s6IEFzdEhhbmRsZXI8VD4pOiBUIHwgbnVsbDtcbiAgZmluZE1hcFRvPFQ+KGFzdDogdHMuTm9kZSwgcXVlcnk6IHN0cmluZywgY2FsbGJhY2s6IEFzdEhhbmRsZXI8VD4pOiBUIHwgbnVsbDtcbiAgZmluZE1hcFRvPFQ+KC4uLmFyZzogYW55W10pOiBUIHwgbnVsbCB7XG4gICAgbGV0IHF1ZXJ5OiBzdHJpbmc7XG4gICAgbGV0IGFzdDogdHMuTm9kZTtcbiAgICBsZXQgY2FsbGJhY2s6IEFzdEhhbmRsZXI8VD47XG4gICAgaWYgKHR5cGVvZiBhcmdbMF0gPT09ICdzdHJpbmcnKSB7XG4gICAgICBhc3QgPSB0aGlzLnNyYztcbiAgICAgIHF1ZXJ5ID0gYXJnWzBdO1xuICAgICAgY2FsbGJhY2sgPSBhcmdbMV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGFzdCA9IGFyZ1swXTtcbiAgICAgIHF1ZXJ5ID0gYXJnWzFdO1xuICAgICAgY2FsbGJhY2sgPSBhcmdbMl07XG4gICAgfVxuICAgIGxldCByZXM6IFQgfCBudWxsID0gbnVsbDtcbiAgICBjb25zdCBxID0gbmV3IFF1ZXJ5KHF1ZXJ5ISk7XG5cbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmKSA9PiB7XG4gICAgICBpZiAocmVzICE9IG51bGwpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgaWYgKHEubWF0Y2hlcyhwYXRoKSkge1xuICAgICAgICByZXMgPSBjYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZik7XG4gICAgICAgIGlmIChyZXMgIT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IHJvb3QgQVNUIG5vZGVcblx0ICogQHBhcmFtIHF1ZXJ5IExpa2UgQ1NTIHNlbGVjdCA6PSBbXCJeXCJdIDxzZWxlY3RvciBlbGVtZW50PiAoXCIgXCIgfCBcIj5cIikgPHNlbGVjdG9yIGVsZW1lbnQ+XG5cdCAqICAgd2hlcmUgPHNlbGVjdG9yIGVsZW1lbnQ+IDo9IFwiLlwiIDxwcm9wZXJ0eSBuYW1lPiA8aW5kZXg+PyB8IFwiOlwiIDxUeXBlc2NyaXB0IFN5bnRheCBraW5kIG5hbWU+IHwgKlxuXHQgKiAgIHdoZXJlIDxpbmRleD4gOj0gXCJbXCIgXCIwXCItXCI5XCIgXCJdXCJcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG5cdCAqL1xuICBmaW5kQWxsKHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlW107XG4gIGZpbmRBbGwoYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nKTogdHMuTm9kZVtdO1xuICBmaW5kQWxsKGFzdDogdHMuTm9kZSB8IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiB0cy5Ob2RlW10ge1xuICAgIGxldCBxOiBRdWVyeTtcbiAgICBpZiAodHlwZW9mIGFzdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5ID0gYXN0O1xuICAgICAgcSA9IG5ldyBRdWVyeShhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkhKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXM6IHRzLk5vZGVbXSA9IFtdO1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoLCBfcGFyZW50cywgX2lzTGVhZikgPT4ge1xuICAgICAgaWYgKHEubWF0Y2hlcyhwYXRoKSkge1xuICAgICAgICByZXMucHVzaChhc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH1cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IHJvb3QgQVNUIG5vZGVcblx0ICogQHBhcmFtIHF1ZXJ5IExpa2UgQ1NTIHNlbGVjdCA6PSBbXCJeXCJdIDxzZWxlY3RvciBlbGVtZW50PiAoXCIgXCIgfCBcIj5cIikgPHNlbGVjdG9yIGVsZW1lbnQ+XG5cdCAqICAgd2hlcmUgPHNlbGVjdG9yIGVsZW1lbnQ+IDo9IFwiLlwiIDxwcm9wZXJ0eSBuYW1lPiA8aW5kZXg+PyB8IFwiOlwiIDxUeXBlc2NyaXB0IFN5bnRheCBraW5kIG5hbWU+IHwgKlxuXHQgKiAgIHdoZXJlIDxpbmRleD4gOj0gXCJbXCIgXCIwXCItXCI5XCIgXCJdXCJcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG5cdCAqL1xuICBmaW5kRmlyc3QocXVlcnk6IHN0cmluZyk6IHRzLk5vZGUgfCB1bmRlZmluZWQ7XG4gIGZpbmRGaXJzdChhc3Q6IHRzLk5vZGUsIHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmaW5kRmlyc3QoYXN0OiB0cy5Ob2RlIHwgc3RyaW5nLCBxdWVyeT86IHN0cmluZyk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgIGxldCBxOiBRdWVyeTtcbiAgICBpZiAodHlwZW9mIGFzdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5ID0gYXN0O1xuICAgICAgcSA9IG5ldyBRdWVyeShxdWVyeSk7XG4gICAgICBhc3QgPSB0aGlzLnNyYztcbiAgICB9IGVsc2Uge1xuICAgICAgcSA9IG5ldyBRdWVyeShxdWVyeSEpO1xuICAgIH1cbiAgICBsZXQgcmVzOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoKSA9PiB7XG4gICAgICBpZiAocmVzKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzID0gYXN0O1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgbGlzdChhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIGxldCBvdXQgPSAnJztcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKG5vZGUsIHBhdGgsIF9wYXJlbnRzLCBub0NoaWxkKSA9PiB7XG4gICAgICBpZiAobm9DaGlsZCkge1xuICAgICAgICBvdXQgKz0gcGF0aC5qb2luKCc+JykgKyAnICcgKyBub2RlLmdldFRleHQodGhpcy5zcmMpO1xuICAgICAgICBvdXQgKz0gJ1xcbic7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHByaW50QWxsKGFzdDogdHMuTm9kZSA9IHRoaXMuc3JjKSB7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIGNyZWF0ZVByaW50Tm9kZUNiKHRydWUpKTtcbiAgfVxuXG4gIHByaW50QWxsTm9UeXBlKGFzdDogdHMuTm9kZSA9IHRoaXMuc3JjKSB7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIGNyZWF0ZVByaW50Tm9kZUNiKGZhbHNlKSk7XG4gIH1cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IFxuXHQgKiBAcGFyYW0gY2IgcmV0dXJuIHRydWUgdG8gc2tpcCB0cmF2ZXJzaW5nIGNoaWxkIG5vZGVcblx0ICogQHBhcmFtIGxldmVsIGRlZmF1bHQgMFxuXHQgKi9cbiAgdHJhdmVyc2UoYXN0OiB0cy5Ob2RlLFxuICAgIGNiOiB0cmF2ZXJzZUNiVHlwZSxcbiAgICBwcm9wTmFtZSA9ICcnLCBwYXJlbnRzOiB0cy5Ob2RlW10gPSBbXSwgcGF0aEVsczogc3RyaW5nW10gPSBbXSk6IHRydWUgfCB2b2lkIHtcblxuICAgIGxldCBuZWVkUG9wUGF0aEVsID0gZmFsc2U7XG5cbiAgICAvLyBpZiAoYXN0LmtpbmQgIT09IHRzLlN5bnRheEtpbmQuU291cmNlRmlsZSkge1xuICAgICAgLy8gbGV0IHByb3BOYW1lID0gcGFyZW50c1twYXJlbnRzLmxlbmd0aCAtIDFdID09PSB0aGlzLnNyYyA/ICcnIDogdGhpcy5fZmluZFBhcmVudFByb3BOYW1lKGFzdCwgcGFyZW50cyk7XG4gICAgbGV0IHBhdGhFbCA9ICc6JyArIHNrW2FzdC5raW5kXTtcbiAgICBpZiAocHJvcE5hbWUpXG4gICAgICBwYXRoRWwgPSAnLicgKyBwcm9wTmFtZSArIHBhdGhFbDtcbiAgICBwYXRoRWxzLnB1c2gocGF0aEVsKTtcblxuICAgIGNvbnN0IGNvbW1lbnRzID0gdGhpcy5zcmMuZ2V0RnVsbFRleHQoKS5zbGljZShhc3QuZ2V0U3RhcnQodGhpcy5zcmMsIHRydWUpLCBhc3QuZ2V0U3RhcnQoKSk7XG4gICAgbmVlZFBvcFBhdGhFbCA9IHRydWU7XG4gICAgLy8gfVxuXG4gICAgY29uc3QgcmVzID0gY2IoYXN0LCBwYXRoRWxzLCBwYXJlbnRzLCBhc3QuZ2V0Q2hpbGRDb3VudCh0aGlzLnNyYykgPD0gMCwgY29tbWVudHMpO1xuXG4gICAgaWYgKHJlcyAhPT0gdHJ1ZSkge1xuICAgICAgcGFyZW50cy5wdXNoKGFzdCk7XG4gICAgICBjb25zdCBfdmFsdWUya2V5ID0gbmV3IE1hcDxhbnksIHN0cmluZz4oKTtcblxuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOmZvcmluXG4gICAgICAvLyBmb3IgKGNvbnN0IGtleSBpbiBhc3QpIHtcbiAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5KTtcblxuICAgICAgLy8gZm9yIChjb25zdCBjaGlsZCBvZiBhc3QuZ2V0Q2hpbGRyZW4oKSkge1xuICAgICAgLy8gICBpZiAoKGNoaWxkIGFzIFN5bnRheExpc3QpLl9jaGlsZHJlbikge1xuICAgICAgLy8gICAgIC8vIGNvbnN0IHN1YkFycmF5ID0gKGNoaWxkIGFzIFN5bnRheExpc3QpLl9jaGlsZHJlbjtcbiAgICAgIC8vICAgICBjb250aW51ZTtcbiAgICAgIC8vICAgfSBlbHNlIHtcbiAgICAgIC8vICAgICBsZXQgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChjaGlsZCk7XG4gICAgICAvLyAgICAgaWYgKHByb3BOYW1lID09IG51bGwpIHtcbiAgICAgIC8vICAgICAgIGNyZWF0ZVZhbHVlMktleU1hcChhc3QsIF92YWx1ZTJrZXkpO1xuICAgICAgLy8gICAgICAgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChjaGlsZCk7XG4gICAgICAvLyAgICAgfVxuICAgICAgLy8gICAgIGNvbnN0IGlzU3RvcCA9IHNlbGYudHJhdmVyc2UoY2hpbGQsIGNiLCBwcm9wTmFtZSwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICAvLyAgICAgaWYgKGlzU3RvcCA9PT0gdHJ1ZSlcbiAgICAgIC8vICAgICAgIGJyZWFrO1xuICAgICAgLy8gICB9XG4gICAgICAvLyB9XG4gICAgICAvKipcbiAgICAgICAqIHRzLmZvckVhY2hDaGlsZCAob3IgYE5vZGUuZm9yRWFjaENoaWxkKClgKSBqdXN0IGNhbid0IGxpc3QgYWxsIHRoZSBjaGlsZHJlbiBsaWtlIHB1cmUgc3l0YXggdG9rZW5zLFxuICAgICAgICogc28gSSB1c2UgTm9kZS5nZXRDaGlsZHJlbmQoKSB0byBnZXQgYWxsIGNoaWxkIG5vZGVzLlxuICAgICAgICogXG4gICAgICAgKiBCdXQgdHMuZm9yRWFjaENoaWxkIGlzIHRoZSBvbmx5IGZ1bmN0aW9uIHdoaWNoIGNhbiBnZXQgZW1iZWRkZWQgYXJyYXkgY2hpbGRyZW4gbm9kZSBpbiBmb3JtIG9mIE5vZGVBcnJheSxcbiAgICAgICAqIHNvIEkgc3RpbGwgbmVlZCBpdCBoZXJlLlxuICAgICAgICovXG4gICAgICBhc3QuZm9yRWFjaENoaWxkKGNoaWxkID0+IHtcbiAgICAgICAgICBsZXQgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChjaGlsZCk7XG4gICAgICAgICAgaWYgKHByb3BOYW1lID09IG51bGwpIHtcbiAgICAgICAgICAgIGNyZWF0ZVZhbHVlMktleU1hcChhc3QsIF92YWx1ZTJrZXksIHRydWUpO1xuICAgICAgICAgICAgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChjaGlsZCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGlzU3RvcCA9IHNlbGYudHJhdmVyc2UoY2hpbGQsIGNiLCBwcm9wTmFtZSwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICAgICAgcmV0dXJuIGlzU3RvcCBhcyB1bmtub3duIGFzIHRydWUgfCB1bmRlZmluZWQ7XG4gICAgICAgICAgLy8gcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfSxcbiAgICAgICAgc3ViQXJyYXkgPT4ge1xuICAgICAgICAgIGxldCBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KHN1YkFycmF5KTtcbiAgICAgICAgICBpZiAocHJvcE5hbWUgPT0gbnVsbCkge1xuICAgICAgICAgICAgY3JlYXRlVmFsdWUyS2V5TWFwKGFzdCwgX3ZhbHVlMmtleSwgdHJ1ZSk7XG4gICAgICAgICAgICBwcm9wTmFtZSA9IF92YWx1ZTJrZXkuZ2V0KHN1YkFycmF5KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHNlbGYudHJhdmVyc2VBcnJheShzdWJBcnJheSwgY2IsIHByb3BOYW1lLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICAgIHBhcmVudHMucG9wKCk7XG4gICAgfVxuICAgIGlmIChuZWVkUG9wUGF0aEVsKVxuICAgICAgcGF0aEVscy5wb3AoKTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgcGF0aEZvckFzdChhc3Q6IHRzLk5vZGUsIHdpdGhUeXBlID0gdHJ1ZSk6IHN0cmluZyB7XG4gICAgY29uc3QgcGF0aEVsczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgcCA9IGFzdDtcbiAgICB3aGlsZSAocCkge1xuICAgICAgY29uc3QgcHJvcEV4cCA9IHRoaXMucHJvcE5hbWVGb3JBc3QocCk7XG4gICAgICBwYXRoRWxzLnB1c2goKHByb3BFeHAgPyAnLicgKyBwcm9wRXhwIDogJycpICsgKHdpdGhUeXBlID8gJzonICsgc2tbcC5raW5kXSA6ICcnKSk7XG4gICAgICBpZiAocCA9PT0gdGhpcy5zcmMpXG4gICAgICAgIGJyZWFrO1xuICAgICAgcCA9IHAucGFyZW50O1xuICAgIH1cbiAgICByZXR1cm4gcGF0aEVscy5yZXZlcnNlKCkuam9pbignPicpO1xuICB9XG5cbiAgcHJvdGVjdGVkIHByb3BOYW1lRm9yQXN0KGFzdDogdHMuTm9kZSk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IHAgPSBhc3QucGFyZW50O1xuICAgIGlmIChwID09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGNhY2hlZFByb3BlcnRpZXMgPSBhc3RTY2hlbWFDYWNoZVtwLmtpbmRdO1xuXG4gICAgbGV0IHByb3BlcnRpZXMgPSBjYWNoZWRQcm9wZXJ0aWVzO1xuICAgIGlmIChwcm9wZXJ0aWVzID09IG51bGwpIHtcbiAgICAgIGFzdFNjaGVtYUNhY2hlW3Aua2luZF0gPSBwcm9wZXJ0aWVzID0gT2JqZWN0LmtleXMocCk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBwcm9wIG9mIHByb3BlcnRpZXMpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gKHAgYXMgYW55KVtwcm9wXTtcbiAgICAgIGlmIChbJ3BhcmVudCcsICdraW5kJywgJ19jaGlsZHJlbicsICdwb3MnLCAnZW5kJ10uaW5jbHVkZXMocHJvcCkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9ICh2YWx1ZSBhcyBhbnlbXSkuaW5kZXhPZihhc3QpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICByZXR1cm4gcHJvcCArIGBbJHtpZHh9XWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gYXN0KSB7XG4gICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VBcnJheShub2RlczogdHMuTm9kZUFycmF5PHRzLk5vZGU+IHwgdHMuTm9kZVtdLFxuICAgIGNiOiAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4pID0+IHRydWUgfCB2b2lkLFxuICAgIHByb3BOYW1lID0gJycsIHBhcmVudHM6IHRzLk5vZGVbXSA9IFtdLCBwYXRoRWxzOiBzdHJpbmdbXSA9IFtdKTogdHJ1ZSB8IHVuZGVmaW5lZCB7XG5cbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBhc3Qgb2Ygbm9kZXMpIHtcbiAgICAgIGNvbnN0IGlzU3RvcCA9IHRoaXMudHJhdmVyc2UoYXN0LCBjYiwgcHJvcE5hbWUgKyBgWyR7aSsrfV1gLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICAgIGlmIChpc1N0b3ApXG4gICAgICAgIHJldHVybiBpc1N0b3AgYXMgdW5rbm93biBhcyB0cnVlIHwgdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0OiB0cy5Ob2RlLCB2YWx1ZTJLZXlNYXA6IE1hcDxhbnksIHN0cmluZz4sIHJlYnVpbGQgPSBmYWxzZSk6IHN0cmluZ1tdIHtcbiAgLy8gY29uc3QgcHJvcHMgPSBrZXlzSW4oYXN0KVxuICBsZXQgcHJvcHM6IHN0cmluZ1tdO1xuICBsZXQgY2FjaGVkID0gYXN0U2NoZW1hQ2FjaGVbYXN0LmtpbmRdO1xuXG4gIGlmIChyZWJ1aWxkIHx8IGNhY2hlZCA9PSBudWxsKSB7XG4gICAgICBwcm9wcyA9IE9iamVjdC5rZXlzKGFzdClcbiAgICAgIC5maWx0ZXIocHJvcCA9PiB0eXBlb2YgYXN0W3Byb3BdICE9PSAnZnVuY3Rpb24nICYmICFbJ3BhcmVudCcsICdraW5kJywgJ19jaGlsZHJlbicsICdwb3MnLCAnZW5kJ10uaW5jbHVkZXMocHJvcCkpO1xuICAgICAgaWYgKGNhY2hlZCA9PSBudWxsKSB7XG4gICAgICAgIGFzdFNjaGVtYUNhY2hlW2FzdC5raW5kXSA9IHByb3BzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gY2FjaGVkO1xuICAgICAgICBzY2hlbWEucHVzaCguLi5wcm9wcyk7XG4gICAgICAgIHVuaXEoc2NoZW1hKTtcbiAgICAgICAgcHJvcHMgPSBzY2hlbWE7XG4gICAgICB9XG4gIH0gZWxzZSB7XG4gICAgcHJvcHMgPSBjYWNoZWQ7XG4gIH1cbiAgZm9yIChjb25zdCBrZXkgb2YgcHJvcHMhKSB7XG4gICAgdmFsdWUyS2V5TWFwLnNldCgoYXN0IGFzIGFueSlba2V5XSwga2V5KTtcbiAgfVxuICByZXR1cm4gcHJvcHMhO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzdENoYXJhY3RlciB7XG4gIHByb3BlcnR5TmFtZT86IHN0cmluZztcbiAgcHJvcEluZGV4PzogbnVtYmVyO1xuICBraW5kPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFzdFF1ZXJ5IGV4dGVuZHMgQXN0Q2hhcmFjdGVyIHtcbiAgdGV4dD86IFJlZ0V4cDtcbn1cblxuZXhwb3J0IGNsYXNzIFF1ZXJ5IHtcbiAgcXVlcnlQYXRoczogQXN0Q2hhcmFjdGVyW11bXTsgLy8gaW4gcmV2ZXJzZWQgb3JkZXJcbiAgcHJpdmF0ZSBmcm9tUm9vdCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHF1ZXJ5OiBzdHJpbmcpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5LnRyaW0oKTtcbiAgICBpZiAocXVlcnkuc3RhcnRzV2l0aCgnXicpKSB7XG4gICAgICBxdWVyeSA9IHF1ZXJ5LnNsaWNlKDEpO1xuICAgICAgdGhpcy5mcm9tUm9vdCA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMucXVlcnlQYXRocyA9IHF1ZXJ5LnRyaW0oKVxuICAgICAgLnJlcGxhY2UoL1xccyo+XFxzKi9nLCAnPicpXG4gICAgICAuc3BsaXQoL1xccysvKVxuICAgICAgLm1hcChwYXRocyA9PiBwYXRocy5zcGxpdCgnPicpXG4gICAgICAgIC5tYXAoc2luZ2xlQXN0RGVzYyA9PiB0aGlzLl9wYXJzZURlc2Moc2luZ2xlQXN0RGVzYykpLnJldmVyc2UoKSlcbiAgICAgIC5yZXZlcnNlKCk7XG4gIH1cblxuICBtYXRjaGVzKHBhdGg6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gICAgbGV0IHRlc3RQb3MgPSBwYXRoLmxlbmd0aCAtIDE7XG4gICAgY29uc3Qgc3RhcnRUZXN0UG9zID0gdGVzdFBvcztcbiAgICBmb3IgKGNvbnN0IGNvbnNlY3V0aXZlTm9kZXMgb2YgdGhpcy5xdWVyeVBhdGhzLnNsaWNlKDApKSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBpZiAodGhpcy5tYXRjaGVzQ29uc2VjdXRpdmVOb2Rlcyhjb25zZWN1dGl2ZU5vZGVzLCBwYXRoLCB0ZXN0UG9zKSkge1xuICAgICAgICAgIHRlc3RQb3MgLT0gY29uc2VjdXRpdmVOb2Rlcy5sZW5ndGg7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSBpZiAodGVzdFBvcyA9PT0gc3RhcnRUZXN0UG9zKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRlc3RQb3MtLTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29uc2VjdXRpdmVOb2Rlcy5sZW5ndGggPiB0ZXN0UG9zICsgMSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmZyb21Sb290ID8gdGVzdFBvcyA9PT0gMCA6IHRydWU7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3BhcnNlRGVzYyhzaW5nbGVBc3REZXNjOiBzdHJpbmcpOiBBc3RRdWVyeSB7XG4gICAgY29uc3QgYXN0Q2hhcjogQXN0UXVlcnkgPSB7fTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZVxuXHRcdFx0bGV0IG0gPSAvXig/OlxcLihbYS16QS1aMC05XyRdKykoPzpcXFsoWzAtOV0qKVxcXSk/KT8oPzpcXDooW2EtekEtWjAtOV8kXSspKT8kfF5cXCokLy5leGVjKHNpbmdsZUFzdERlc2MpO1xuICAgICAgaWYgKG0gPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcXVlcnkgc3RyaW5nIFwiJHtjaGFsay55ZWxsb3coc2luZ2xlQXN0RGVzYyl9XCJgKTtcbiAgICAgIH1cbiAgICAgIGlmIChtWzFdKSB7XG4gICAgICAgIGFzdENoYXIucHJvcGVydHlOYW1lID0gbVsxXTtcbiAgICAgICAgaWYgKG1bMl0pXG4gICAgICAgICAgYXN0Q2hhci5wcm9wSW5kZXggPSBwYXJzZUludChtWzJdLCAxMCk7XG4gICAgICB9XG4gICAgICBpZiAobVszXSlcbiAgICAgICAgYXN0Q2hhci5raW5kID0gbVszXTtcbiAgICAgIC8vIGlmIChtWzRdKVxuICAgICAgLy8gXHRhc3RDaGFyLnRleHQgPSBuZXcgUmVnRXhwKG1bNF0pO1xuICAgICAgcmV0dXJuIGFzdENoYXI7XG4gIH1cblxuICBwcml2YXRlIG1hdGNoZXNBc3QocXVlcnk6IEFzdFF1ZXJ5LCB0YXJnZXQ6IEFzdENoYXJhY3Rlcik6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHF1ZXJ5KSkge1xuICAgICAgY29uc3QgdmFsdWUgPSAocXVlcnkgYXMgYW55KVtrZXldO1xuICAgICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgICBpZiAoISh2YWx1ZSBhcyBSZWdFeHApLnRlc3QoKHRhcmdldCBhcyBhbnkpW2tleV0pKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoKHRhcmdldCBhcyBhbnkpW2tleV0gIT09IHZhbHVlKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIHByZWRpY3RlIGlmIGl0IG1hdGNoZXMgXCI+XCIgY29ubmVjdGVkIHBhdGggZXhwcmVzc2lvbiBcbiAgICogQHBhcmFtIHF1ZXJ5Tm9kZXMgYWxsIGl0ZW1zIGluIHJldmVyc2VkIG9yZGVyXG4gICAqIEBwYXJhbSBwYXRoIFxuICAgKiBAcGFyYW0gdGVzdFBvcyBzdGFydHMgd2l0aCBwYXRoLmxlbmd0aCAtIDFcbiAgICovXG4gIHByaXZhdGUgbWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMocXVlcnlOb2RlczogQXN0Q2hhcmFjdGVyW10sIHBhdGg6IHN0cmluZ1tdLCB0ZXN0UG9zOiBudW1iZXIpIHtcbiAgICBpZiAocXVlcnlOb2Rlcy5sZW5ndGggPiB0ZXN0UG9zICsgMSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHF1ZXJ5IG9mIHF1ZXJ5Tm9kZXMuc2xpY2UoMCkpIHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IHRoaXMuX3BhcnNlRGVzYyhwYXRoW3Rlc3RQb3MtLV0pO1xuICAgICAgaWYgKCF0aGlzLm1hdGNoZXNBc3QocXVlcnksIHRhcmdldCkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn1cbiJdfQ==