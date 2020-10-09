"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __api_1 = __importDefault(require("__api"));
const Webpack = require('webpack');
var newApi = Object.getPrototypeOf(__api_1.default);
newApi.configWebpackLater = function (execFunc) {
    require('..').tapable.plugin('webpackConfig', function (webpackConfig, cb) {
        Promise.resolve(execFunc(webpackConfig, Webpack))
            .then((cfg) => cb(null, cfg))
            .catch((err) => cb(err, null));
    });
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2xlZ2FjeS93ZWJwYWNrMi1idWlsZGVyL3RzL2V4dGVuZC1idWlsZGVyLWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLGtEQUF3QjtBQUV4QixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFnQm5DLElBQUksTUFBTSxHQUF1QixNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBQyxDQUFDO0FBQzVELE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxVQUMxQixRQUEyQjtJQUUzQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQzFDLFVBQVMsYUFBNEIsRUFBRSxFQUE4RDtRQUNuRyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7YUFDaEQsSUFBSSxDQUFDLENBQUMsR0FBa0IsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQzthQUMzQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyIsImZpbGUiOiJsZWdhY3kvd2VicGFjazItYnVpbGRlci9kaXN0L2V4dGVuZC1idWlsZGVyLWFwaS5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
