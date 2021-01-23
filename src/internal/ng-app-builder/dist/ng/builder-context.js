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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVpbGRlci1jb250ZXh0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnVpbGRlci1jb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQSxvRUFBMEU7QUFDMUUsa0RBQTBCO0FBTTFCLE1BQWEsY0FBYztJQVF2QixZQUFtQixhQUE4QixFQUFFLEdBQTJCO1FBQTNELGtCQUFhLEdBQWIsYUFBYSxDQUFpQjtRQVBqRCxpQkFBWSxHQUE2QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRW5ELG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLGlCQUFZLEdBQVcsRUFBRSxDQUFDO1FBS3RCLElBQUksR0FBRyxFQUFFO1lBQ0wsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUM7U0FDdEI7YUFBTTtZQUNILElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBQyxZQUFZLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBQyxDQUFDO1NBQzlDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDM0YsQ0FBQztJQUVELGFBQWEsQ0FBQyxhQUFvQyxFQUM5QyxpQkFBcUM7UUFDckMsd0JBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVELGtCQUFrQixDQUFDLE9BQWU7UUFDOUIsT0FBTyxtQ0FBa0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELFVBQVU7UUFDTix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDSjtBQTlCRCx3Q0E4QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgd2VicGFjaywge2NvbXBpbGF0aW9ufSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7QW5ndWxhckNsaVBhcmFtfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgY2hhbmdlV2VicGFja0NvbmZpZywge3RyYW5zZm9ybUluZGV4SHRtbH0gZnJvbSAnLi4vY29uZmlnLXdlYnBhY2snO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IGludGVyZmFjZSBCdWlsZGVyQ29udGV4dE9wdGlvbnMge1xuICAgIGlubGluZUNodW5rczogc3RyaW5nW107XG59XG5cbmV4cG9ydCBjbGFzcyBCdWlsZGVyQ29udGV4dCB7XG4gICAgaW5saW5lQXNzZXRzOiBNYXA8c3RyaW5nLCBzdHJpbmd8bnVsbD4gPSBuZXcgTWFwKCk7XG4gICAgb3B0aW9uczogQnVpbGRlckNvbnRleHRPcHRpb25zO1xuICAgIHdlYnBhY2tSdW5Db3VudCA9IDA7XG4gICAgcmVhZHlNZXNzYWdlOiBzdHJpbmcgPSAnJztcblxuICAgIF9zZXRDb21waWxhdGlvbjogKHZhbHVlOiBjb21waWxhdGlvbi5Db21waWxhdGlvbikgPT4gdm9pZDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyBuZ0J1aWxkT3B0aW9uOiBBbmd1bGFyQ2xpUGFyYW0sIG9wdD86IEJ1aWxkZXJDb250ZXh0T3B0aW9ucykge1xuICAgICAgICBpZiAob3B0KSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSBvcHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMgPSB7aW5saW5lQ2h1bmtzOiBbJ3J1bnRpbWUnXX07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5vcHRpb25zLmlubGluZUNodW5rcy5mb3JFYWNoKGNodW5rTmFtZSA9PiB0aGlzLmlubGluZUFzc2V0cy5zZXQoY2h1bmtOYW1lLCBudWxsKSk7XG4gICAgfVxuXG4gICAgY29uZmlnV2VicGFjayh3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gICAgICAgIGRyY3BDb25maWdTZXR0aW5nOiB7ZGV2TW9kZTogYm9vbGVhbn0pIHtcbiAgICAgICAgY2hhbmdlV2VicGFja0NvbmZpZyh0aGlzLCB0aGlzLm5nQnVpbGRPcHRpb24sIHdlYnBhY2tDb25maWcsIGRyY3BDb25maWdTZXR0aW5nKTtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoY29udGVudDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1JbmRleEh0bWwodGhpcywgY29udGVudCk7XG4gICAgfVxuXG4gICAgcHJpbnRSZWFkeSgpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnJlZCh0aGlzLnJlYWR5TWVzc2FnZSkpO1xuICAgIH1cbn1cbiJdfQ==