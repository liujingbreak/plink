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
exports.test = void 0;
const data_structures_1 = require("./data-structures");
const graph_1 = require("./graph");
const _ = __importStar(require("lodash"));
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
        // eslint-disable-next-line no-console
        console.log(`${_.repeat('| ', level)}- ${node.key + ''}: ${node.isRed ? 'red' : 'black'}`);
        return [node.left, node.right].filter((node) => node != null);
    }
}
exports.test = test;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdHJ1Y3R1cmVzLXRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9kYXRhLXN0cnVjdHVyZXMtdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdURBQTJEO0FBQzNELG1DQUFvQztBQUNwQywwQ0FBNEI7QUFFNUIsU0FBZ0IsSUFBSTtJQUNsQixNQUFNLElBQUksR0FBRyxJQUFJLDhCQUFZLEVBQVUsQ0FBQztJQUN4QyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQzVCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2hCO0lBRUQsSUFBSSxHQUFHLEdBQUcsSUFBSSxXQUFHLENBQXFCLFdBQVcsQ0FBQyxDQUFDO0lBRW5ELEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQztJQUV4QixzQ0FBc0M7SUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzNDLGlDQUFpQztJQUNqQyxnQ0FBZ0M7SUFDaEMsc0JBQXNCO0lBQ3RCLG9EQUFvRDtJQUNwRCx1REFBdUQ7SUFDdkQsNkJBQTZCO0lBQzdCLE1BQU07SUFDTixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM3QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQ3ZDLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMzRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0Isc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDbEI7SUFFQyxHQUFHLEdBQUcsSUFBSSxXQUFHLENBQXFCLFdBQVcsQ0FBQyxDQUFDO0lBQy9DLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQztJQUUxQixTQUFTLFdBQVcsQ0FBQyxJQUF3QixFQUFFLE1BQWtDLEVBQUUsS0FBYTtRQUM5RixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUMzRixPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUErQixFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQzdGLENBQUM7QUFDSCxDQUFDO0FBeENELG9CQXdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVkQmxhY2tUcmVlLCBSYlRyZWVOb2RlfSBmcm9tICcuL2RhdGEtc3RydWN0dXJlcyc7XG5pbXBvcnQge0RGUywgVmVydGV4fSBmcm9tICcuL2dyYXBoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuZXhwb3J0IGZ1bmN0aW9uIHRlc3QoKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgUmVkQmxhY2tUcmVlPG51bWJlcj4oKTtcbiAgY29uc3QgbGVuID0gMzA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdhZGQga2V5JywgaSk7XG4gICAgdHJlZS5pbnNlcnQoaSk7XG4gIH1cblxuICBsZXQgZGZzID0gbmV3IERGUzxSYlRyZWVOb2RlPG51bWJlcj4+KGFkamFjZW5jeU9mKTtcblxuICBkZnMudmlzaXQoW3RyZWUucm9vdCFdKTtcblxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0tIGRlbGV0aW9uJyk7XG4gIC8vIFs1LCA4ICwgMSwgNl0uZm9yRWFjaChrZXkgPT4ge1xuICAvLyAgIGNvbnNvbGUubG9nKCdkZWxldGUnLCBrZXkpO1xuICAvLyAgIHRyZWUuZGVsZXRlKGtleSk7XG4gIC8vICAgZGZzID0gbmV3IERGUzxSYlRyZWVOb2RlPG51bWJlcj4+KGFkamFjZW5jeU9mKTtcbiAgLy8gICBjb25zb2xlLmxvZyhgLS0tLS0gYWZ0ZXIgZGVsZXRpb24gJHtrZXl9IC0tLS0tLWApO1xuICAvLyAgIGRmcy52aXNpdChbdHJlZS5yb290IV0pO1xuICAvLyB9KTtcbiAgY29uc3Qga2V5cyA9IF8ucmFuZ2UoMCwgbGVuKTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBsZW4gLyAyOyBpIDwgbDsgaSsrKSB7XG4gICAgbGV0IHJhbmRvbUtleUlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGtleXMubGVuZ3RoKTtcbiAgICBjb25zdCBrZXkgPSBrZXlzW3JhbmRvbUtleUlkeF07XG4gICAga2V5cy5zcGxpY2UocmFuZG9tS2V5SWR4LCAxKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdkZWxldGUga2V5Jywga2V5KTtcbiAgICB0cmVlLmRlbGV0ZShrZXkpO1xuICB9XG5cbiAgICBkZnMgPSBuZXcgREZTPFJiVHJlZU5vZGU8bnVtYmVyPj4oYWRqYWNlbmN5T2YpO1xuICAgIGRmcy52aXNpdChbdHJlZS5yb290IV0pO1xuXG4gIGZ1bmN0aW9uIGFkamFjZW5jeU9mKG5vZGU6IFJiVHJlZU5vZGU8bnVtYmVyPiwgdmVydGV4OiBWZXJ0ZXg8UmJUcmVlTm9kZTxudW1iZXI+PiwgbGV2ZWw6IG51bWJlcikge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYCR7Xy5yZXBlYXQoJ3wgJywgbGV2ZWwpfS0gJHtub2RlLmtleSArICcnfTogJHtub2RlLmlzUmVkID8gJ3JlZCcgOiAnYmxhY2snfWApO1xuICAgIHJldHVybiBbbm9kZS5sZWZ0LCBub2RlLnJpZ2h0XS5maWx0ZXIoKG5vZGUpIDogbm9kZSBpcyBSYlRyZWVOb2RlPG51bWJlcj4gPT4gbm9kZSAhPSBudWxsKTtcbiAgfVxufVxuIl19