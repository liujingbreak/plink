"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeInstallJson = void 0;
const index_1 = require("./index");
const fs_1 = __importDefault(require("fs"));
function writeInstallJson() {
    const ws = index_1.getState().workspaces.get(index_1.workspaceKey(process.cwd()));
    fs_1.default.writeFileSync('package.json', ws.installJsonStr);
}
exports.writeInstallJson = writeInstallJson;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc2lzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvcGFja2FnZS1tZ3IvZGlhZ25vc2lzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLG1DQUErQztBQUMvQyw0Q0FBb0I7QUFFcEIsU0FBZ0IsZ0JBQWdCO0lBQzlCLE1BQU0sRUFBRSxHQUFHLGdCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG9CQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRSxZQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxFQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdkQsQ0FBQztBQUhELDRDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fSBmcm9tICcuL2luZGV4JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUluc3RhbGxKc29uKCkge1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKTtcbiAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgd3MhLmluc3RhbGxKc29uU3RyKTtcbn1cbiJdfQ==