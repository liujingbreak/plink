"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts = tslib_1.__importStar(require("typescript"));
const typescript_1 = require("typescript");
const fs = tslib_1.__importStar(require("fs"));
// import api from '__api';
const _ = tslib_1.__importStar(require("lodash"));
const { green, red, yellow } = require('chalk');
// const log = require('log4js').getLogger('ts-ast-query');
function printFile(fileName) {
    if (!fileName) {
        // tslint:disable-next-line
        console.log('Usage:\n' + green('drcp run @dr-core/ng-app-builder/dist/utils/ts-ast-query --file <ts file>'));
        return;
    }
    new Selector(fs.readFileSync(fileName, 'utf8'), fileName).printAll();
}
exports.printFile = printFile;
// type Callback = (ast: ts.Node, path: string[]) => boolean | void;
class Selector {
    constructor(src, file) {
        if (typeof src === 'string') {
            this.src = ts.createSourceFile(file || 'unknown', src, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
        }
        else {
            this.src = src;
        }
    }
    findWith(...arg) {
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
        this.traverse(ast, (ast, path, parents) => {
            if (res != null)
                return true;
            if (q.matches(path)) {
                res = callback(ast, path, parents);
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
        this.traverse(ast, (ast, path, parents, isLeaf) => {
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
            q = new Query(ast);
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
        this.traverse(ast, (node, path, parents, noChild) => {
            if (noChild) {
                out += path.join('>') + ' ' + node.getText(this.src);
                out += '\n';
            }
        });
        return out;
    }
    printAll(ast = this.src) {
        this.traverse(ast, (node, path, parents, noChild) => {
            if (noChild) {
                // tslint:disable-next-line:no-console
                console.log(path.join('>'), green(node.getText(this.src)));
            }
        });
    }
    printAllNoType(ast = this.src) {
        this.traverse(ast, (node, path, parents, noChild) => {
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
        // tslint:disable-next-line
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
        // if (m[4])
        // 	astChar.text = new RegExp(m[4]);
        return astChar;
    }
    matchesAst(query, target) {
        for (const key of Object.keys(query)) {
            const value = query[key];
            if (_.isRegExp(value)) {
                if (!value.test(target[key]))
                    return false;
            }
            else if (target[key] !== value)
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy91dGlscy90cy1hc3QtcXVlcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsdURBQWlDO0FBQ2pDLDJDQUE0QztBQUM1QywrQ0FBeUI7QUFDekIsMkJBQTJCO0FBQzNCLGtEQUE0QjtBQUM1QixNQUFNLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUMsMkRBQTJEO0FBRTNELFNBQWdCLFNBQVMsQ0FBQyxRQUFnQjtJQUN4QyxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsMkJBQTJCO1FBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQywyRUFBMkUsQ0FBQyxDQUFDLENBQUM7UUFDM0csT0FBTztLQUNSO0lBQ0QsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDdkUsQ0FBQztBQVBELDhCQU9DO0FBRUQsb0VBQW9FO0FBQ3BFLE1BQXFCLFFBQVE7SUFLM0IsWUFBWSxHQUEyQixFQUFFLElBQWE7UUFDcEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7WUFDM0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxJQUFJLFNBQVMsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQzNFLElBQUksRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQzVCO2FBQU07WUFDTCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztTQUNoQjtJQUNILENBQUM7SUFlRCxRQUFRLENBQUksR0FBRyxHQUFVO1FBQ3ZCLElBQUksS0FBYSxDQUFDO1FBQ2xCLElBQUks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Q2pDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsS0FBSyxNQUFNLEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoRCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDO2dCQUNqQyxPQUFPLEtBQUssQ0FBQztTQUNoQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBckVELHNCQXFFQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1hc3QtcXVlcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7U3ludGF4S2luZCBhcyBza30gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG4vLyBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IHtncmVlbiwgcmVkLCB5ZWxsb3d9ID0gcmVxdWlyZSgnY2hhbGsnKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigndHMtYXN0LXF1ZXJ5Jyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmludEZpbGUoZmlsZU5hbWU6IHN0cmluZykge1xuICBpZiAoIWZpbGVOYW1lKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0Y29uc29sZS5sb2coJ1VzYWdlOlxcbicgKyBncmVlbignZHJjcCBydW4gQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC91dGlscy90cy1hc3QtcXVlcnkgLS1maWxlIDx0cyBmaWxlPicpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbmV3IFNlbGVjdG9yKGZzLnJlYWRGaWxlU3luYyhmaWxlTmFtZSwgJ3V0ZjgnKSwgZmlsZU5hbWUpLnByaW50QWxsKCk7XG59XG5cbi8vIHR5cGUgQ2FsbGJhY2sgPSAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSkgPT4gYm9vbGVhbiB8IHZvaWQ7XG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTZWxlY3RvciB7XG4gIHNyYzogdHMuU291cmNlRmlsZTtcblxuICBjb25zdHJ1Y3RvcihzcmM6IHN0cmluZywgZmlsZTogc3RyaW5nKTtcbiAgY29uc3RydWN0b3Ioc3JjOiB0cy5Tb3VyY2VGaWxlKTtcbiAgY29uc3RydWN0b3Ioc3JjOiB0cy5Tb3VyY2VGaWxlIHwgc3RyaW5nLCBmaWxlPzogc3RyaW5nKSB7XG4gICAgaWYgKHR5cGVvZiBzcmMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLnNyYyA9IHRzLmNyZWF0ZVNvdXJjZUZpbGUoZmlsZSB8fCAndW5rbm93bicsIHNyYywgdHMuU2NyaXB0VGFyZ2V0LkVTTmV4dCxcbiAgICAgICAgdHJ1ZSwgdHMuU2NyaXB0S2luZC5UU1gpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNyYyA9IHNyYztcbiAgICB9XG4gIH1cblxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBxdWVyeSBMaWtlIENTUyBzZWxlY3QgOj0gPHNlbGVjdG9yIGVsZW1lbnQ+IChcIiBcIiB8IFwiPlwiKSA8c2VsZWN0b3IgZWxlbWVudD5cblx0ICogICB3aGVyZSA8c2VsZWN0b3IgZWxlbWVudD4gOj0gXCIuXCIgPHByb3BlcnR5IG5hbWU+IDxpbmRleD4/IHwgXCI6XCIgPFR5cGVzY3JpcHQgU3ludGF4IGtpbmQgbmFtZT4gfCAqXG5cdCAqICAgd2hlcmUgPGluZGV4PiA6PSBcIltcIiBcIjBcIi1cIjlcIiBcIl1cIlxuXHQgKiBlLmcuXG5cdCAqICAtIC5lbGVtZW50czpJbXBvcnRTcGVjaWZpZXIgPiAubmFtZVxuXHQgKiAgLSAuZWxlbWVudHNbMl0gPiAubmFtZVxuXHQgKiAgLSAuc3RhdGVtZW50c1swXSA6SW1wb3J0U3BlY2lmaWVyID4gOklkZW50aWZpZXJcblx0ICogQHBhcmFtIGNhbGxiYWNrIFxuXHQgKi9cbiAgZmluZFdpdGg8VD4ocXVlcnk6IHN0cmluZywgY2FsbGJhY2s6IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzOiB0cy5Ob2RlW10pID0+IFQpOiBUIHwgbnVsbDtcbiAgZmluZFdpdGg8VD4oYXN0OiB0cy5Ob2RlLCBxdWVyeTogc3RyaW5nLCBjYWxsYmFjazogKGFzdDogdHMuTm9kZSwgcGF0aDogc3RyaW5nW10sIHBhcmVudHM6IHRzLk5vZGVbXSkgPT4gVCk6IFQgfCBudWxsO1xuICBmaW5kV2l0aDxUPiguLi5hcmc6IGFueVtdKTogVCB8IG51bGwge1xuICAgIGxldCBxdWVyeTogc3RyaW5nO1xuICAgIGxldCBhc3Q6IHRzLk5vZGU7XG4gICAgbGV0IGNhbGxiYWNrOiAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdKSA9PiBUO1xuICAgIGlmICh0eXBlb2YgYXJnWzBdID09PSAnc3RyaW5nJykge1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgICBxdWVyeSA9IGFyZ1swXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICBhc3QgPSBhcmdbMF07XG4gICAgICBxdWVyeSA9IGFyZ1sxXTtcbiAgICAgIGNhbGxiYWNrID0gYXJnWzJdO1xuICAgIH1cbiAgICBsZXQgcmVzOiBUIHwgbnVsbCA9IG51bGw7XG4gICAgY29uc3QgcSA9IG5ldyBRdWVyeShxdWVyeSEpO1xuXG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChhc3QsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgIGlmIChyZXMgIT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBpZiAocS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIHJlcyA9IGNhbGxiYWNrKGFzdCwgcGF0aCwgcGFyZW50cyk7XG4gICAgICAgIGlmIChyZXMgIT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzO1xuICB9XG5cbiAgLyoqXG5cdCAqIFxuXHQgKiBAcGFyYW0gYXN0IHJvb3QgQVNUIG5vZGVcblx0ICogQHBhcmFtIHF1ZXJ5IExpa2UgQ1NTIHNlbGVjdCA6PSA8c2VsZWN0b3IgZWxlbWVudD4gKFwiIFwiIHwgXCI+XCIpIDxzZWxlY3RvciBlbGVtZW50PlxuXHQgKiAgIHdoZXJlIDxzZWxlY3RvciBlbGVtZW50PiA6PSBcIi5cIiA8cHJvcGVydHkgbmFtZT4gPGluZGV4Pj8gfCBcIjpcIiA8VHlwZXNjcmlwdCBTeW50YXgga2luZCBuYW1lPiB8ICpcblx0ICogICB3aGVyZSA8aW5kZXg+IDo9IFwiW1wiIFwiMFwiLVwiOVwiIFwiXVwiXG5cdCAqIGUuZy5cblx0ICogIC0gLmVsZW1lbnRzOkltcG9ydFNwZWNpZmllciA+IC5uYW1lXG5cdCAqICAtIC5lbGVtZW50c1syXSA+IC5uYW1lXG5cdCAqICAtIC5zdGF0ZW1lbnRzWzBdIDpJbXBvcnRTcGVjaWZpZXIgPiA6SWRlbnRpZmllclxuXHQgKi9cbiAgZmluZEFsbChxdWVyeTogc3RyaW5nKTogdHMuTm9kZVtdO1xuICBmaW5kQWxsKGFzdDogdHMuTm9kZSwgcXVlcnk6IHN0cmluZyk6IHRzLk5vZGVbXTtcbiAgZmluZEFsbChhc3Q6IHRzLk5vZGUgfCBzdHJpbmcsIHF1ZXJ5Pzogc3RyaW5nKTogdHMuTm9kZVtdIHtcbiAgICBsZXQgcTogUXVlcnk7XG4gICAgaWYgKHR5cGVvZiBhc3QgPT09ICdzdHJpbmcnKSB7XG4gICAgICBxdWVyeSA9IGFzdDtcbiAgICAgIHEgPSBuZXcgUXVlcnkoYXN0KTtcbiAgICAgIGFzdCA9IHRoaXMuc3JjO1xuICAgIH0gZWxzZSB7XG4gICAgICBxID0gbmV3IFF1ZXJ5KHF1ZXJ5ISk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzOiB0cy5Ob2RlW10gPSBbXTtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCwgcGFyZW50cywgaXNMZWFmKSA9PiB7XG4gICAgICBpZiAocS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIHJlcy5wdXNoKGFzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBhc3Qgcm9vdCBBU1Qgbm9kZVxuXHQgKiBAcGFyYW0gcXVlcnkgTGlrZSBDU1Mgc2VsZWN0IDo9IDxzZWxlY3RvciBlbGVtZW50PiAoXCIgXCIgfCBcIj5cIikgPHNlbGVjdG9yIGVsZW1lbnQ+XG5cdCAqICAgd2hlcmUgPHNlbGVjdG9yIGVsZW1lbnQ+IDo9IFwiLlwiIDxwcm9wZXJ0eSBuYW1lPiA8aW5kZXg+PyB8IFwiOlwiIDxUeXBlc2NyaXB0IFN5bnRheCBraW5kIG5hbWU+IHwgKlxuXHQgKiAgIHdoZXJlIDxpbmRleD4gOj0gXCJbXCIgXCIwXCItXCI5XCIgXCJdXCJcblx0ICogZS5nLlxuXHQgKiAgLSAuZWxlbWVudHM6SW1wb3J0U3BlY2lmaWVyID4gLm5hbWVcblx0ICogIC0gLmVsZW1lbnRzWzJdID4gLm5hbWVcblx0ICogIC0gLnN0YXRlbWVudHNbMF0gOkltcG9ydFNwZWNpZmllciA+IDpJZGVudGlmaWVyXG5cdCAqL1xuICBmaW5kRmlyc3QocXVlcnk6IHN0cmluZyk6IHRzLk5vZGUgfCB1bmRlZmluZWQ7XG4gIGZpbmRGaXJzdChhc3Q6IHRzLk5vZGUsIHF1ZXJ5OiBzdHJpbmcpOiB0cy5Ob2RlIHwgdW5kZWZpbmVkO1xuICBmaW5kRmlyc3QoYXN0OiB0cy5Ob2RlIHwgc3RyaW5nLCBxdWVyeT86IHN0cmluZyk6IHRzLk5vZGUgfCB1bmRlZmluZWQge1xuICAgIGxldCBxOiBRdWVyeTtcbiAgICBpZiAodHlwZW9mIGFzdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHF1ZXJ5ID0gYXN0O1xuICAgICAgcSA9IG5ldyBRdWVyeShhc3QpO1xuICAgICAgYXN0ID0gdGhpcy5zcmM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHEgPSBuZXcgUXVlcnkocXVlcnkhKTtcbiAgICB9XG4gICAgbGV0IHJlczogdHMuTm9kZSB8IHVuZGVmaW5lZDtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKGFzdCwgcGF0aCkgPT4ge1xuICAgICAgaWYgKHJlcylcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBpZiAocS5tYXRjaGVzKHBhdGgpKSB7XG4gICAgICAgIHJlcyA9IGFzdDtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlcztcbiAgfVxuXG4gIGxpc3QoYXN0OiB0cy5Ob2RlID0gdGhpcy5zcmMpIHtcbiAgICBsZXQgb3V0ID0gJyc7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChub2RlLCBwYXRoLCBwYXJlbnRzLCBub0NoaWxkKSA9PiB7XG4gICAgICBpZiAobm9DaGlsZCkge1xuICAgICAgICBvdXQgKz0gcGF0aC5qb2luKCc+JykgKyAnICcgKyBub2RlLmdldFRleHQodGhpcy5zcmMpO1xuICAgICAgICBvdXQgKz0gJ1xcbic7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dDtcbiAgfVxuXG4gIHByaW50QWxsKGFzdDogdHMuTm9kZSA9IHRoaXMuc3JjKSB7XG4gICAgdGhpcy50cmF2ZXJzZShhc3QsIChub2RlLCBwYXRoLCBwYXJlbnRzLCBub0NoaWxkKSA9PiB7XG4gICAgICBpZiAobm9DaGlsZCkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhwYXRoLmpvaW4oJz4nKSwgZ3JlZW4obm9kZS5nZXRUZXh0KHRoaXMuc3JjKSkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpbnRBbGxOb1R5cGUoYXN0OiB0cy5Ob2RlID0gdGhpcy5zcmMpIHtcbiAgICB0aGlzLnRyYXZlcnNlKGFzdCwgKG5vZGUsIHBhdGgsIHBhcmVudHMsIG5vQ2hpbGQpID0+IHtcbiAgICAgIGlmIChub0NoaWxkKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKHBhdGgubWFwKG5hbWUgPT4gbmFtZS5zcGxpdCgnOicpWzBdKS5qb2luKCc+JyksIGdyZWVuKG5vZGUuZ2V0VGV4dCh0aGlzLnNyYykpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICAvKipcblx0ICogXG5cdCAqIEBwYXJhbSBhc3QgXG5cdCAqIEBwYXJhbSBjYiByZXR1cm4gdHJ1ZSB0byBza2lwIHRyYXZlcnNpbmcgY2hpbGQgbm9kZVxuXHQgKiBAcGFyYW0gbGV2ZWwgZGVmYXVsdCAwXG5cdCAqL1xuICB0cmF2ZXJzZShhc3Q6IHRzLk5vZGUsXG4gICAgY2I6IChhc3Q6IHRzLk5vZGUsIHBhdGg6IHN0cmluZ1tdLCBwYXJlbnRzOiB0cy5Ob2RlW10sIGlzTGVhZjogYm9vbGVhbikgPT4gYm9vbGVhbiB8IHZvaWQsXG4gICAgcHJvcE5hbWUgPSAnJywgcGFyZW50czogdHMuTm9kZVtdID0gW10sIHBhdGhFbHM6IHN0cmluZ1tdID0gW10pIHtcblxuICAgIGxldCBuZWVkUG9wUGF0aEVsID0gZmFsc2U7XG5cbiAgICBpZiAocGFyZW50cy5sZW5ndGggPiAwKSB7IC8vIGA+IDFgIHRvIHNraXAgc291cmNlIGZpbGVcbiAgICAgIC8vIGxldCBwcm9wTmFtZSA9IHBhcmVudHNbcGFyZW50cy5sZW5ndGggLSAxXSA9PT0gdGhpcy5zcmMgPyAnJyA6IHRoaXMuX2ZpbmRQYXJlbnRQcm9wTmFtZShhc3QsIHBhcmVudHMpO1xuICAgICAgbGV0IHBhdGhFbCA9ICc6JyArIHNrW2FzdC5raW5kXTtcbiAgICAgIGlmIChwcm9wTmFtZSlcbiAgICAgICAgcGF0aEVsID0gJy4nICsgcHJvcE5hbWUgKyBwYXRoRWw7XG4gICAgICBlbHNlXG4gICAgICAgIHBhdGhFbCA9IHJlZChwYXRoRWwpO1xuICAgICAgcGF0aEVscy5wdXNoKHBhdGhFbCk7XG4gICAgICBuZWVkUG9wUGF0aEVsID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zdCByZXMgPSBjYihhc3QsIHBhdGhFbHMsIHBhcmVudHMsIGFzdC5nZXRDaGlsZENvdW50KHRoaXMuc3JjKSA8PSAwKTtcblxuICAgIGlmIChyZXMgIT09IHRydWUpIHtcbiAgICAgIHBhcmVudHMucHVzaChhc3QpO1xuICAgICAgY29uc3QgX3ZhbHVlMmtleSA9IG5ldyBNYXA8YW55LCBzdHJpbmc+KCk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6Zm9yaW5cbiAgICAgIC8vIGZvciAoY29uc3Qga2V5IGluIGFzdCkge1xuICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhc3QpKSB7XG4gICAgICAgIGlmIChrZXkgPT09ICdwYXJlbnQnIHx8IGtleSA9PT0gJ2tpbmQnKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIF92YWx1ZTJrZXkuc2V0KChhc3QgYXMgYW55KVtrZXldLCBrZXkpO1xuICAgICAgfVxuICAgICAgdHMuZm9yRWFjaENoaWxkKGFzdCwgc3ViID0+IHtcbiAgICAgICAgICBzZWxmLnRyYXZlcnNlKHN1YiwgY2IsIF92YWx1ZTJrZXkuZ2V0KHN1YiksIHBhcmVudHMsIHBhdGhFbHMpO1xuICAgICAgICB9LFxuICAgICAgICBzdWJBcnJheSA9PiBzZWxmLnRyYXZlcnNlQXJyYXkoc3ViQXJyYXksIGNiLCBfdmFsdWUya2V5LmdldChzdWJBcnJheSksIHBhcmVudHMsIHBhdGhFbHMpXG4gICAgICApO1xuICAgICAgcGFyZW50cy5wb3AoKTtcbiAgICB9XG4gICAgaWYgKG5lZWRQb3BQYXRoRWwpXG4gICAgICBwYXRoRWxzLnBvcCgpO1xuICB9XG5cbiAgcGF0aEZvckFzdChhc3Q6IHRzLk5vZGUpOiBzdHJpbmcge1xuICAgIGNvbnN0IHBhdGhFbHM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHAgPSBhc3Q7XG4gICAgd2hpbGUgKHAgJiYgcCAhPT0gdGhpcy5zcmMpIHtcbiAgICAgIHBhdGhFbHMucHVzaCh0aGlzLnByb3BOYW1lRm9yQXN0KHApICsgJzonICsgc2tbcC5raW5kXSk7XG4gICAgICBwID0gcC5wYXJlbnQ7XG4gICAgfVxuICAgIHJldHVybiBwYXRoRWxzLnJldmVyc2UoKS5qb2luKCc+Jyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgcHJvcE5hbWVGb3JBc3QoYXN0OiB0cy5Ob2RlKTogc3RyaW5nIHtcbiAgICBjb25zdCBwID0gYXN0LnBhcmVudDtcbiAgICBmb3IgKGNvbnN0IHByb3Agb2YgT2JqZWN0LmtleXMocCkpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gKHAgYXMgYW55KVtwcm9wXTtcbiAgICAgIGlmIChwcm9wID09PSAncGFyZW50JyB8fCBwcm9wID09PSAna2luZCcpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGNvbnN0IGlkeCA9ICh2YWx1ZSBhcyBhbnlbXSkuaW5kZXhPZihhc3QpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICByZXR1cm4gcHJvcCArIGBbJHtpZHh9XWA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZSA9PT0gYXN0KSB7XG4gICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICBwcm90ZWN0ZWQgdHJhdmVyc2VBcnJheShub2RlczogdHMuTm9kZUFycmF5PHRzLk5vZGU+LFxuICAgIGNiOiAoYXN0OiB0cy5Ob2RlLCBwYXRoOiBzdHJpbmdbXSwgcGFyZW50czogdHMuTm9kZVtdLCBpc0xlYWY6IGJvb2xlYW4pID0+IGJvb2xlYW4gfCB2b2lkLFxuICAgIHByb3BOYW1lID0gJycsIHBhcmVudHM6IHRzLk5vZGVbXSA9IFtdLCBwYXRoRWxzOiBzdHJpbmdbXSA9IFtdKSB7XG5cbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBhc3Qgb2Ygbm9kZXMpIHtcbiAgICAgIHRoaXMudHJhdmVyc2UoYXN0LCBjYiwgcHJvcE5hbWUgKyBgWyR7aSsrfV1gLCBwYXJlbnRzLCBwYXRoRWxzKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RDaGFyYWN0ZXIge1xuICBwcm9wZXJ0eU5hbWU/OiBzdHJpbmc7XG4gIHByb3BJbmRleD86IG51bWJlcjtcbiAga2luZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBc3RRdWVyeSBleHRlbmRzIEFzdENoYXJhY3RlciB7XG4gIHRleHQ/OiBSZWdFeHA7XG59XG5cbmV4cG9ydCBjbGFzcyBRdWVyeSB7XG4gIHF1ZXJ5UGF0aHM6IEFzdENoYXJhY3RlcltdW107XG5cbiAgY29uc3RydWN0b3IocXVlcnk6IHN0cmluZykge1xuICAgIHRoaXMucXVlcnlQYXRocyA9IHF1ZXJ5LnRyaW0oKS5yZXBsYWNlKC9cXHMqPlxccyovZywgJz4nKS5zcGxpdCgnICcpLm1hcChwYXRocyA9PiBwYXRocy5zcGxpdCgnPicpXG4gICAgICAubWFwKHNpbmdsZUFzdERlc2MgPT4gdGhpcy5fcGFyc2VEZXNjKHNpbmdsZUFzdERlc2MpKSk7XG4gIH1cblxuICBtYXRjaGVzKHBhdGg6IHN0cmluZ1tdKTogYm9vbGVhbiB7XG4gICAgbGV0IHRlc3RQb3MgPSBwYXRoLmxlbmd0aCAtIDE7XG4gICAgY29uc3Qgc3RhcnRUZXN0UG9zID0gdGVzdFBvcztcbiAgICBmb3IgKGNvbnN0IGNvbnNlY3V0aXZlTm9kZXMgb2YgdGhpcy5xdWVyeVBhdGhzLnNsaWNlKDApLnJldmVyc2UoKSkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgaWYgKHRoaXMubWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMoY29uc2VjdXRpdmVOb2RlcywgcGF0aCwgdGVzdFBvcykpIHtcbiAgICAgICAgICB0ZXN0UG9zIC09IGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9IGVsc2UgaWYgKHRlc3RQb3MgPT09IHN0YXJ0VGVzdFBvcykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0ZXN0UG9zLS07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnNlY3V0aXZlTm9kZXMubGVuZ3RoID4gdGVzdFBvcyArIDEpXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfcGFyc2VEZXNjKHNpbmdsZUFzdERlc2M6IHN0cmluZyk6IEFzdFF1ZXJ5IHtcbiAgICBjb25zdCBhc3RDaGFyOiBBc3RRdWVyeSA9IHt9O1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lXG5cdFx0XHRsZXQgbSA9IC9eKD86XFwuKFthLXpBLVowLTlfJF0rKSg/OlxcWyhbMC05XSopXFxdKT8pPyg/OlxcOihbYS16QS1aMC05XyRdKykpPyR8XlxcKiQvLmV4ZWMoc2luZ2xlQXN0RGVzYyk7XG4gICAgICBpZiAobSA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBxdWVyeSBzdHJpbmcgXCIke3llbGxvdyhzaW5nbGVBc3REZXNjKX1cImApO1xuICAgICAgfVxuICAgICAgaWYgKG1bMV0pIHtcbiAgICAgICAgYXN0Q2hhci5wcm9wZXJ0eU5hbWUgPSBtWzFdO1xuICAgICAgICBpZiAobVsyXSlcbiAgICAgICAgICBhc3RDaGFyLnByb3BJbmRleCA9IHBhcnNlSW50KG1bMl0sIDEwKTtcbiAgICAgIH1cbiAgICAgIGlmIChtWzNdKVxuICAgICAgICBhc3RDaGFyLmtpbmQgPSBtWzNdO1xuICAgICAgLy8gaWYgKG1bNF0pXG4gICAgICAvLyBcdGFzdENoYXIudGV4dCA9IG5ldyBSZWdFeHAobVs0XSk7XG4gICAgICByZXR1cm4gYXN0Q2hhcjtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hlc0FzdChxdWVyeTogQXN0UXVlcnksIHRhcmdldDogQXN0Q2hhcmFjdGVyKTogYm9vbGVhbiB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMocXVlcnkpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IChxdWVyeSBhcyBhbnkpW2tleV07XG4gICAgICBpZiAoXy5pc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgICAgaWYgKCEodmFsdWUgYXMgUmVnRXhwKS50ZXN0KCh0YXJnZXQgYXMgYW55KVtrZXldKSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKCh0YXJnZXQgYXMgYW55KVtrZXldICE9PSB2YWx1ZSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgbWF0Y2hlc0NvbnNlY3V0aXZlTm9kZXMocXVlcnlOb2RlczogQXN0Q2hhcmFjdGVyW10sIHBhdGg6IHN0cmluZ1tdLCB0ZXN0UG9zOiBudW1iZXIpIHtcbiAgICBpZiAocXVlcnlOb2Rlcy5sZW5ndGggPiB0ZXN0UG9zICsgMSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHF1ZXJ5IG9mIHF1ZXJ5Tm9kZXMuc2xpY2UoMCkucmV2ZXJzZSgpKSB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLl9wYXJzZURlc2MocGF0aFt0ZXN0UG9zLS1dKTtcbiAgICAgIGlmICghdGhpcy5tYXRjaGVzQXN0KHF1ZXJ5LCB0YXJnZXQpKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG4iXX0=
