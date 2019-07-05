"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const config_webpack_1 = tslib_1.__importStar(require("../config-webpack"));
class BuilderContext {
    constructor() {
        this.compilation = new Promise(resolve => {
            this._setCompilation = resolve;
        });
    }
    configWebpack(param, webpackConfig, drcpConfigSetting) {
        config_webpack_1.default(this, param, webpackConfig, drcpConfigSetting);
    }
    transformIndexHtml(content) {
        return config_webpack_1.transformIndexHtml(this, content);
    }
}
exports.BuilderContext = BuilderContext;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9idWlsZGVyLWNvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsNEVBQTBFO0FBRTFFLE1BQWEsY0FBYztJQUl2QjtRQUNJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxPQUFPLENBQTBCLE9BQU8sQ0FBQyxFQUFFO1lBQzlELElBQUksQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDO1FBQ25DLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELGFBQWEsQ0FBQyxLQUFzQixFQUFFLGFBQW9DLEVBQ3RFLGlCQUFxQztRQUNyQyx3QkFBbUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxPQUFlO1FBQzlCLE9BQU8sbUNBQWtCLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLENBQUM7Q0FDSjtBQWxCRCx3Q0FrQkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvYnVpbGRlci1jb250ZXh0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHdlYnBhY2ssIHtjb21waWxhdGlvbn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge0FuZ3VsYXJDbGlQYXJhbX0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IGNoYW5nZVdlYnBhY2tDb25maWcsIHt0cmFuc2Zvcm1JbmRleEh0bWx9IGZyb20gJy4uL2NvbmZpZy13ZWJwYWNrJztcblxuZXhwb3J0IGNsYXNzIEJ1aWxkZXJDb250ZXh0IHtcbiAgICBjb21waWxhdGlvbjogUHJvbWlzZTxjb21waWxhdGlvbi5Db21waWxhdGlvbj47XG4gICAgX3NldENvbXBpbGF0aW9uOiAodmFsdWU6IGNvbXBpbGF0aW9uLkNvbXBpbGF0aW9uKSA9PiB2b2lkO1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuY29tcGlsYXRpb24gPSBuZXcgUHJvbWlzZTxjb21waWxhdGlvbi5Db21waWxhdGlvbj4ocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9zZXRDb21waWxhdGlvbiA9IHJlc29sdmU7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbmZpZ1dlYnBhY2socGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uLFxuICAgICAgICBkcmNwQ29uZmlnU2V0dGluZzoge2Rldk1vZGU6IGJvb2xlYW59KSB7XG4gICAgICAgIGNoYW5nZVdlYnBhY2tDb25maWcodGhpcywgcGFyYW0sIHdlYnBhY2tDb25maWcsIGRyY3BDb25maWdTZXR0aW5nKTtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1JbmRleEh0bWwoY29udGVudDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1JbmRleEh0bWwodGhpcywgY29udGVudCk7XG4gICAgfVxufVxuIl19
