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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdHJ1Y3R1cmVzLXRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9kYXRhLXN0cnVjdHVyZXMtdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1Qix1REFBMkQ7QUFDM0QsbUNBQW9DO0FBRXBDLFNBQWdCLElBQUk7SUFDbEIsTUFBTSxJQUFJLEdBQUcsSUFBSSw4QkFBWSxFQUFVLENBQUM7SUFDeEMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoQjtJQUVELElBQUksR0FBRyxHQUFHLElBQUksV0FBRyxDQUFxQixXQUFXLENBQUMsQ0FBQztJQUVuRCxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7SUFFeEIsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUMzQyxpQ0FBaUM7SUFDakMsZ0NBQWdDO0lBQ2hDLHNCQUFzQjtJQUN0QixvREFBb0Q7SUFDcEQsdURBQXVEO0lBQ3ZELDZCQUE2QjtJQUM3QixNQUFNO0lBQ04sTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN2QyxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ2xCO0lBRUQsR0FBRyxHQUFHLElBQUksV0FBRyxDQUFxQixXQUFXLENBQUMsQ0FBQztJQUMvQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7SUFFeEIsU0FBUyxXQUFXLENBQUMsSUFBd0IsRUFBRSxNQUFrQyxFQUFFLEtBQWE7O1FBQzlGLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxNQUFBLElBQUksQ0FBQyxDQUFDLDBDQUFFLElBQUksTUFBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3pKLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQStCLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7SUFDN0YsQ0FBQztBQUNILENBQUM7QUF4Q0Qsb0JBd0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtSZWRCbGFja1RyZWUsIFJiVHJlZU5vZGV9IGZyb20gJy4vZGF0YS1zdHJ1Y3R1cmVzJztcbmltcG9ydCB7REZTLCBWZXJ0ZXh9IGZyb20gJy4vZ3JhcGgnO1xuXG5leHBvcnQgZnVuY3Rpb24gdGVzdCgpIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBSZWRCbGFja1RyZWU8bnVtYmVyPigpO1xuICBjb25zdCBsZW4gPSAzMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ2FkZCBrZXknLCBpKTtcbiAgICB0cmVlLmluc2VydChpKTtcbiAgfVxuXG4gIGxldCBkZnMgPSBuZXcgREZTPFJiVHJlZU5vZGU8bnVtYmVyPj4oYWRqYWNlbmN5T2YpO1xuXG4gIGRmcy52aXNpdChbdHJlZS5yb290IV0pO1xuXG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLS0gZGVsZXRpb24nKTtcbiAgLy8gWzUsIDggLCAxLCA2XS5mb3JFYWNoKGtleSA9PiB7XG4gIC8vICAgY29uc29sZS5sb2coJ2RlbGV0ZScsIGtleSk7XG4gIC8vICAgdHJlZS5kZWxldGUoa2V5KTtcbiAgLy8gICBkZnMgPSBuZXcgREZTPFJiVHJlZU5vZGU8bnVtYmVyPj4oYWRqYWNlbmN5T2YpO1xuICAvLyAgIGNvbnNvbGUubG9nKGAtLS0tLSBhZnRlciBkZWxldGlvbiAke2tleX0gLS0tLS0tYCk7XG4gIC8vICAgZGZzLnZpc2l0KFt0cmVlLnJvb3QhXSk7XG4gIC8vIH0pO1xuICBjb25zdCBrZXlzID0gXy5yYW5nZSgwLCBsZW4pO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IGxlbiAvIDI7IGkgPCBsOyBpKyspIHtcbiAgICBsZXQgcmFuZG9tS2V5SWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICoga2V5cy5sZW5ndGgpO1xuICAgIGNvbnN0IGtleSA9IGtleXNbcmFuZG9tS2V5SWR4XTtcbiAgICBrZXlzLnNwbGljZShyYW5kb21LZXlJZHgsIDEpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ2RlbGV0ZSBrZXknLCBrZXkpO1xuICAgIHRyZWUuZGVsZXRlKGtleSk7XG4gIH1cblxuICBkZnMgPSBuZXcgREZTPFJiVHJlZU5vZGU8bnVtYmVyPj4oYWRqYWNlbmN5T2YpO1xuICBkZnMudmlzaXQoW3RyZWUucm9vdCFdKTtcblxuICBmdW5jdGlvbiBhZGphY2VuY3lPZihub2RlOiBSYlRyZWVOb2RlPG51bWJlcj4sIHZlcnRleDogVmVydGV4PFJiVHJlZU5vZGU8bnVtYmVyPj4sIGxldmVsOiBudW1iZXIpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGAke18ucmVwZWF0KCd8ICcsIGxldmVsKX0tICR7bm9kZS5wID8gbm9kZS5wPy5sZWZ0ID09PSBub2RlID8gJ2xlZnQnIDogJ3JpZ2h0JyA6ICdyb290J30gJHtub2RlLmtleSArICcnfTogJHtub2RlLmlzUmVkID8gJ3JlZCcgOiAnYmxhY2snfWApO1xuICAgIHJldHVybiBbbm9kZS5sZWZ0LCBub2RlLnJpZ2h0XS5maWx0ZXIoKG5vZGUpIDogbm9kZSBpcyBSYlRyZWVOb2RlPG51bWJlcj4gPT4gbm9kZSAhPSBudWxsKTtcbiAgfVxufVxuIl19