"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
// import keysIn from 'lodash/keysIn';
const isRegExp_1 = tslib_1.__importDefault(require("lodash/isRegExp"));
const uniq_1 = tslib_1.__importDefault(require("lodash/uniq"));
const typescript_1 = tslib_1.__importStar(require("typescript"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvdHMtYXN0LXF1ZXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUF5QjtBQUN6QixzQ0FBc0M7QUFDdEMsdUVBQXVDO0FBQ3ZDLCtEQUErQjtBQUUvQixpRUFDcUI7QUFDckIsMERBQTBCO0FBRWYsUUFBQSxjQUFjLEdBQStCLEVBQUUsQ0FBQztBQUMzRCx3QkFBd0I7QUFDeEIsd0JBQXdCO0FBRXhCLFNBQWdCLG9CQUFvQixDQUFDLElBQVk7SUFDL0MsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQkFBYyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFGRCxvREFFQztBQUVELFNBQWdCLG1CQUFtQixDQUFDLEtBQTRCO0lBQzlELHNCQUFjLEdBQUcsS0FBSyxDQUFDO0FBQ3pCLENBQUM7QUFGRCxrREFFQztBQVNELFNBQWdCLFNBQVMsQ0FBQyxJQUFZLEVBQUUsS0FBcUIsRUFBRSxRQUFRLEdBQUcsSUFBSTtJQUM1RSxJQUFJLEtBQUssRUFBRTtRQUNULE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25FLFFBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUMvQyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUNwQixRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFB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cmVidWlsZC9kaXN0L3RzLWFzdC1xdWVyeS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbi8vIGltcG9ydCBrZXlzSW4gZnJvbSAnbG9kYXNoL2tleXNJbic7XG5pbXBvcnQgaXNSZWdFeHAgZnJvbSAnbG9kYXNoL2lzUmVnRXhwJztcbmltcG9ydCB1bmlxIGZyb20gJ2xvZGFzaC91bmlxJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdHMsIHsgU3ludGF4S2luZCBhcyBzay8vICwgU3ludGF4TGlzdFxuIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQgbGV0IGFzdFNjaGVtYUNhY2hlOiB7W2tpbmQ6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuLy8gbGV0IGZpbGVDb3VudGluZyA9IDA7XG4vLyBsZXQgbGFzdEZpbGU6IHN0cmluZztcblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVBc3RQcm9wZXJ0eUNhY2hlKGZpbGU6IHN0cmluZykge1xuICBmcy53cml0ZUZpbGVTeW5jKGZpbGUsIEpTT04uc3RyaW5naWZ5KGFzdFNjaGVtYUNhY2hlLCBudWxsLCAnICAnKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRBc3RQcm9wZXJ0eUNhY2hlKGNhY2hlOiB0eXBlb2YgYXN0U2NoZW1hQ2FjaGUpIHtcbiAgYXN0U2NoZW1hQ2FjaGUgPSBjYWNoZTtcbn1cblxuZXhwb3J0IHR5cGUgQXN0SGFuZGxlcjxUPiA9IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzOiB0cy5Ob2RlW10sIGlzTGVhZjogYm9vbGVhbikgPT4gVDtcblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZXRoeSB2YWx1ZSB0aGF0IGl0ZXJhdGlvbiBzdG9wcy5cbiAqL1xuZXhwb3J0IHR5cGUgdHJhdmVyc2VDYlR5cGUgPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4sIGNvbW1lbnQ/OiBzdHJpbmcpID0+IHRydWUgfCB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRGaWxlKGZpbGU6IHN0cmluZywgcXVlcnk/OiBzdHJpbmcgfCBudWxsLCB3aXRoVHlwZSA9IHRydWUpIHtcbiAgaWYgKHF1ZXJ5KSB7XG4gICAgY29uc3Qgc2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4JyksIGZpbGUpO1xuICAgIHNlbGVjdG9yLmZpbmRNYXBUbyhxdWVyeSwgKGFzdCwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay5jeWFuKFxuICAgICAgICB3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChlbCA9PiBlbC5zbGljZSgwLCBlbC5pbmRleE9mKCc6JykpKS5qb2luKCcgPiAnKVxuICAgICAgKSk7XG4gICAgICBzZWxlY3Rvci50cmF2ZXJzZShhc3QsIGNyZWF0ZVByaW50Tm9kZUNiKHdpdGhUeXBlKSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHdpdGhUeXBlKVxuICAgICAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpLCBmaWxlKS5wcmludEFsbCgpO1xuICAgIGVsc2VcbiAgICAgIG5ldyBTZWxlY3Rvcihmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSwgZmlsZSkucHJpbnRBbGxOb1R5cGUoKTtcbiAgfVxuICAvLyBjb25zb2xlLmxvZyhhc3RTY2hlbWFDYWNoZSk7XG59XG5mdW5jdGlvbiBjcmVhdGVQcmludE5vZGVDYih3aXRoVHlwZTogYm9vbGVhbikge1xuICBjb25zdCBwcmludE5vZGU6IHRyYXZlcnNlQ2JUeXBlID0gKGNoaWxkLCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYsIGNvbW1lbnQpID0+IHtcbiAgICBpZiAoY29tbWVudCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgKHdpdGhUeXBlID8gcGF0aC5qb2luKCcgPiAnKSA6IHBhdGgubWFwKGVsID0+IGVsLnNsaWNlKDAsIGVsLmluZGV4T2YoJzonKSkpLmpvaW4oJyA+ICcpKSArXG4gICAgICAgICAgYCAke2NoYWxrLnllbGxvdyhjb21tZW50KX1gXG4gICAgICApO1xuICAgIH1cbiAgICBpZiAoIWlzTGVhZilcbiAgICAgIHJldHVybjtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgICh3aXRoVHlwZSA/IHBhdGguam9pbignID4gJykgOiBwYXRoLm1hcChlbCA9PiBlbC5zbGljZSgwLCBlbC5pbmRleE9mKCc6JykpKS5qb2luKCcgPiAnKSkgK1xuICAgICAgICBgICR7Y2hhbGsuZ3JlZW5CcmlnaHQoY2hpbGQuZ2V0VGV4dCgpKX1gXG4gICAgKTtcbiAgfTtcbiAgcmV0dXJuIHByaW50Tm9kZTtcbn1cblxuXG5leHBvcnQgaW50ZXJmYWNlIFdhbGtDYWxsYmFjayB7XG4gIHF1ZXJ5OiBzdHJpbmc7XG4gIGNhbGxiYWNrOiAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50cz86IHRzLk5vZGVbXSkgPT4gdHJ1ZSB8IHZvaWQ7XG59XG4vLyB0eXBlIENhbGxiYWNrID0gKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10pID0+IGJvb2xlYW4gfCB2b2lkO1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VsZWN0b3Ige1xuICBzcmM6IHRzLlNvdXJjZUZpbGU7XG5cbiAgY29uc3RydWN0b3Ioc3JjOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk7XG4gIGNvbnN0cnVjdG9yKHNyYzogdHMuU291cmNlRmlsZSk7XG4gIGNvbnN0cnVjdG9yKHNyYzogdHMuU291cmNlRmlsZSB8IHN0cmluZywgZmlsZT86IHN0cmluZykge1xuICAgIC8vIGlmIChmaWxlKSB7XG4gICAgLy8gICBpZiAoZmlsZSA9PT0gbGFzdEZpbGUpIHtcbiAgICAvLyAgICAgZGVidWdnZXI7XG4gICAgLy8gICB9XG4gICAgLy8gICBsYXN0RmlsZSA9IGZpbGU7XG4gICAgLy8gfVxuICAgIC8vIGNvbnNvbGUubG9nKGBOby4gJHsrK2ZpbGVDb3VudGluZ30gJHtjaGFsay5yZWQoZmlsZSB8fCAndW5rbm93bicpfSBzY2hlbWEgc2l6ZTogJHtfLnNpemUoYXN0U2NoZW1hQ2FjaGUpfWApO1xuICAgIGlmICh0eXBlb2Ygc3JjID09PSAnc3RyaW5nJykge1xuICAgICAgdGhpcy5zcmMgPSB0cy5jcmVhdGVTb3VyY2VGaWxlKGZpbGUgfHwgJ3Vua25vd24nLCBzcmMsIHRzLlNjcmlwdFRhcmdldC5FU05leHQsXG4gICAgICAgIHRydWUsIHRzLlNjcmlwdEtpbmQuVFNYKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zcmMgPSBzcmM7XG4gICAgfVxuICB9XG5cbiAgd2Fsa0FzdChoYW5kbGVyczogV2Fsa0NhbGxiYWNrW10pOiB2b2lkO1xuICB3YWxrQXN0KGFzdDogdHMuTm9kZSwgaGFuZGxlcnM6IFdhbGtDYWxsYmFja1tdKTogdm9pZDtcbiAgd2Fsa0FzdChhc3Q6IHRzLk5vZGV8V2Fsa0NhbGxiYWNrW10gLCBoYW5kbGVycz86IFdhbGtDYWxsYmFja1tdKTogdm9pZCB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYXN0KSkge1xuICAgICAgaGFuZGxlcnMgPSBhc3Q7XG4gICAgICBhc3QgPSB0aGlzLnNyYztcbiAgICB9XG5cbiAgICBjb25zdCBxdWVyeU1hcDoge1tzdHI6IHN0cmluZ106IFF1ZXJ5fSA9IHt9O1xuICAgIGlmICghaGFuZGxlcnMpXG4gICAgICByZXR1cm47XG4gICAgaGFuZGxlcnMuZm9yRWFjaChoID0+IHF1ZXJ5TWFwW2gucXVlcnldID0gbmV3IFF1ZXJ5KGgucXVlcnkpKTtcblxuICAgIHRoaXMudHJhdmVyc2UoYXN0LCAoYXN0LCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICBsZXQgc2tpcCA9IGZhbHNlO1xuICAgICAgaGFuZGxlcnMhLnNvbWUoaCA9PiB7XG4gICAgICAgIGlmIChxdWVyeU1hcFtoLnF1ZXJ5XS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgICAgaC5jYWxsYmFjayhhc3QsIHBhdGgsIHBhcmVudHMpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHNraXApXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gcXVlcnkgTGlrZSBDU1Mgc2VsZWN0IDo9IFtcIl5cIl0gPHNlbGVjdG9yIGVsZW1lbnQ+IChcIiBcIiB8IFwiPlwiKSA8c2VsZWN0b3IgZWxlbWVudD5cblx0ICogICB3aGVyZSA8c2VsZWN0b3IgZWxlbWVudD4gOj0gXCIuXCIgPHByb3BlcnR5IG5hbWU+IDxpbmRleD4/IHwgXCI6XCIgPFR5cGVzY3JpcHQgU3ludGF4IGtpbmQgbmFtZT4gfCAqXG5cdCAqICAgd2hlcmUgPGluZGV4PiA6PSBcIltcIiBcIjBcIi1cIjlcIiBcIl1cIlxuICAgKiBcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gXi5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuICAgKiBCZWdpbmluZyB3aXRoIFwiXlwiIG1lYW5zIHN0cmljdGx5IGNvbXBhcmluZyBmcm9tIGZpcnN0IHF1ZXJpZWQgQVNUIG5vZGVcblx0ICogQHBhcmFtIGNhbGxiYWNrIFxuXHQgKi9cbiAgZmluZE1hcFRvPFQ+KHF1ZXJ5OiBzdHJpbmcsIGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+KTogVCB8IG51bGw7XG4gIGZpbmRNYXBUbzxUPihhc3Q6IHRzLk5vZGUsIHF1ZXJ5OiBzdHJpbmcsIGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+KTogVCB8IG51bGw7XG4gIGZpbmRNYXBUbzxUPiguLi5hcmc6IGFueVtdKTogVCB8IG51bGwge1xuICAgIGxldCBxdWVyeTogc3RyaW5nO1xuICAgIGxldCBhc3Q6IHRzLk5vZGU7XG4gICAgbGV0IGNhbGxiYWNrOiBBc3RIYW5kbGVyPFQ+O1xuICAgIGlmICh0eXBlb2YgYXJnWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgICBxdWVyeSA9IGFyZ1swXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICBhc3QgPSBhcmdbMF07XG4gICAgICBxdWVyeSA9IGFyZ1sxXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzJdO1xuICAgIH1cbiAgICBsZXQgcmVzOiBUIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcSA9IG5ldyBRdWVyeShxdWVyeSEpO1xuXG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChhc3QsIHBhdGgsIHBhcmVudHMsIGlzTGVhZikgPT4ge1xuICAgICAgaWYgKHJlcyAhPSBudWxsKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzID0gY2FsbGJhY2soYXN0LCBwYXRoLCBwYXJlbnRzLCBpc0xlYWYpO1xuICAgICAgICBpZiAocmVzICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEFsbChxdWVyeTogc3RyaW5nKTogdHMuTm9kZVtdO1xuICBmaW5kQWxsKGFzdDogdHMuTm9kZSwgcXVlcnk6IHN0cmluZyk6IHRzLk5vZGVbXTtcbiAgZmluZEFsbChhc3Q6IHRzLk5vZGUgfCBzdHJpbmcsIHF1ZXJ5Pzogc3RyaW5nKTogdHMuTm9kZVtdIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkoYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICBxID0gbmV3IFF1ZXJ5KHF1ZXJ5ISk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzOiB0cy5Ob2RlW10gPSBbXTtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgX3BhcmVudHMsIF9pc0xlYWYpID0+IHtcbiAgICAgIGlmIChxLm1hdGNoZXMocGF0aCkpIHtcbiAgICAgICAgcmVzLnB1c2goYXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCByb290IEFTVCBub2RlXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gW1wiXlwiXSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEZpcnN0KHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmaW5kRmlyc3QoYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nKTogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgZmluZEZpcnN0KGFzdDogdHMuTm9kZSB8IHN0cmluZywgcXVlcnk/OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkpO1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkhKTtcbiAgICB9XG4gICAgbGV0IHJlczogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCkgPT4ge1xuICAgICAgaWYgKHJlcylcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBpZiAocS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIHJlcyA9IGFzdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGxpc3QoYXN0OiB0cy5Ob2RlID0gdGhpcy5zcmMpIHtcbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChub2RlLCBwYXRoLCBfcGFyZW50cywgbm9DaGlsZCkgPT4ge1xuICAgICAgaWYgKG5vQ2hpbGQpIHtcbiAgICAgICAgb3V0ICs9IHBhdGguam9pbignPicpICsgJyAnICsgbm9kZS5nZXRUZXh0KHRoaXMuc3JjKTtcbiAgICAgICAgb3V0ICs9ICdcXG4nO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBwcmludEFsbChhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYih0cnVlKSk7XG4gIH1cblxuICBwcmludEFsbE5vVHlwZShhc3Q6IHRzLk5vZGUgPSB0aGlzLnNyYykge1xuICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjcmVhdGVQcmludE5vZGVDYihmYWxzZSkpO1xuICB9XG4gIC8qKlxuXHQgKiBcblx0ICogQHBhcmFtIGFzdCBcblx0ICogQHBhcmFtIGNiIHJldHVybiB0cnVlIHRvIHNraXAgdHJhdmVyc2luZyBjaGlsZCBub2RlXG5cdCAqIEBwYXJhbSBsZXZlbCBkZWZhdWx0IDBcblx0ICovXG4gIHRyYXZlcnNlKGFzdDogdHMuTm9kZSxcbiAgICBjYjogdHJhdmVyc2VDYlR5cGUsXG4gICAgcHJvcE5hbWUgPSAnJywgcGFyZW50czogdHMuTm9kZVtdID0gW10sIHBhdGhFbHM6IHN0cmluZ1tdID0gW10pOiB0cnVlIHwgdm9pZCB7XG5cbiAgICBsZXQgbmVlZFBvcFBhdGhFbCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKGFzdC5raW5kICE9PSB0cy5TeW50YXhLaW5kLlNvdXJjZUZpbGUpIHtcbiAgICAgIC8vIGxldCBwcm9wTmFtZSA9IHBhcmVudHNbcGFyZW50cy5sZW5ndGggLSAxXSA9PT0gdGhpcy5zcmMgPyAnJyA6IHRoaXMuX2ZpbmRQYXJlbnRQcm9wTmFtZShhc3QsIHBhcmVudHMpO1xuICAgIGxldCBwYXRoRWwgPSAnOicgKyBza1thc3Qua2luZF07XG4gICAgaWYgKHByb3BOYW1lKVxuICAgICAgcGF0aEVsID0gJy4nICsgcHJvcE5hbWUgKyBwYXRoRWw7XG4gICAgcGF0aEVscy5wdXNoKHBhdGhFbCk7XG5cbiAgICBjb25zdCBjb21tZW50cyA9IHRoaXMuc3JjLmdldEZ1bGxUZXh0KCkuc2xpY2UoYXN0LmdldFN0YXJ0KHRoaXMuc3JjLCB0cnVlKSwgYXN0LmdldFN0YXJ0KCkpO1xuICAgIG5lZWRQb3BQYXRoRWwgPSB0cnVlO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IHJlcyA9IGNiKGFzdCwgcGF0aEVscywgcGFyZW50cywgYXN0LmdldENoaWxkQ291bnQodGhpcy5zcmMpIDw9IDAsIGNvbW1lbnRzKTtcblxuICAgIGlmIChyZXMgIT09IHRydWUpIHtcbiAgICAgIHBhcmVudHMucHVzaChhc3QpO1xuICAgICAgY29uc3QgX3ZhbHVlMmtleSA9IG5ldyBNYXA8YW55LCBzdHJpbmc+KCk7XG5cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpmb3JpblxuICAgICAgLy8gZm9yIChjb25zdCBrZXkgaW4gYXN0KSB7XG4gICAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgICAgY3JlYXRlVmFsdWUyS2V5TWFwKGFzdCwgX3ZhbHVlMmtleSk7XG5cbiAgICAgIC8vIGZvciAoY29uc3QgY2hpbGQgb2YgYXN0LmdldENoaWxkcmVuKCkpIHtcbiAgICAgIC8vICAgaWYgKChjaGlsZCBhcyBTeW50YXhMaXN0KS5fY2hpbGRyZW4pIHtcbiAgICAgIC8vICAgICAvLyBjb25zdCBzdWJBcnJheSA9IChjaGlsZCBhcyBTeW50YXhMaXN0KS5fY2hpbGRyZW47XG4gICAgICAvLyAgICAgY29udGludWU7XG4gICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAvLyAgICAgbGV0IHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgLy8gICAgIGlmIChwcm9wTmFtZSA9PSBudWxsKSB7XG4gICAgICAvLyAgICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5KTtcbiAgICAgIC8vICAgICAgIHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBjb25zdCBpc1N0b3AgPSBzZWxmLnRyYXZlcnNlKGNoaWxkLCBjYiwgcHJvcE5hbWUsIHBhcmVudHMsIHBhdGhFbHMpO1xuICAgICAgLy8gICAgIGlmIChpc1N0b3AgPT09IHRydWUpXG4gICAgICAvLyAgICAgICBicmVhaztcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfVxuICAgICAgLyoqXG4gICAgICAgKiB0cy5mb3JFYWNoQ2hpbGQgKG9yIGBOb2RlLmZvckVhY2hDaGlsZCgpYCkganVzdCBjYW4ndCBsaXN0IGFsbCB0aGUgY2hpbGRyZW4gbGlrZSBwdXJlIHN5dGF4IHRva2VucyxcbiAgICAgICAqIHNvIEkgdXNlIE5vZGUuZ2V0Q2hpbGRyZW5kKCkgdG8gZ2V0IGFsbCBjaGlsZCBub2Rlcy5cbiAgICAgICAqIFxuICAgICAgICogQnV0IHRzLmZvckVhY2hDaGlsZCBpcyB0aGUgb25seSBmdW5jdGlvbiB3aGljaCBjYW4gZ2V0IGVtYmVkZGVkIGFycmF5IGNoaWxkcmVuIG5vZGUgaW4gZm9ybSBvZiBOb2RlQXJyYXksXG4gICAgICAgKiBzbyBJIHN0aWxsIG5lZWQgaXQgaGVyZS5cbiAgICAgICAqL1xuICAgICAgYXN0LmZvckVhY2hDaGlsZChjaGlsZCA9PiB7XG4gICAgICAgICAgbGV0IHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgICAgIGlmIChwcm9wTmFtZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjcmVhdGVWYWx1ZTJLZXlNYXAoYXN0LCBfdmFsdWUya2V5LCB0cnVlKTtcbiAgICAgICAgICAgIHByb3BOYW1lID0gX3ZhbHVlMmtleS5nZXQoY2hpbGQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBpc1N0b3AgPSBzZWxmLnRyYXZlcnNlKGNoaWxkLCBjYiwgcHJvcE5hbWUsIHBhcmVudHMsIHBhdGhFbHMpO1xuICAgICAgICAgIHJldHVybiBpc1N0b3AgYXMgdW5rbm93biBhcyB0cnVlIHwgdW5kZWZpbmVkO1xuICAgICAgICAgIC8vIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIHN1YkFycmF5ID0+IHtcbiAgICAgICAgICBsZXQgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChzdWJBcnJheSk7XG4gICAgICAgICAgaWYgKHByb3BOYW1lID09IG51bGwpIHtcbiAgICAgICAgICAgIGNyZWF0ZVZhbHVlMktleU1hcChhc3QsIF92YWx1ZTJrZXksIHRydWUpO1xuICAgICAgICAgICAgcHJvcE5hbWUgPSBfdmFsdWUya2V5LmdldChzdWJBcnJheSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBzZWxmLnRyYXZlcnNlQXJyYXkoc3ViQXJyYXksIGNiLCBwcm9wTmFtZSwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgICBwYXJlbnRzLnBvcCgpO1xuICAgIH1cbiAgICBpZiAobmVlZFBvcFBhdGhFbClcbiAgICAgIHBhdGhFbHMucG9wKCk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIHBhdGhGb3JBc3QoYXN0OiB0cy5Ob2RlLCB3aXRoVHlwZSA9IHRydWUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGhFbHM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHAgPSBhc3Q7XG4gICAgd2hpbGUgKHApIHtcbiAgICAgIGNvbnN0IHByb3BFeHAgPSB0aGlzLnByb3BOYW1lRm9yQXN0KHApO1xuICAgICAgcGF0aEVscy5wdXNoKChwcm9wRXhwID8gJy4nICsgcHJvcEV4cCA6ICcnKSArICh3aXRoVHlwZSA/ICc6JyArIHNrW3Aua2luZF0gOiAnJykpO1xuICAgICAgaWYgKHAgPT09IHRoaXMuc3JjKVxuICAgICAgICBicmVhaztcbiAgICAgIHAgPSBwLnBhcmVudDtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGhFbHMucmV2ZXJzZSgpLmpvaW4oJz4nKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBwcm9wTmFtZUZvckFzdChhc3Q6IHRzLk5vZGUpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBwID0gYXN0LnBhcmVudDtcbiAgICBpZiAocCA9PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBjYWNoZWRQcm9wZXJ0aWVzID0gYXN0U2NoZW1hQ2FjaGVbcC5raW5kXTtcblxuICAgIGxldCBwcm9wZXJ0aWVzID0gY2FjaGVkUHJvcGVydGllcztcbiAgICBpZiAocHJvcGVydGllcyA9PSBudWxsKSB7XG4gICAgICBhc3RTY2hlbWFDYWNoZVtwLmtpbmRdID0gcHJvcGVydGllcyA9IE9iamVjdC5rZXlzKHApO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcHJvcCBvZiBwcm9wZXJ0aWVzKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IChwIGFzIGFueSlbcHJvcF07XG4gICAgICBpZiAoWydwYXJlbnQnLCAna2luZCcsICdfY2hpbGRyZW4nLCAncG9zJywgJ2VuZCddLmluY2x1ZGVzKHByb3ApKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBjb25zdCBpZHggPSAodmFsdWUgYXMgYW55W10pLmluZGV4T2YoYXN0KTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIHByb3AgKyBgWyR7aWR4fV1gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodmFsdWUgPT09IGFzdCkge1xuICAgICAgICByZXR1cm4gcHJvcDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgcHJvdGVjdGVkIHRyYXZlcnNlQXJyYXkobm9kZXM6IHRzLk5vZGVBcnJheTx0cy5Ob2RlPiB8IHRzLk5vZGVbXSxcbiAgICBjYjogKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM6IHRzLk5vZGVbXSwgaXNMZWFmOiBib29sZWFuKSA9PiB0cnVlIHwgdm9pZCxcbiAgICBwcm9wTmFtZSA9ICcnLCBwYXJlbnRzOiB0cy5Ob2RlW10gPSBbXSwgcGF0aEVsczogc3RyaW5nW10gPSBbXSk6IHRydWUgfCB1bmRlZmluZWQge1xuXG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgYXN0IG9mIG5vZGVzKSB7XG4gICAgICBjb25zdCBpc1N0b3AgPSB0aGlzLnRyYXZlcnNlKGFzdCwgY2IsIHByb3BOYW1lICsgYFske2krK31dYCwgcGFyZW50cywgcGF0aEVscyk7XG4gICAgICBpZiAoaXNTdG9wKVxuICAgICAgICByZXR1cm4gaXNTdG9wIGFzIHVua25vd24gYXMgdHJ1ZSB8IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlVmFsdWUyS2V5TWFwKGFzdDogdHMuTm9kZSwgdmFsdWUyS2V5TWFwOiBNYXA8YW55LCBzdHJpbmc+LCByZWJ1aWxkID0gZmFsc2UpOiBzdHJpbmdbXSB7XG4gIC8vIGNvbnN0IHByb3BzID0ga2V5c0luKGFzdClcbiAgbGV0IHByb3BzOiBzdHJpbmdbXTtcbiAgbGV0IGNhY2hlZCA9IGFzdFNjaGVtYUNhY2hlW2FzdC5raW5kXTtcblxuICBpZiAocmVidWlsZCB8fCBjYWNoZWQgPT0gbnVsbCkge1xuICAgICAgcHJvcHMgPSBPYmplY3Qua2V5cyhhc3QpXG4gICAgICAuZmlsdGVyKHByb3AgPT4gdHlwZW9mIGFzdFtwcm9wXSAhPT0gJ2Z1bmN0aW9uJyAmJiAhWydwYXJlbnQnLCAna2luZCcsICdfY2hpbGRyZW4nLCAncG9zJywgJ2VuZCddLmluY2x1ZGVzKHByb3ApKTtcbiAgICAgIGlmIChjYWNoZWQgPT0gbnVsbCkge1xuICAgICAgICBhc3RTY2hlbWFDYWNoZVthc3Qua2luZF0gPSBwcm9wcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IGNhY2hlZDtcbiAgICAgICAgc2NoZW1hLnB1c2goLi4ucHJvcHMpO1xuICAgICAgICB1bmlxKHNjaGVtYSk7XG4gICAgICAgIHByb3BzID0gc2NoZW1hO1xuICAgICAgfVxuICB9IGVsc2Uge1xuICAgIHByb3BzID0gY2FjaGVkO1xuICB9XG4gIGZvciAoY29uc3Qga2V5IG9mIHByb3BzISkge1xuICAgIHZhbHVlMktleU1hcC5zZXQoKGFzdCBhcyBhbnkpW2tleV0sIGtleSk7XG4gIH1cbiAgcmV0dXJuIHByb3BzITtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RDaGFyYWN0ZXIge1xuICBwcm9wZXJ0eU5hbWU/OiBzdHJpbmc7XG4gIHByb3BJbmRleD86IG51bWJlcjtcbiAga2luZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RRdWVyeSBleHRlbmRzIEFzdENoYXJhY3RlciB7XG4gIHRleHQ/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBjbGFzcyBRdWVyeSB7XG4gIHF1ZXJ5UGF0aHM6IEFzdENoYXJhY3RlcltdW107IC8vIGluIHJldmVyc2VkIG9yZGVyXG4gIHByaXZhdGUgZnJvbVJvb3QgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihxdWVyeTogc3RyaW5nKSB7XG4gICAgcXVlcnkgPSBxdWVyeS50cmltKCk7XG4gICAgaWYgKHF1ZXJ5LnN0YXJ0c1dpdGgoJ14nKSkge1xuICAgICAgcXVlcnkgPSBxdWVyeS5zbGljZSgxKTtcbiAgICAgIHRoaXMuZnJvbVJvb3QgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnF1ZXJ5UGF0aHMgPSBxdWVyeS50cmltKClcbiAgICAgIC5yZXBsYWNlKC9cXHMqPlxccyovZywgJz4nKVxuICAgICAgLnNwbGl0KC9cXHMrLylcbiAgICAgIC5tYXAocGF0aHMgPT4gcGF0aHMuc3BsaXQoJz4nKVxuICAgICAgICAubWFwKHNpbmdsZUFzdERlc2MgPT4gdGhpcy5fcGFyc2VEZXNjKHNpbmdsZUFzdERlc2MpKS5yZXZlcnNlKCkpXG4gICAgICAucmV2ZXJzZSgpO1xuICB9XG5cbiAgbWF0Y2hlcyhwYXRoOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xuICAgIGxldCB0ZXN0UG9zID0gcGF0aC5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHN0YXJ0VGVzdFBvcyA9IHRlc3RQb3M7XG4gICAgZm9yIChjb25zdCBjb25zZWN1dGl2ZU5vZGVzIG9mIHRoaXMucXVlcnlQYXRocy5zbGljZSgwKSkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgaWYgKHRoaXMubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoY29uc2VjdXRpdmVOb2RlcywgcGF0aCwgdGVzdFBvcykpIHtcbiAgICAgICAgICB0ZXN0UG9zIC09IGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKHRlc3RQb3MgPT09IHN0YXJ0VGVzdFBvcykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0ZXN0UG9zLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoID4gdGVzdFBvcyArIDEpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcy5mcm9tUm9vdCA/IHRlc3RQb3MgPT09IDAgOiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9wYXJzZURlc2Moc2luZ2xlQXN0RGVzYzogc3RyaW5nKTogQXN0UXVlcnkge1xuICAgIGNvbnN0IGFzdENoYXI6IEFzdFF1ZXJ5ID0ge307XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmVcblx0XHRcdGxldCBtID0gL14oPzpcXC4oW2EtekEtWjAtOV8kXSspKD86XFxbKFswLTldKilcXF0pPyk/KD86XFw6KFthLXpBLVowLTlfJF0rKSk/JHxeXFwqJC8uZXhlYyhzaW5nbGVBc3REZXNjKTtcbiAgICAgIGlmIChtID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHF1ZXJ5IHN0cmluZyBcIiR7Y2hhbGsueWVsbG93KHNpbmdsZUFzdERlc2MpfVwiYCk7XG4gICAgICB9XG4gICAgICBpZiAobVsxXSkge1xuICAgICAgICBhc3RDaGFyLnByb3BlcnR5TmFtZSA9IG1bMV07XG4gICAgICAgIGlmIChtWzJdKVxuICAgICAgICAgIGFzdENoYXIucHJvcEluZGV4ID0gcGFyc2VJbnQobVsyXSwgMTApO1xuICAgICAgfVxuICAgICAgaWYgKG1bM10pXG4gICAgICAgIGFzdENoYXIua2luZCA9IG1bM107XG4gICAgICAvLyBpZiAobVs0XSlcbiAgICAgIC8vIFx0YXN0Q2hhci50ZXh0ID0gbmV3IFJlZ0V4cChtWzRdKTtcbiAgICAgIHJldHVybiBhc3RDaGFyO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXRjaGVzQXN0KHF1ZXJ5OiBBc3RRdWVyeSwgdGFyZ2V0OiBBc3RDaGFyYWN0ZXIpOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhxdWVyeSkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gKHF1ZXJ5IGFzIGFueSlba2V5XTtcbiAgICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCEodmFsdWUgYXMgUmVnRXhwKS50ZXN0KCh0YXJnZXQgYXMgYW55KVtrZXldKSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKCh0YXJnZXQgYXMgYW55KVtrZXldICE9PSB2YWx1ZSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBwcmVkaWN0ZSBpZiBpdCBtYXRjaGVzIFwiPlwiIGNvbm5lY3RlZCBwYXRoIGV4cHJlc3Npb24gXG4gICAqIEBwYXJhbSBxdWVyeU5vZGVzIGFsbCBpdGVtcyBpbiByZXZlcnNlZCBvcmRlclxuICAgKiBAcGFyYW0gcGF0aCBcbiAgICogQHBhcmFtIHRlc3RQb3Mgc3RhcnRzIHdpdGggcGF0aC5sZW5ndGggLSAxXG4gICAqL1xuICBwcml2YXRlIG1hdGNoZXNDb25zZWN1dGl2ZU5vZGVzKHF1ZXJ5Tm9kZXM6IEFzdENoYXJhY3RlcltdLCBwYXRoOiBzdHJpbmdbXSwgdGVzdFBvczogbnVtYmVyKSB7XG4gICAgaWYgKHF1ZXJ5Tm9kZXMubGVuZ3RoID4gdGVzdFBvcyArIDEpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCBxdWVyeSBvZiBxdWVyeU5vZGVzLnNsaWNlKDApKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLl9wYXJzZURlc2MocGF0aFt0ZXN0UG9zLS1dKTtcbiAgICAgIGlmICghdGhpcy5tYXRjaGVzQXN0KHF1ZXJ5LCB0YXJnZXQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=
