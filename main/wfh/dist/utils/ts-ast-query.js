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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtYXN0LXF1ZXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvdXRpbHMvdHMtYXN0LXF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsc0NBQXNDO0FBQ3RDLCtEQUF1QztBQUN2Qyx1REFBK0I7QUFFL0IseURBQ3FCO0FBQ3JCLGtEQUEwQjtBQUVmLFFBQUEsY0FBYyxHQUErQixFQUFFLENBQUM7QUFDM0Qsd0JBQXdCO0FBQ3hCLHdCQUF3QjtBQUV4QixTQUFnQixvQkFBb0IsQ0FBQyxJQUFZO0lBQy9DLEVBQUUsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsc0JBQWMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFnQixtQkFBbUIsQ0FBQyxLQUE0QjtJQUM5RCxzQkFBYyxHQUFHLEtBQUssQ0FBQztBQUN6QixDQUFDO0FBRkQsa0RBRUM7QUFVRCxTQUFnQixTQUFTLENBQUMsSUFBWSxFQUFFLEtBQXFCLEVBQUUsUUFBUSxHQUFHLElBQUk7SUFDNUUsSUFBSSxLQUFLLEVBQUU7UUFDVCxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNuRSxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDL0MsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FDcEIsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFD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QUFDO0NBQ0Y7QUFyRkQsc0JBcUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuLy8gaW1wb3J0IGtleXNJbiBmcm9tICdsb2Rhc2gva2V5c0luJztcbmltcG9ydCBpc1JlZ0V4cCBmcm9tICdsb2Rhc2gvaXNSZWdFeHAnO1xuaW1wb3J0IHVuaXEgZnJvbSAnbG9kYXNoL3VuaXEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB0cywgeyBTeW50YXhLaW5kIGFzIHNrLy8gLCBTeW50YXhMaXN0XG4gfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBsZXQgYXN0U2NoZW1hQ2FjaGU6IHtba2luZDogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG4vLyBsZXQgZmlsZUNvdW50aW5nID0gMDtcbi8vIGxldCBsYXN0RmlsZTogc3RyaW5nO1xuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUFzdFByb3BlcnR5Q2FjaGUoZmlsZTogc3RyaW5nKSB7XG4gIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgSlNPTi5zdHJpbmdpZnkoYXN0U2NoZW1hQ2FjaGUsIG51bGwsICcgICcpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEFzdFByb3BlcnR5Q2FjaGUoY2FjaGU6IHR5cGVvZiBhc3RTY2hlbWFDYWNoZSkge1xuICBhc3RTY2hlbWFDYWNoZSA9IGNhY2hlO1xufVxuXG5leHBvcnQgdHlwZSBBc3RIYW5kbGVyPFQ+ID0gKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM6IHRzLk5vZGVbXSwgaXNMZWFmOiBib29sZWFuKSA9PiBUO1xuXG4vKipcbiAqIFJldHVybiB0cnVldGh5IHZhbHVlIHRoYXQgaXRlcmF0aW9uIHN0b3BzLlxuICovXG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuZXhwb3J0IHR5cGUgdHJhdmVyc2VDYlR5cGUgPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4sIGNvbW1lbnQ/OiBzdHJpbmcpID0+IHRydWUgfCB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRGaWxlKGZpbGU6IHN0cmluZywgcXVlcnk/OiBzdHJpbmcgfCBudWxsLCB3aXRoVHlwZSA9IHRydWUpIHtcbiAgaWYgKHF1ZXJ5KSB7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIHNlbGVjdG9yLmZpbmRNYXBUbyhxdWVyeSwgKGFzdCwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5jeWFuKFxuICAgICAgICB3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChlbCA9PiBlbC5zbGljZSgwLCBlbC5pbmRleE9mKCc6JykpKS5qb2luKCcgPiAnKVxuICAgICAgKSk7XG4gICAgICBzZWxlY3Rvci50cmF2ZXJzZShhc3QsIGNyZWF0ZVByaW50Tm9kZUNiKHdpdGhUeXBlKSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHdpdGhUeXBlKVxuICAgICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbCgpO1xuICAgIGVsc2VcbiAgICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGxOb1R5cGUoKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhhc3RTY2hlbWFDYWNoZSk7XG59XG5mdW5jdGlvbiBjcmVhdGVQcmludE5vZGVDYih3aXRoVHlwZTogYm9vbGVhbikge1xuICBjb25zdCBwcmludE5vZGU6IHRyYXZlcnNlQ2JUeXBlID0gKGNoaWxkLCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYsIGNvbW1lbnQpID0+IHtcbiAgICBpZiAoY29tbWVudCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgKHdpdGhUeXBlID8gcGF0aC5qb2luKCcgPiAnKSA6IHBhdGgubWFwKGVsID0+IGVsLnNsaWNlKDAsIGVsLmluZGV4T2YoJzonKSkpLmpvaW4oJyA+ICcpKSArXG4gICAgICAgICAgYCAke2NoYWxrLnllbGxvdyhjb21tZW50KX1gXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWlzTGVhZilcbiAgICAgIHJldHVybjtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICh3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChlbCA9PiBlbC5zbGljZSgwLCBlbC5pbmRleE9mKCc6JykpKS5qb2luKCcgPiAnKSkgK1xuICAgICAgICBgICR7Y2hhbGsuZ3JlZW5CcmlnaHQoY2hpbGQuZ2V0VGV4dCgpKX1gXG4gICAgKTtcbiAgfTtcbiAgcmV0dXJuIHByaW50Tm9kZTtcbn1cblxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtDYWxsYmFjayB7XG4gIHF1ZXJ5OiBzdHJpbmc7XG4gIGNhbGxiYWNrOiAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50cz86IHRzLk5vZGVbXSkgPT4gdHJ1ZSB8IHZvaWQ7XG59XG4vLyB0eXBlIENhbGxiYWNrID0gKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10pID0+IGJvb2xlYW4gfCB2b2lkO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VsZWN0b3Ige1xuICBzcmM6IHRzLlNvdXJjZUZpbGU7XG5cbiAgY29uc3RydWN0b3Ioc3JjOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk7XG4gIGNvbnN0cnVjdG9yKHNyYzogdHMuU291cmNlRmlsZSk7XG4gIGNvbnN0cnVjdG9yKHNyYzogdHMuU291cmNlRmlsZSB8IHN0cmluZywgZmlsZT86IHN0cmluZykge1xuICAgIC8vIGlmIChmaWxlKSB7XG4gICAgLy8gICBpZiAoZmlsZSA9PT0gbGFzdEZpbGUpIHtcbiAgICAvLyAgICAgZGVidWdnZXI7XG4gICAgLy8gICB9XG4gICAgLy8gICBsYXN0RmlsZSA9IGZpbGU7XG4gICAgLy8gfVxuICAgIC8vIGNvbnNvbGUubG9nKGBOby4gJHsrK2ZpbGVDb3VudGluZ30gJHtjaGFsay5yZWQoZmlsZSB8fCAndW5rbm93bicpfSBzY2hlbWEgc2l6ZTogJHtfLnNpemUoYXN0U2NoZW1hQ2FjaGUpfWApO1xuICAgIGlmICh0eXBlb2Ygc3JjID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5zcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUgfHwgJ3Vua25vd24nLCBzcmMsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zcmMgPSBzcmM7XG4gICAgfVxuICB9XG5cbiAgd2Fsa0FzdChoYW5kbGVyczogV2Fsa0NhbGxiYWNrW10pOiB2b2lkO1xuICB3YWxrQXN0KGFzdDogdHMuTm9kZSwgaGFuZGxlcnM6IFdhbGtDYWxsYmFja1tdKTogdm9pZDtcbiAgd2Fsa0FzdChhc3Q6IHRzLk5vZGV8V2Fsa0NhbGxiYWNrW10gLCBoYW5kbGVycz86IFdhbGtDYWxsYmFja1tdKTogdm9pZCB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXN0KSkge1xuICAgICAgaGFuZGxlcnMgPSBhc3Q7XG4gICAgICBhc3QgPSB0aGlzLnNyYztcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeU1hcDoge1tzdHI6IHN0cmluZ106IFF1ZXJ5fSA9IHt9O1xuICAgIGlmICghaGFuZGxlcnMpXG4gICAgICByZXR1cm47XG4gICAgaGFuZGxlcnMuZm9yRWFjaChoID0+IHF1ZXJ5TWFwW2gucXVlcnldID0gbmV3IFF1ZXJ5KGgucXVlcnkpKTtcblxuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICBsZXQgc2tpcCA9IGZhbHNlO1xuICAgICAgaGFuZGxlcnMhLnNvbWUoaCA9PiB7XG4gICAgICAgIGlmIChxdWVyeU1hcFtoLnF1ZXJ5XS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgICAgaC5jYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHNraXApXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gcXVlcnkgTGlrZSBDU1Mgc2VsZWN0IDo9IFtcIl5cIl0gPHNlbGVjdG9yIGVsZW1lbnQ+IChcIiBcIiB8IFwiPlwiKSA8c2VsZWN0b3IgZWxlbWVudD5cblx0ICogICB3aGVyZSA8c2VsZWN0b3IgZWxlbWVudD4gOj0gXCIuXCIgPHByb3BlcnR5IG5hbWU+IDxpbmRleD4/IHwgXCI6XCIgPFR5cGVzY3JpcHQgU3ludGF4IGtpbmQgbmFtZT4gfCAqXG5cdCAqICAgd2hlcmUgPGluZGV4PiA6PSBcIltcIiBcIjBcIi1cIjlcIiBcIl1cIlxuICAgKiBcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gXi5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuICAgKiBCZWdpbmluZyB3aXRoIFwiXlwiIG1lYW5zIHN0cmljdGx5IGNvbXBhcmluZyBmcm9tIGZpcnN0IHF1ZXJpZWQgQVNUIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIFxuXHQgKi9cbiAgZmluZE1hcFRvPFQ+KHF1ZXJ5OiBzdHJpbmcsIGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+KTogVCB8IG51bGw7XG4gIGZpbmRNYXBUbzxUPihhc3Q6IHRzLk5vZGUsIHF1ZXJ5OiBzdHJpbmcsIGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+KTogVCB8IG51bGw7XG4gIGZpbmRNYXBUbzxUPiguLi5hcmc6IGFueVtdKTogVCB8IG51bGwge1xuICAgIGxldCBxdWVyeTogc3RyaW5nO1xuICAgIGxldCBhc3Q6IHRzLk5vZGU7XG4gICAgbGV0IGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+O1xuICAgIGlmICh0eXBlb2YgYXJnWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgICBxdWVyeSA9IGFyZ1swXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICBhc3QgPSBhcmdbMF07XG4gICAgICBxdWVyeSA9IGFyZ1sxXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzJdO1xuICAgIH1cbiAgICBsZXQgcmVzOiBUIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcSA9IG5ldyBRdWVyeShxdWVyeSEpO1xuXG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZikgPT4ge1xuICAgICAgaWYgKHJlcyAhPSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzID0gY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYpO1xuICAgICAgICBpZiAocmVzICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEFsbChxdWVyeTogc3RyaW5nKTogdHMuTm9kZVtdO1xuICBmaW5kQWxsKGFzdDogdHMuTm9kZSwgcXVlcnk6IHN0cmluZyk6IHRzLk5vZGVbXTtcbiAgZmluZEFsbChhc3Q6IHRzLk5vZGUgfCBzdHJpbmcsIHF1ZXJ5Pzogc3RyaW5nKTogdHMuTm9kZVtdIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkoYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICBxID0gbmV3IFF1ZXJ5KHF1ZXJ5ISk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzOiB0cy5Ob2RlW10gPSBbXTtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgX3BhcmVudHMsIF9pc0xlYWYpID0+IHtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzLnB1c2goYXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEZpcnN0KHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmaW5kRmlyc3QoYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nKTogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgZmluZEZpcnN0KGFzdDogdHMuTm9kZSB8IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkpO1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkhKTtcbiAgICB9XG4gICAgbGV0IHJlczogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCkgPT4ge1xuICAgICAgaWYgKHJlcylcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBpZiAocS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIHJlcyA9IGFzdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGxpc3QoYXN0OiB0cy5Ob2RlID0gdGhpcy5zcmMpIHtcbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChub2RlLCBwYXRoLCBfcGFyZW50cywgbm9DaGlsZCkgPT4ge1xuICAgICAgaWYgKG5vQ2hpbGQpIHtcbiAgICAgICAgb3V0ICs9IHBhdGguam9pbignPicpICsgJyAnICsgbm9kZS5nZXRUZXh0KHRoaXMuc3JjKTtcbiAgICAgICAgb3V0ICs9ICdcXG4nO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwcmludEFsbChhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYih0cnVlKSk7XG4gIH1cblxuICBwcmludEFsbE5vVHlwZShhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYihmYWxzZSkpO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCBcblx0ICogQHBhcmFtIGNiIHJldHVybiB0cnVlIHRvIHNraXAgdHJhdmVyc2luZyBjaGlsZCBub2RlXG5cdCAqIEBwYXJhbSBsZXZlbCBkZWZhdWx0IDBcblx0ICovXG4gIHRyYXZlcnNlKGFzdDogdHMuTm9kZSxcbiAgICBjYjogdHJhdmVyc2VDYlR5cGUsXG4gICAgcHJvcE5hbWUgPSAnJywgcGFyZW50czogdHMuTm9kZVtdID0gW10sIHBhdGhFbHM6IHN0cmluZ1tdID0gW10pOiB0cnVlIHwgdm9pZCB7XG5cbiAgICBsZXQgbmVlZFBvcFBhdGhFbCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKGFzdC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGUpIHtcbiAgICAgIC8vIGxldCBwcm9wTmFtZSA9IHBhcmVudHNbcGFyZW50cy5sZW5ndGggLSAxXSA9PT0gdGhpcy5zcmMgPyAnJyA6IHRoaXMuX2ZpbmRQYXJlbnRQcm9wTmFtZShhc3QsIHBhcmVudHMpO1xuICAgIGxldCBwYXRoRWwgPSAnOicgKyBza1thc3Qua2luZF07XG4gICAgaWYgKHByb3BOYW1lKVxuICAgICAgcGF0aEVsID0gJy4nICsgcHJvcE5hbWUgKyBwYXRoRWw7XG4gICAgcGF0aEVscy5wdXNoKHBhdGhFbCk7XG5cbiAgICBjb25zdCBjb21tZW50cyA9IHRoaXMuc3JjLmdldEZ1bGxUZXh0KCkuc2xpY2UoYXN0LmdldFN0YXJ0KHRoaXMuc3JjLCB0cnVlKSwgYXN0LmdldFN0YXJ0KCkpO1xuICAgIG5lZWRQb3BQYXRoRWwgPSB0cnVlO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IHJlcyA9IGNiKGFzdCwgcGF0aEVscywgcGFyZW50cywgYXN0LmdldENoaWxkQ291bnQodGhpcy5zcmMpIDw9IDAsIGNvbW1lbnRzKTtcblxuICAgIGlmIChyZXMgIT09IHRydWUpIHtcbiAgICAgIHBhcmVudHMucHVzaChhc3QpO1xuICAgICAgY29uc3QgX3ZhbHVlMmtleSA9IG5ldyBNYXA8YW55LCBzdHJpbmc+KCk7XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpmb3JpblxuICAgICAgLy8gZm9yIChjb25zdCBrZXkgaW4gYXN0KSB7XG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgY3JlYXRlVmFsdWUyS2V5TWFwKGFzdCwgX3ZhbHVlMmtleSk7XG5cbiAgICAgIC8vIGZvciAoY29uc3QgY2hpbGQgb2YgYXN0LmdldENoaWxkcmVuKCkpIHtcbiAgICAgIC8vICAgaWYgKChjaGlsZCBhcyBTeW50YXhMaXN0KS5fY2hpbGRyZW4pIHtcbiAgICAgIC8vICAgICAvLyBjb25zdCBzdWJBcnJheSA9IChjaGlsZCBhcyBTeW50YXhMaXN0KS5fY2hpbGRyZW47XG4gICAgICAvLyAgICAgY29udGludWU7XG4gICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAvLyAgICAgbGV0IHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgLy8gICAgIGlmIChwcm9wTmFtZSA9PSBudWxsKSB7XG4gICAgICAvLyAgICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5KTtcbiAgICAgIC8vICAgICAgIHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBjb25zdCBpc1N0b3AgPSBzZWxmLnRyYXZlcnNlKGNoaWxkLCBjYiwgcHJvcE5hbWUsIHBhcmVudHMsIHBhdGhFbHMpO1xuICAgICAgLy8gICAgIGlmIChpc1N0b3AgPT09IHRydWUpXG4gICAgICAvLyAgICAgICBicmVhaztcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfVxuICAgICAgLyoqXG4gICAgICAgKiB0cy5mb3JFYWNoQ2hpbGQgKG9yIGBOb2RlLmZvckVhY2hDaGlsZCgpYCkganVzdCBjYW4ndCBsaXN0IGFsbCB0aGUgY2hpbGRyZW4gbGlrZSBwdXJlIHN5dGF4IHRva2VucyxcbiAgICAgICAqIHNvIEkgdXNlIE5vZGUuZ2V0Q2hpbGRyZW5kKCkgdG8gZ2V0IGFsbCBjaGlsZCBub2Rlcy5cbiAgICAgICAqIFxuICAgICAgICogQnV0IHRzLmZvckVhY2hDaGlsZCBpcyB0aGUgb25seSBmdW5jdGlvbiB3aGljaCBjYW4gZ2V0IGVtYmVkZGVkIGFycmF5IGNoaWxkcmVuIG5vZGUgaW4gZm9ybSBvZiBOb2RlQXJyYXksXG4gICAgICAgKiBzbyBJIHN0aWxsIG5lZWQgaXQgaGVyZS5cbiAgICAgICAqL1xuICAgICAgYXN0LmZvckVhY2hDaGlsZChjaGlsZCA9PiB7XG4gICAgICAgICAgbGV0IHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgICAgIGlmIChwcm9wTmFtZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5LCB0cnVlKTtcbiAgICAgICAgICAgIHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpc1N0b3AgPSBzZWxmLnRyYXZlcnNlKGNoaWxkLCBjYiwgcHJvcE5hbWUsIHBhcmVudHMsIHBhdGhFbHMpO1xuICAgICAgICAgIHJldHVybiBpc1N0b3AgYXMgdW5rbm93biBhcyB0cnVlIHwgdW5kZWZpbmVkO1xuICAgICAgICAgIC8vIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHN1YkFycmF5ID0+IHtcbiAgICAgICAgICBsZXQgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChzdWJBcnJheSk7XG4gICAgICAgICAgaWYgKHByb3BOYW1lID09IG51bGwpIHtcbiAgICAgICAgICAgIGNyZWF0ZVZhbHVlMktleU1hcChhc3QsIF92YWx1ZTJrZXksIHRydWUpO1xuICAgICAgICAgICAgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChzdWJBcnJheSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLnRyYXZlcnNlQXJyYXkoc3ViQXJyYXksIGNiLCBwcm9wTmFtZSwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICBwYXJlbnRzLnBvcCgpO1xuICAgIH1cbiAgICBpZiAobmVlZFBvcFBhdGhFbClcbiAgICAgIHBhdGhFbHMucG9wKCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHBhdGhGb3JBc3QoYXN0OiB0cy5Ob2RlLCB3aXRoVHlwZSA9IHRydWUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGhFbHM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHAgPSBhc3Q7XG4gICAgd2hpbGUgKHApIHtcbiAgICAgIGNvbnN0IHByb3BFeHAgPSB0aGlzLnByb3BOYW1lRm9yQXN0KHApO1xuICAgICAgcGF0aEVscy5wdXNoKChwcm9wRXhwID8gJy4nICsgcHJvcEV4cCA6ICcnKSArICh3aXRoVHlwZSA/ICc6JyArIHNrW3Aua2luZF0gOiAnJykpO1xuICAgICAgaWYgKHAgPT09IHRoaXMuc3JjKVxuICAgICAgICBicmVhaztcbiAgICAgIHAgPSBwLnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGhFbHMucmV2ZXJzZSgpLmpvaW4oJz4nKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcm9wTmFtZUZvckFzdChhc3Q6IHRzLk5vZGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBwID0gYXN0LnBhcmVudDtcbiAgICBpZiAocCA9PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBjYWNoZWRQcm9wZXJ0aWVzID0gYXN0U2NoZW1hQ2FjaGVbcC5raW5kXTtcblxuICAgIGxldCBwcm9wZXJ0aWVzID0gY2FjaGVkUHJvcGVydGllcztcbiAgICBpZiAocHJvcGVydGllcyA9PSBudWxsKSB7XG4gICAgICBhc3RTY2hlbWFDYWNoZVtwLmtpbmRdID0gcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKHApO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IChwIGFzIGFueSlbcHJvcF07XG4gICAgICBpZiAoWydwYXJlbnQnLCAna2luZCcsICdfY2hpbGRyZW4nLCAncG9zJywgJ2VuZCddLmluY2x1ZGVzKHByb3ApKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBjb25zdCBpZHggPSAodmFsdWUgYXMgYW55W10pLmluZGV4T2YoYXN0KTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3AgKyBgWyR7aWR4fV1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodmFsdWUgPT09IGFzdCkge1xuICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgcHJvdGVjdGVkIHRyYXZlcnNlQXJyYXkobm9kZXM6IHRzLk5vZGVBcnJheTx0cy5Ob2RlPiB8IHRzLk5vZGVbXSxcbiAgICBjYjogKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM6IHRzLk5vZGVbXSwgaXNMZWFmOiBib29sZWFuKSA9PiB0cnVlIHwgdm9pZCxcbiAgICBwcm9wTmFtZSA9ICcnLCBwYXJlbnRzOiB0cy5Ob2RlW10gPSBbXSwgcGF0aEVsczogc3RyaW5nW10gPSBbXSk6IHRydWUgfCB1bmRlZmluZWQge1xuXG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgYXN0IG9mIG5vZGVzKSB7XG4gICAgICBjb25zdCBpc1N0b3AgPSB0aGlzLnRyYXZlcnNlKGFzdCwgY2IsIHByb3BOYW1lICsgYFske2krK31dYCwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICBpZiAoaXNTdG9wKVxuICAgICAgICByZXR1cm4gaXNTdG9wIGFzIHVua25vd24gYXMgdHJ1ZSB8IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmFsdWUyS2V5TWFwKGFzdDogdHMuTm9kZSwgdmFsdWUyS2V5TWFwOiBNYXA8YW55LCBzdHJpbmc+LCByZWJ1aWxkID0gZmFsc2UpOiBzdHJpbmdbXSB7XG4gIC8vIGNvbnN0IHByb3BzID0ga2V5c0luKGFzdClcbiAgbGV0IHByb3BzOiBzdHJpbmdbXTtcbiAgbGV0IGNhY2hlZCA9IGFzdFNjaGVtYUNhY2hlW2FzdC5raW5kXTtcblxuICBpZiAocmVidWlsZCB8fCBjYWNoZWQgPT0gbnVsbCkge1xuICAgICAgcHJvcHMgPSBPYmplY3Qua2V5cyhhc3QpXG4gICAgICAuZmlsdGVyKHByb3AgPT4gdHlwZW9mIGFzdFtwcm9wXSAhPT0gJ2Z1bmN0aW9uJyAmJiAhWydwYXJlbnQnLCAna2luZCcsICdfY2hpbGRyZW4nLCAncG9zJywgJ2VuZCddLmluY2x1ZGVzKHByb3ApKTtcbiAgICAgIGlmIChjYWNoZWQgPT0gbnVsbCkge1xuICAgICAgICBhc3RTY2hlbWFDYWNoZVthc3Qua2luZF0gPSBwcm9wcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IGNhY2hlZDtcbiAgICAgICAgc2NoZW1hLnB1c2goLi4ucHJvcHMpO1xuICAgICAgICB1bmlxKHNjaGVtYSk7XG4gICAgICAgIHByb3BzID0gc2NoZW1hO1xuICAgICAgfVxuICB9IGVsc2Uge1xuICAgIHByb3BzID0gY2FjaGVkO1xuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIHByb3BzISkge1xuICAgIHZhbHVlMktleU1hcC5zZXQoKGFzdCBhcyBhbnkpW2tleV0sIGtleSk7XG4gIH1cbiAgcmV0dXJuIHByb3BzITtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RDaGFyYWN0ZXIge1xuICBwcm9wZXJ0eU5hbWU/OiBzdHJpbmc7XG4gIHByb3BJbmRleD86IG51bWJlcjtcbiAga2luZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RRdWVyeSBleHRlbmRzIEFzdENoYXJhY3RlciB7XG4gIHRleHQ/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBjbGFzcyBRdWVyeSB7XG4gIHF1ZXJ5UGF0aHM6IEFzdENoYXJhY3RlcltdW107IC8vIGluIHJldmVyc2VkIG9yZGVyXG4gIHByaXZhdGUgZnJvbVJvb3QgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihxdWVyeTogc3RyaW5nKSB7XG4gICAgcXVlcnkgPSBxdWVyeS50cmltKCk7XG4gICAgaWYgKHF1ZXJ5LnN0YXJ0c1dpdGgoJ14nKSkge1xuICAgICAgcXVlcnkgPSBxdWVyeS5zbGljZSgxKTtcbiAgICAgIHRoaXMuZnJvbVJvb3QgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnF1ZXJ5UGF0aHMgPSBxdWVyeS50cmltKClcbiAgICAgIC5yZXBsYWNlKC9cXHMqPlxccyovZywgJz4nKVxuICAgICAgLnNwbGl0KC9cXHMrLylcbiAgICAgIC5tYXAocGF0aHMgPT4gcGF0aHMuc3BsaXQoJz4nKVxuICAgICAgICAubWFwKHNpbmdsZUFzdERlc2MgPT4gdGhpcy5fcGFyc2VEZXNjKHNpbmdsZUFzdERlc2MpKS5yZXZlcnNlKCkpXG4gICAgICAucmV2ZXJzZSgpO1xuICB9XG5cbiAgbWF0Y2hlcyhwYXRoOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICAgIGxldCB0ZXN0UG9zID0gcGF0aC5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHN0YXJ0VGVzdFBvcyA9IHRlc3RQb3M7XG4gICAgZm9yIChjb25zdCBjb25zZWN1dGl2ZU5vZGVzIG9mIHRoaXMucXVlcnlQYXRocy5zbGljZSgwKSkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgaWYgKHRoaXMubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoY29uc2VjdXRpdmVOb2RlcywgcGF0aCwgdGVzdFBvcykpIHtcbiAgICAgICAgICB0ZXN0UG9zIC09IGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKHRlc3RQb3MgPT09IHN0YXJ0VGVzdFBvcykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0ZXN0UG9zLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoID4gdGVzdFBvcyArIDEpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mcm9tUm9vdCA/IHRlc3RQb3MgPT09IDAgOiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9wYXJzZURlc2Moc2luZ2xlQXN0RGVzYzogc3RyaW5nKTogQXN0UXVlcnkge1xuICAgIGNvbnN0IGFzdENoYXI6IEFzdFF1ZXJ5ID0ge307XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdGxldCBtID0gL14oPzpcXC4oW2EtekEtWjAtOV8kXSspKD86XFxbKFswLTldKilcXF0pPyk/KD86XFw6KFthLXpBLVowLTlfJF0rKSk/JHxeXFwqJC8uZXhlYyhzaW5nbGVBc3REZXNjKTtcbiAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHF1ZXJ5IHN0cmluZyBcIiR7Y2hhbGsueWVsbG93KHNpbmdsZUFzdERlc2MpfVwiYCk7XG4gICAgICB9XG4gICAgICBpZiAobVsxXSkge1xuICAgICAgICBhc3RDaGFyLnByb3BlcnR5TmFtZSA9IG1bMV07XG4gICAgICAgIGlmIChtWzJdKVxuICAgICAgICAgIGFzdENoYXIucHJvcEluZGV4ID0gcGFyc2VJbnQobVsyXSwgMTApO1xuICAgICAgfVxuICAgICAgaWYgKG1bM10pXG4gICAgICAgIGFzdENoYXIua2luZCA9IG1bM107XG4gICAgICAvLyBpZiAobVs0XSlcbiAgICAgIC8vIFx0YXN0Q2hhci50ZXh0ID0gbmV3IFJlZ0V4cChtWzRdKTtcbiAgICAgIHJldHVybiBhc3RDaGFyO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaGVzQXN0KHF1ZXJ5OiBBc3RRdWVyeSwgdGFyZ2V0OiBBc3RDaGFyYWN0ZXIpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhxdWVyeSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gKHF1ZXJ5IGFzIGFueSlba2V5XTtcbiAgICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCEodmFsdWUgYXMgUmVnRXhwKS50ZXN0KCh0YXJnZXQgYXMgYW55KVtrZXldKSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKCh0YXJnZXQgYXMgYW55KVtrZXldICE9PSB2YWx1ZSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBwcmVkaWN0ZSBpZiBpdCBtYXRjaGVzIFwiPlwiIGNvbm5lY3RlZCBwYXRoIGV4cHJlc3Npb24gXG4gICAqIEBwYXJhbSBxdWVyeU5vZGVzIGFsbCBpdGVtcyBpbiByZXZlcnNlZCBvcmRlclxuICAgKiBAcGFyYW0gcGF0aCBcbiAgICogQHBhcmFtIHRlc3RQb3Mgc3RhcnRzIHdpdGggcGF0aC5sZW5ndGggLSAxXG4gICAqL1xuICBwcml2YXRlIG1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKHF1ZXJ5Tm9kZXM6IEFzdENoYXJhY3RlcltdLCBwYXRoOiBzdHJpbmdbXSwgdGVzdFBvczogbnVtYmVyKSB7XG4gICAgaWYgKHF1ZXJ5Tm9kZXMubGVuZ3RoID4gdGVzdFBvcyArIDEpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCBxdWVyeSBvZiBxdWVyeU5vZGVzLnNsaWNlKDApKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLl9wYXJzZURlc2MocGF0aFt0ZXN0UG9zLS1dKTtcbiAgICAgIGlmICghdGhpcy5tYXRjaGVzQXN0KHF1ZXJ5LCB0YXJnZXQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=