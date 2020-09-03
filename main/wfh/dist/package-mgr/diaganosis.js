"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeInstallJson = void 0;
const index_1 = require("./index");
const fs_1 = __importDefault(require("fs"));
function writeInstallJson() {
    const ws = index_1.getState().workspaces.get(index_1.pathToWorkspace(process.cwd()));
    fs_1.default.writeFileSync('package.json', ws.installJsonStr);
}
exports.writeInstallJson = writeInstallJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ2Fub3Npcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL2RpYWdhbm9zaXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQWtEO0FBQ2xELDRDQUFvQjtBQUVwQixTQUFnQixnQkFBZ0I7SUFDOUIsTUFBTSxFQUFFLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsdUJBQWUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3JFLFlBQUUsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLEVBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN2RCxDQUFDO0FBSEQsNENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Xb3Jrc3BhY2V9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlSW5zdGFsbEpzb24oKSB7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldChwYXRoVG9Xb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSkpO1xuICBmcy53cml0ZUZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCB3cyEuaW5zdGFsbEpzb25TdHIpO1xufVxuIl19