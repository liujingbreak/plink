"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchedHandlers = exports.addToHandlerTree = exports.DirTree = void 0;
const dir_tree_1 = require("./dir-tree");
Object.defineProperty(exports, "DirTree", { enumerable: true, get: function () { return dir_tree_1.DirTree; } });
const url_1 = __importDefault(require("url"));
// import get from 'lodash/get';
// import trimStart from 'lodash/trimStart';
const trim_1 = __importDefault(require("lodash/trim"));
const escapeRegExp_1 = __importDefault(require("lodash/escapeRegExp"));
function addToHandlerTree(path, handler, tree) {
    if (path.startsWith('/'))
        path = path.slice(1);
    let leadingPath = path;
    const splittedPath = path.split('/');
    let restingRegex;
    const paramIdx = splittedPath.findIndex(element => element.startsWith(':') || /\s*\*\s*/.test(element));
    if (paramIdx >= 0) {
        leadingPath = splittedPath.slice(0, paramIdx).join('/');
        restingRegex = new RegExp('^' + splittedPath.slice(paramIdx).map(el => {
            if (el.startsWith(':')) {
                return '([^/]+)';
            }
            else if (el === '*') {
                return '.*';
            }
            else {
                return escapeRegExp_1.default(el);
            }
        }).join('\\/') + '$');
        // tslint:disable-next-line:no-console
        console.log(`[path-matcher] path ${path}'s regexp:`, restingRegex);
    }
    const data = {
        handler,
        treePath: leadingPath,
        restingRegex
    };
    const existing = tree.getData(leadingPath);
    if (existing) {
        existing.push(data);
    }
    else {
        tree.putData(leadingPath, [data]);
    }
}
exports.addToHandlerTree = addToHandlerTree;
function matchedHandlers(tree, reqUrl) {
    reqUrl = trim_1.default(reqUrl, '/');
    const found = [];
    lookup(found, tree, reqUrl);
    const parsedReqUrl = url_1.default.parse(reqUrl);
    if (parsedReqUrl.query) {
        lookup(found, tree, parsedReqUrl.pathname || '');
    }
    return found;
}
exports.matchedHandlers = matchedHandlers;
function lookup(found, tree, reqUrl) {
    tree.getAllData(reqUrl).forEach(shandlers => {
        for (const sh of shandlers) {
            let restingReqUrl = reqUrl.slice(sh.treePath.length);
            restingReqUrl = trim_1.default(restingReqUrl, '/');
            if (sh.restingRegex == null) {
                if (restingReqUrl.length === 0) {
                    found.push(sh.handler);
                    continue;
                }
                continue;
            }
            const re = sh.restingRegex.exec(restingReqUrl);
            if (re) {
                found.push(sh.handler);
            }
        }
        return false;
    });
}

//# sourceMappingURL=path-matcher.js.map
