"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const data_structures_1 = require("./data-structures");
const graph_1 = require("./graph");
function test() {
    const tree = new data_structures_1.RedBlackTree();
    const len = 30;
    for (let i = 0; i < len; i++) {
        // eslint-disable-next-line no-console
        console.log('add key', i);
        tree.insert(i);
    }
    let dfs = new graph_1.DFS(adjacencyOf);
    dfs.visit([tree.root]);
    // eslint-disable-next-line no-console
    console.log('------------------ deletion');
    // [5, 8 , 1, 6].forEach(key => {
    //   console.log('delete', key);
    //   tree.delete(key);
    //   dfs = new DFS<RbTreeNode<number>>(adjacencyOf);
    //   console.log(`----- after deletion ${key} ------`);
    //   dfs.visit([tree.root!]);
    // });
    const keys = _.range(0, len);
    for (let i = 0, l = len / 2; i < l; i++) {
        const randomKeyIdx = Math.floor(Math.random() * keys.length);
        const key = keys[randomKeyIdx];
        keys.splice(randomKeyIdx, 1);
        // eslint-disable-next-line no-console
        console.log('delete key', key);
        tree.delete(key);
    }
    dfs = new graph_1.DFS(adjacencyOf);
    dfs.visit([tree.root]);
    function adjacencyOf(node, vertex, level) {
        var _a;
        // eslint-disable-next-line no-console
        console.log(`${_.repeat('| ', level)}- ${node.p ? ((_a = node.p) === null || _a === void 0 ? void 0 : _a.left) === node ? 'left' : 'right' : 'root'} ${node.key + ''}: ${node.isRed ? 'red' : 'black'}`);
        return [node.left, node.right].filter((node) => node != null);
    }
}
exports.test = test;
//# sourceMappingURL=data-structures-test.js.map