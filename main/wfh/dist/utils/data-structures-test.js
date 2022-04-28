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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1zdHJ1Y3R1cmVzLXRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9kYXRhLXN0cnVjdHVyZXMtdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVEQUEyRDtBQUMzRCxtQ0FBb0M7QUFDcEMsMENBQTRCO0FBRTVCLFNBQWdCLElBQUk7SUFDbEIsTUFBTSxJQUFJLEdBQUcsSUFBSSw4QkFBWSxFQUFVLENBQUM7SUFDeEMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoQjtJQUVELElBQUksR0FBRyxHQUFHLElBQUksV0FBRyxDQUFxQixXQUFXLENBQUMsQ0FBQztJQUVuRCxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7SUFFeEIsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUMzQyxpQ0FBaUM7SUFDakMsZ0NBQWdDO0lBQ2hDLHNCQUFzQjtJQUN0QixvREFBb0Q7SUFDcEQsdURBQXVEO0lBQ3ZELDZCQUE2QjtJQUM3QixNQUFNO0lBQ04sTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN2QyxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ2xCO0lBRUMsR0FBRyxHQUFHLElBQUksV0FBRyxDQUFxQixXQUFXLENBQUMsQ0FBQztJQUMvQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUM7SUFFMUIsU0FBUyxXQUFXLENBQUMsSUFBd0IsRUFBRSxNQUFrQyxFQUFFLEtBQWE7UUFDOUYsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDM0YsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBK0IsRUFBRSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztJQUM3RixDQUFDO0FBQ0gsQ0FBQztBQXhDRCxvQkF3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlZEJsYWNrVHJlZSwgUmJUcmVlTm9kZX0gZnJvbSAnLi9kYXRhLXN0cnVjdHVyZXMnO1xuaW1wb3J0IHtERlMsIFZlcnRleH0gZnJvbSAnLi9ncmFwaCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmV4cG9ydCBmdW5jdGlvbiB0ZXN0KCkge1xuICBjb25zdCB0cmVlID0gbmV3IFJlZEJsYWNrVHJlZTxudW1iZXI+KCk7XG4gIGNvbnN0IGxlbiA9IDMwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnYWRkIGtleScsIGkpO1xuICAgIHRyZWUuaW5zZXJ0KGkpO1xuICB9XG5cbiAgbGV0IGRmcyA9IG5ldyBERlM8UmJUcmVlTm9kZTxudW1iZXI+PihhZGphY2VuY3lPZik7XG5cbiAgZGZzLnZpc2l0KFt0cmVlLnJvb3QhXSk7XG5cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tLSBkZWxldGlvbicpO1xuICAvLyBbNSwgOCAsIDEsIDZdLmZvckVhY2goa2V5ID0+IHtcbiAgLy8gICBjb25zb2xlLmxvZygnZGVsZXRlJywga2V5KTtcbiAgLy8gICB0cmVlLmRlbGV0ZShrZXkpO1xuICAvLyAgIGRmcyA9IG5ldyBERlM8UmJUcmVlTm9kZTxudW1iZXI+PihhZGphY2VuY3lPZik7XG4gIC8vICAgY29uc29sZS5sb2coYC0tLS0tIGFmdGVyIGRlbGV0aW9uICR7a2V5fSAtLS0tLS1gKTtcbiAgLy8gICBkZnMudmlzaXQoW3RyZWUucm9vdCFdKTtcbiAgLy8gfSk7XG4gIGNvbnN0IGtleXMgPSBfLnJhbmdlKDAsIGxlbik7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gbGVuIC8gMjsgaSA8IGw7IGkrKykge1xuICAgIGxldCByYW5kb21LZXlJZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBrZXlzLmxlbmd0aCk7XG4gICAgY29uc3Qga2V5ID0ga2V5c1tyYW5kb21LZXlJZHhdO1xuICAgIGtleXMuc3BsaWNlKHJhbmRvbUtleUlkeCwgMSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnZGVsZXRlIGtleScsIGtleSk7XG4gICAgdHJlZS5kZWxldGUoa2V5KTtcbiAgfVxuXG4gICAgZGZzID0gbmV3IERGUzxSYlRyZWVOb2RlPG51bWJlcj4+KGFkamFjZW5jeU9mKTtcbiAgICBkZnMudmlzaXQoW3RyZWUucm9vdCFdKTtcblxuICBmdW5jdGlvbiBhZGphY2VuY3lPZihub2RlOiBSYlRyZWVOb2RlPG51bWJlcj4sIHZlcnRleDogVmVydGV4PFJiVHJlZU5vZGU8bnVtYmVyPj4sIGxldmVsOiBudW1iZXIpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGAke18ucmVwZWF0KCd8ICcsIGxldmVsKX0tICR7bm9kZS5rZXkgKyAnJ306ICR7bm9kZS5pc1JlZCA/ICdyZWQnIDogJ2JsYWNrJ31gKTtcbiAgICByZXR1cm4gW25vZGUubGVmdCwgbm9kZS5yaWdodF0uZmlsdGVyKChub2RlKSA6IG5vZGUgaXMgUmJUcmVlTm9kZTxudW1iZXI+ID0+IG5vZGUgIT0gbnVsbCk7XG4gIH1cbn1cbiJdfQ==