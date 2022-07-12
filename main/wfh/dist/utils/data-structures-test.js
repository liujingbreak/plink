"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const _ = __importStar(require("lodash"));
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
        let randomKeyIdx = Math.floor(Math.random() * keys.length);
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