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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuilderContext = void 0;
const config_webpack_1 = __importStar(require("../config-webpack"));
const chalk_1 = __importDefault(require("chalk"));
class BuilderContext {
    constructor(ngBuildOption, opt) {
        this.ngBuildOption = ngBuildOption;
        this.inlineAssets = new Map();
        this.webpackRunCount = 0;
        this.readyMessage = '';
        if (opt) {
            this.options = opt;
        }
        else {
            this.options = { inlineChunks: ['runtime'] };
        }
        this.options.inlineChunks.forEach(chunkName => this.inlineAssets.set(chunkName, null));
    }
    configWebpack(webpackConfig, drcpConfigSetting) {
        config_webpack_1.default(this, this.ngBuildOption, webpackConfig, drcpConfigSetting);
    }
    transformIndexHtml(content) {
        return config_webpack_1.transformIndexHtml(this, content);
    }
    printReady() {
        // tslint:disable-next-line: no-console
        console.log(chalk_1.default.red(this.readyMessage));
    }
}
exports.BuilderContext = BuilderContext;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9idWlsZGVyLWNvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLG9FQUEwRTtBQUMxRSxrREFBMEI7QUFNMUIsTUFBYSxjQUFjO0lBUXZCLFlBQW1CLGFBQThCLEVBQUUsR0FBMkI7UUFBM0Qsa0JBQWEsR0FBYixhQUFhLENBQWlCO1FBUGpELGlCQUFZLEdBQTZCLElBQUksR0FBRyxFQUFFLENBQUM7UUFFbkQsb0JBQWUsR0FBRyxDQUFDLENBQUM7UUFDcEIsaUJBQVksR0FBVyxFQUFFLENBQUM7UUFLdEIsSUFBSSxHQUFHLEVBQUU7WUFDTCxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztTQUN0QjthQUFNO1lBQ0gsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFDLFlBQVksRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFDLENBQUM7U0FDOUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMzRixDQUFDO0lBRUQsYUFBYSxDQUFDLGFBQW9DLEVBQzlDLGlCQUFxQztRQUNyQyx3QkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNwRixDQUFDO0lBRUQsa0JBQWtCLENBQUMsT0FBZTtRQUM5QixPQUFPLG1DQUFrQixDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQsVUFBVTtRQUNOLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNKO0FBOUJELHdDQThCQyIsImZpbGUiOiJkaXN0L25nL2J1aWxkZXItY29udGV4dC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
