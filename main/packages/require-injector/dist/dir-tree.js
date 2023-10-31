"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirTree = void 0;
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
class DirTree {
    constructor() {
        this.root = { map: {}, name: '' };
    }
    putRootData(data) {
        this.root.data = data;
    }
    getRootData() {
        return this.root.data;
    }
    putData(path, data) {
        if (!path) {
            this.putRootData(data);
            return;
        }
        const tree = this.ensureNode(path);
        tree.data = data;
    }
    getData(path) {
        if (!path) {
            return this.getRootData();
        }
        const tree = this.findNode(path);
        return tree ? tree.data : null;
    }
    /**
       * @return Array of data
       */
    getAllData(path) {
        if (!Array.isArray(path)) {
            if (path_1.default.sep === '\\')
                path = path.toLowerCase();
            return this.getAllData(path.split(/[/\\]/));
        }
        // if (path[0] === '')
        // 	path.shift();
        let tree = this.root;
        const datas = [];
        if (lodash_1.default.has(tree, 'data'))
            datas.push(tree.data);
        lodash_1.default.every(path, name => {
            if (lodash_1.default.has(tree, ['map', name])) {
                tree = tree.map[name];
                if (lodash_1.default.has(tree, 'data'))
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
            if (path_1.default.sep === '\\')
                path = path.toLowerCase();
            return this.ensureNode(path.split(/[/\\]/));
        }
        let tree = this.root;
        lodash_1.default.each(path, name => {
            if (lodash_1.default.has(tree, ['map', name])) {
                tree = tree.map[name];
            }
            else {
                const child = { map: {}, name };
                tree.map[name] = child;
                tree = child;
            }
        });
        return tree;
    }
    findNode(path) {
        if (!Array.isArray(path)) {
            if (path_1.default.sep === '\\')
                path = path.toLowerCase();
            return this.findNode(path.split(/[/\\]/));
        }
        let tree = this.root;
        lodash_1.default.every(path, name => {
            if (lodash_1.default.has(tree, ['map', name])) {
                tree = tree.map[name];
                return true;
            }
            tree = null;
            return false;
        });
        return tree;
    }
    traverse(level = 0, tree, lines = []) {
        let isRoot = false;
        if (!level)
            level = 0;
        if (!tree)
            tree = this.root;
        if (!lines) {
            isRoot = true;
            lines = [];
        }
        const indent = lodash_1.default.repeat('│  ', level);
        lines.push(indent + '├─ ' + tree.name + (tree.data ? ' [x]' : ''));
        lodash_1.default.each(tree.map, (subTree, subNames) => {
            this.traverse(level + 1, subTree, lines);
        });
        return isRoot ? lines.join('\n') : lines;
    }
}
exports.DirTree = DirTree;
//# sourceMappingURL=dir-tree.js.map