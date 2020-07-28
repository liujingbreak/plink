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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDrcpSymlink = exports.rootDir = exports.findRootDir = void 0;
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let rootDir;
exports.rootDir = rootDir;
findRootDir();
function findRootDir() {
    let dir = process.cwd();
    while (!fs.existsSync(Path.resolve(dir, 'dist/dr-state.json'))) {
        const parentDir = Path.dirname(dir);
        if (parentDir === dir) {
            dir = process.cwd();
            break;
        }
        dir = parentDir;
    }
    exports.rootDir = rootDir = dir;
    return dir;
}
exports.findRootDir = findRootDir;
exports.isDrcpSymlink = fs.lstatSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')).isSymbolicLink();
function default_1() {
    const nodePaths = [Path.resolve(rootDir, 'node_modules')];
    if (rootDir !== process.cwd()) {
        nodePaths.unshift(Path.resolve(process.cwd(), 'node_modules'));
    }
    if (exports.isDrcpSymlink)
        nodePaths.push(fs.realpathSync(Path.resolve(rootDir, 'node_modules/dr-comp-package')) + Path.sep + 'node_modules');
    if (process.env.NODE_PATH) {
        nodePaths.push(...process.env.NODE_PATH.split(Path.delimiter));
    }
    process.env.NODE_PATH = nodePaths.join(Path.delimiter);
    require('module').Module._initPaths();
    // console.log(process.env.NODE_PATH)
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS1wYXRoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvbm9kZS1wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBRXpCLElBQUksT0FBZSxDQUFDO0FBaUJaLDBCQUFPO0FBaEJmLFdBQVcsRUFBRSxDQUFDO0FBRWQsU0FBZ0IsV0FBVztJQUN6QixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDeEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxFQUFFO1FBQzlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEMsSUFBSSxTQUFTLEtBQUssR0FBRyxFQUFFO1lBQ3JCLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDcEIsTUFBTTtTQUNQO1FBQ0QsR0FBRyxHQUFHLFNBQVMsQ0FBQztLQUNqQjtJQUNELGtCQUFBLE9BQU8sR0FBRyxHQUFHLENBQUM7SUFDZCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFaRCxrQ0FZQztBQUlZLFFBQUEsYUFBYSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFRLEVBQUUsOEJBQThCLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDO0FBR25IO0lBQ0UsTUFBTSxTQUFTLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO0lBQzFELElBQUksT0FBTyxLQUFLLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUM3QixTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7S0FDaEU7SUFDRCxJQUFJLHFCQUFhO1FBQ2YsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBUSxFQUFFLDhCQUE4QixDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLGNBQWMsQ0FBQyxDQUFDO0lBQ3RILElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUU7UUFDekIsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztLQUNoRTtJQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDdEMscUNBQXFDO0FBQ3ZDLENBQUM7QUFiRCw0QkFhQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbmxldCByb290RGlyOiBzdHJpbmc7XG5maW5kUm9vdERpcigpO1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZFJvb3REaXIoKSB7XG4gIGxldCBkaXIgPSBwcm9jZXNzLmN3ZCgpO1xuICB3aGlsZSAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGRpciwgJ2Rpc3QvZHItc3RhdGUuanNvbicpKSkge1xuICAgIGNvbnN0IHBhcmVudERpciA9IFBhdGguZGlybmFtZShkaXIpO1xuICAgIGlmIChwYXJlbnREaXIgPT09IGRpcikge1xuICAgICAgZGlyID0gcHJvY2Vzcy5jd2QoKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBkaXIgPSBwYXJlbnREaXI7XG4gIH1cbiAgcm9vdERpciA9IGRpcjtcbiAgcmV0dXJuIGRpcjtcbn1cblxuZXhwb3J0IHtyb290RGlyfTtcblxuZXhwb3J0IGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIhLCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5pc1N5bWJvbGljTGluaygpO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKCkge1xuICBjb25zdCBub2RlUGF0aHMgPSBbUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKV07XG4gIGlmIChyb290RGlyICE9PSBwcm9jZXNzLmN3ZCgpKSB7XG4gICAgbm9kZVBhdGhzLnVuc2hpZnQoUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMnKSk7XG4gIH1cbiAgaWYgKGlzRHJjcFN5bWxpbmspXG4gICAgbm9kZVBhdGhzLnB1c2goZnMucmVhbHBhdGhTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyISwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkgKyBQYXRoLnNlcCArICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfUEFUSCkge1xuICAgIG5vZGVQYXRocy5wdXNoKC4uLnByb2Nlc3MuZW52Lk5PREVfUEFUSC5zcGxpdChQYXRoLmRlbGltaXRlcikpO1xuICB9XG4gIHByb2Nlc3MuZW52Lk5PREVfUEFUSCA9IG5vZGVQYXRocy5qb2luKFBhdGguZGVsaW1pdGVyKTtcbiAgcmVxdWlyZSgnbW9kdWxlJykuTW9kdWxlLl9pbml0UGF0aHMoKTtcbiAgLy8gY29uc29sZS5sb2cocHJvY2Vzcy5lbnYuTk9ERV9QQVRIKVxufVxuIl19