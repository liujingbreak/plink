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
            (0, webpack_util_1.findLoader)(cfg.module.rules, (loader, ruleSet, idx, useItems) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1jb25maWcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLWNvbmZpZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUNBLHdFQUFpRTtBQUNqRSxnREFBd0I7QUFFeEIsTUFBTSxPQUFPLEdBQXdCO0lBQ25DLGNBQWMsQ0FBQyxRQUF5QjtJQUN4QyxDQUFDO0lBQ0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTTs7UUFDdEIsSUFBSSxNQUFBLEdBQUcsQ0FBQyxNQUFNLDBDQUFFLEtBQUssRUFBRTtZQUNyQixJQUFBLHlCQUFVLEVBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRTtnQkFDOUQsSUFBSSxtQ0FBbUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUU7b0JBQ3BELFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO29CQUMvRCxlQUFlO2lCQUNoQjtnQkFDRCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFFRCwyRkFBMkY7UUFDM0YsR0FBRyxDQUFDLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDckYsQ0FBQztDQUNGLENBQUM7QUFHRixrQkFBZSxPQUFPLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlYWN0U2NyaXB0c0hhbmRsZXIsIENyYVNjcmlwdHNQYXRoc30gZnJvbSAnQHdmaC9jcmEtc2NyaXB0cy9kaXN0L3R5cGVzJztcbmltcG9ydCB7ZmluZExvYWRlcn0gZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L3dlYnBhY2stdXRpbCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgaGFuZGxlcjogUmVhY3RTY3JpcHRzSGFuZGxlciA9IHtcbiAgY2hhbmdlQ3JhUGF0aHMoY3JhUGF0aHM6IENyYVNjcmlwdHNQYXRocykge1xuICB9LFxuICB3ZWJwYWNrKGNmZywgZW52LCBjbWRPcHQpIHtcbiAgICBpZiAoY2ZnLm1vZHVsZT8ucnVsZXMpIHtcbiAgICAgIGZpbmRMb2FkZXIoY2ZnLm1vZHVsZS5ydWxlcywgKGxvYWRlciwgcnVsZVNldCwgaWR4LCB1c2VJdGVtcykgPT4ge1xuICAgICAgICBpZiAoL25vZGVfbW9kdWxlc1svXFxcXF1zYXNzLWxvYWRlclsvXFxcXF0vLnRlc3QobG9hZGVyKSkge1xuICAgICAgICAgIHVzZUl0ZW1zLnB1c2gocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3Nhc3MtdGhlbWUtbG9hZGVyLmpzJykpO1xuICAgICAgICAgIC8vIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFRvIHdvcmsgYXJvdW5kIGlzc3VlOiBjYW52YXMtNS1wb2x5ZmlsbCByZXF1aXJpbmcgbm9kZS1jYW52YXMgZHVyaW5nIFdlYnBhY2sgY29tcGlsYXRpb25cbiAgICBjZmcuZXh0ZXJuYWxzID0gWy4uLihBcnJheS5pc0FycmF5KGNmZy5leHRlcm5hbHMpID8gY2ZnLmV4dGVybmFscyA6IFtdKSwgJ2NhbnZhcyddO1xuICB9XG59O1xuXG5cbmV4cG9ydCBkZWZhdWx0IGhhbmRsZXI7XG4iXX0=