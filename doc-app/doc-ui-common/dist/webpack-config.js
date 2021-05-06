"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const webpack_util_1 = require("@wfh/webpack-common/dist/webpack-util");
const path_1 = __importDefault(require("path"));
const handler = {
    changeCraPaths(craPaths) {
    },
    webpack(cfg, env, cmdOpt) {
        var _a;
        if ((_a = cfg.module) === null || _a === void 0 ? void 0 : _a.rules) {
            webpack_util_1.findLoader(cfg.module.rules, (loader, ruleSet, idx, useItems) => {
                if (/node_modules[/\\]sass-loader[/\\]/.test(loader)) {
                    useItems.push(path_1.default.resolve(__dirname, 'sass-theme-loader.js'));
                    // return true;
                }
                return false;
            });
        }
        // To work around issue: canvas-5-polyfill requiring node-canvas during Webpack compilation
        cfg.externals = [...(Array.isArray(cfg.externals) ? cfg.externals : []), 'canvas'];
    }
};
exports.default = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHdFQUFpRTtBQUNqRSxnREFBd0I7QUFFeEIsTUFBTSxPQUFPLEdBQXdCO0lBQ25DLGNBQWMsQ0FBQyxRQUF5QjtJQUN4QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTTs7UUFDdEIsVUFBSSxHQUFHLENBQUMsTUFBTSwwQ0FBRSxLQUFLLEVBQUU7WUFDckIseUJBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUM5RCxJQUFJLG1DQUFtQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtvQkFDcEQsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7b0JBQy9ELGVBQWU7aUJBQ2hCO2dCQUNELE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUVELDJGQUEyRjtRQUMzRixHQUFHLENBQUMsU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRixDQUFDO0NBQ0YsQ0FBQztBQUdGLGtCQUFlLE9BQU8sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVhY3RTY3JpcHRzSGFuZGxlciwgQ3JhU2NyaXB0c1BhdGhzfSBmcm9tICdAd2ZoL2NyYS1zY3JpcHRzL2Rpc3QvdHlwZXMnO1xuaW1wb3J0IHtmaW5kTG9hZGVyfSBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3Qvd2VicGFjay11dGlsJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBoYW5kbGVyOiBSZWFjdFNjcmlwdHNIYW5kbGVyID0ge1xuICBjaGFuZ2VDcmFQYXRocyhjcmFQYXRoczogQ3JhU2NyaXB0c1BhdGhzKSB7XG4gIH0sXG4gIHdlYnBhY2soY2ZnLCBlbnYsIGNtZE9wdCkge1xuICAgIGlmIChjZmcubW9kdWxlPy5ydWxlcykge1xuICAgICAgZmluZExvYWRlcihjZmcubW9kdWxlLnJ1bGVzLCAobG9hZGVyLCBydWxlU2V0LCBpZHgsIHVzZUl0ZW1zKSA9PiB7XG4gICAgICAgIGlmICgvbm9kZV9tb2R1bGVzWy9cXFxcXXNhc3MtbG9hZGVyWy9cXFxcXS8udGVzdChsb2FkZXIpKSB7XG4gICAgICAgICAgdXNlSXRlbXMucHVzaChwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc2Fzcy10aGVtZS1sb2FkZXIuanMnKSk7XG4gICAgICAgICAgLy8gcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVG8gd29yayBhcm91bmQgaXNzdWU6IGNhbnZhcy01LXBvbHlmaWxsIHJlcXVpcmluZyBub2RlLWNhbnZhcyBkdXJpbmcgV2VicGFjayBjb21waWxhdGlvblxuICAgIGNmZy5leHRlcm5hbHMgPSBbLi4uKEFycmF5LmlzQXJyYXkoY2ZnLmV4dGVybmFscykgPyBjZmcuZXh0ZXJuYWxzIDogW10pLCAnY2FudmFzJ107XG4gIH1cbn07XG5cblxuZXhwb3J0IGRlZmF1bHQgaGFuZGxlcjtcbiJdfQ==