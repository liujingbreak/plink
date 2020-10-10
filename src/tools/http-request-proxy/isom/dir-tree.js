"use strict";
/**
 * Basically it is a copy of require-injector/dist/dir-tree, but for browser side
 * and not related to local file system, as a pure data structure
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirTree = void 0;
const has_1 = __importDefault(require("lodash/has"));
const repeat_1 = __importDefault(require("lodash/repeat"));
const each_1 = __importDefault(require("lodash/each"));
class DirTree {
    constructor(caseSensitive = false) {
        this.caseSensitive = caseSensitive;
        this.root = { map: {}, name: '' };
    }
    putRootData(data) {
        this.root.data = data;
    }
    getRootData() {
        return this.root.data;
    }
    putData(path, data) {
        var tree = this.ensureNode(path);
        tree.data = data;
    }
    getData(path) {
        var tree = this.findNode(path);
        return tree ? tree.data : null;
    }
    /**
       * @return Array of data
       */
    getAllData(path) {
        if (!Array.isArray(path)) {
            if (this.caseSensitive)
                path = path.toLowerCase();
            return this.getAllData(path.split(/[/\\]/));
        }
        let tree = this.root;
        const datas = [];
        if (has_1.default(tree, 'data'))
            datas.push(tree.data);
        path.every(name => {
            if (has_1.default(tree, ['map', name])) {
                tree = tree.map[name];
                if (has_1.default(tree, 'data'))
                    datas.push(tree.data);
                return true;
            }
            // tree = null;
            return false;
        });
        return datas;
    }
    ensureNode(path) {
        if (!Array.isArray(path)) {
            if (this.caseSensitive)
                path = path.toLowerCase();
            return this.ensureNode(path.split(/[/\\]/));
        }
        var tree = this.root;
        each_1.default(path, name => {
            if (has_1.default(tree, ['map', name])) {
                tree = tree.map[name];
            }
            else {
                var child = { map: {}, name };
                tree.map[name] = child;
                tree = child;
            }
        });
        return tree;
    }
    findNode(path) {
        if (!Array.isArray(path)) {
            if (this.caseSensitive)
                path = path.toLowerCase();
            return this.findNode(path.split(/[/\\]/));
        }
        var tree = this.root;
        path.every(name => {
            if (has_1.default(tree, ['map', name])) {
                tree = tree.map[name];
                return true;
            }
            tree = null;
            return false;
        });
        return tree;
    }
    traverse(level = 0, tree, lines) {
        var isRoot = false;
        if (!tree)
            tree = this.root;
        if (!lines) {
            isRoot = true;
            lines = [];
        }
        var indent = repeat_1.default('│  ', level);
        lines.push(indent + '├─ ' + tree.name + (tree.data ? ' [x]' : ''));
        each_1.default(tree.map, (subTree) => {
            this.traverse(level + 1, subTree, lines);
        });
        return isRoot ? lines.join('\n') : lines;
    }
    toString() {
        return this.traverse();
    }
}
exports.DirTree = DirTree;

//# sourceMappingURL=dir-tree.js.map
