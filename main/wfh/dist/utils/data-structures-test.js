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
Object.defineProperty(exports, "__esModule", { value: true });
exports.printTestTree = void 0;
const data_structures_1 = require("./data-structures");
const graph_1 = require("./graph");
const _ = __importStar(require("lodash"));
function printTestTree() {
    const tree = new data_structures_1.RedBlackTree();
    const len = 24;
    for (let i = 0; i < len; i++) {
        // eslint-disable-next-line no-console
        console.log('add key', i);
        tree.insert(i);
    }
    let bfs = new graph_1.BFS(adjacencyOf);
    bfs.visit([tree.root]);
    const keys = _.range(0, len);
    for (let i = 0; i < 6; i++) {
        let randomKeyIdx = Math.floor(Math.random() * keys.length);
        const key = keys[randomKeyIdx];
        keys.splice(randomKeyIdx, 1);
        // eslint-disable-next-line no-console
        console.log('delete key', key);
        tree.delete(key);
    }
    bfs = new graph_1.BFS(adjacencyOf);
    bfs.visit([tree.root]);
    function adjacencyOf(node, vertex) {
        // eslint-disable-next-line no-console
        console.log(`(${vertex.d}) ${node.key}: ${node.isRed ? 'red' : 'black'}`);
        return [node.left, node.right]
            .filter(node => node != null);
    }
}
exports.printTestTree = printTestTree;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdHJ1Y3R1cmVzLXRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9kYXRhLXN0cnVjdHVyZXMtdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdURBQWlFO0FBQ2pFLG1DQUFvQztBQUNwQywwQ0FBNEI7QUFFNUIsU0FBZ0IsYUFBYTtJQUMzQixNQUFNLElBQUksR0FBRyxJQUFJLDhCQUFZLEVBQVUsQ0FBQztJQUN4QyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2hCO0lBRUQsSUFBSSxHQUFHLEdBQUcsSUFBSSxXQUFHLENBQTJCLFdBQVcsQ0FBQyxDQUFDO0lBRXpELEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQztJQUV4QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzFCLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0Isc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDbEI7SUFFRCxHQUFHLEdBQUcsSUFBSSxXQUFHLENBQTJCLFdBQVcsQ0FBQyxDQUFDO0lBQ3JELEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQztJQUV4QixTQUFTLFdBQVcsQ0FBQyxJQUE4QixFQUFFLE1BQXdDO1FBQzNGLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMxRSxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO2FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxJQUFJLENBQStCLENBQUM7SUFDaEUsQ0FBQztBQUNILENBQUM7QUFoQ0Qsc0NBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZWRCbGFja1RyZWUsIFJlZEJsYWNrVHJlZU5vZGV9IGZyb20gJy4vZGF0YS1zdHJ1Y3R1cmVzJztcbmltcG9ydCB7QkZTLCBWZXJ0ZXh9IGZyb20gJy4vZ3JhcGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRUZXN0VHJlZSgpIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBSZWRCbGFja1RyZWU8bnVtYmVyPigpO1xuICBjb25zdCBsZW4gPSAyNDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ2FkZCBrZXknLCBpKTtcbiAgICB0cmVlLmluc2VydChpKTtcbiAgfVxuXG4gIGxldCBiZnMgPSBuZXcgQkZTPFJlZEJsYWNrVHJlZU5vZGU8bnVtYmVyPj4oYWRqYWNlbmN5T2YpO1xuXG4gIGJmcy52aXNpdChbdHJlZS5yb290IV0pO1xuXG4gIGNvbnN0IGtleXMgPSBfLnJhbmdlKDAsIGxlbik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgNjsgaSsrKSB7XG4gICAgbGV0IHJhbmRvbUtleUlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGtleXMubGVuZ3RoKTtcbiAgICBjb25zdCBrZXkgPSBrZXlzW3JhbmRvbUtleUlkeF07XG4gICAga2V5cy5zcGxpY2UocmFuZG9tS2V5SWR4LCAxKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdkZWxldGUga2V5Jywga2V5KTtcbiAgICB0cmVlLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgYmZzID0gbmV3IEJGUzxSZWRCbGFja1RyZWVOb2RlPG51bWJlcj4+KGFkamFjZW5jeU9mKTtcbiAgYmZzLnZpc2l0KFt0cmVlLnJvb3QhXSk7XG5cbiAgZnVuY3Rpb24gYWRqYWNlbmN5T2Yobm9kZTogUmVkQmxhY2tUcmVlTm9kZTxudW1iZXI+LCB2ZXJ0ZXg6IFZlcnRleDxSZWRCbGFja1RyZWVOb2RlPG51bWJlcj4+KSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgKCR7dmVydGV4LmR9KSAke25vZGUua2V5fTogJHtub2RlLmlzUmVkID8gJ3JlZCcgOiAnYmxhY2snfWApO1xuICAgIHJldHVybiBbbm9kZS5sZWZ0LCBub2RlLnJpZ2h0XVxuICAgICAgLmZpbHRlcihub2RlID0+IG5vZGUgIT0gbnVsbCkgYXMgUmVkQmxhY2tUcmVlTm9kZTxudW1iZXI+W107XG4gIH1cbn1cbiJdfQ==