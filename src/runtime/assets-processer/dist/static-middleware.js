"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZipRoute = exports.createStaticRoute = void 0;
const serve_static_zip_1 = __importDefault(require("serve-static-zip"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const express_1 = __importDefault(require("express"));
const ms = require('ms');
function createStaticRoute(staticDir, maxAgeMap = {}) {
    let maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
    return express_1.default.static(staticDir, {
        setHeaders: createSetHeaderFunc(maxAgeNumMap),
        redirect: false
    });
}
exports.createStaticRoute = createStaticRoute;
function createZipRoute(maxAgeMap = {}) {
    const maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
    const zss = serve_static_zip_1.default('', { setHeaders: createSetHeaderFunc(maxAgeNumMap) });
    return zss;
}
exports.createZipRoute = createZipRoute;
function createSetHeaderFunc(maxAgeNumMap) {
    return (res, path, entry) => {
        var ext = path_1.default.extname(path).toLowerCase();
        if (ext.startsWith('.'))
            ext = ext.substring(1);
        if (lodash_1.default.has(maxAgeNumMap, ext))
            setCacheControlHeader(res, maxAgeNumMap[ext]);
        else
            res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
    };
}
function setCacheControlHeader(res, _maxage = 0, immutable = false) {
    if (_maxage == null) {
        res.setHeader('Cache-Control', 'no-cache');
        return;
    }
    var cacheControl = 'public, max-age=' + Math.floor(_maxage / 1000);
    if (immutable) {
        cacheControl += ', immutable';
    }
    res.setHeader('Cache-Control', cacheControl);
}
function parseMaxAgeMap(maxAgeMap) {
    let maxAgeNumMap = {};
    if (maxAgeMap) {
        Object.keys(maxAgeMap).forEach(key => {
            const value = maxAgeMap[key];
            maxAgeNumMap[key] = typeof value === 'string' ? ms(value) : value;
        });
    }
    else {
        maxAgeNumMap = {};
    }
    return maxAgeNumMap;
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9zdGF0aWMtbWlkZGxld2FyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx3RUFBd0M7QUFFeEMsZ0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixzREFBOEI7QUFFOUIsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBRXpCLFNBQWdCLGlCQUFpQixDQUFDLFNBQWlCLEVBQUUsWUFBa0QsRUFBRTtJQUN2RyxJQUFJLFlBQVksR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDN0MsT0FBTyxpQkFBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUU7UUFDL0IsVUFBVSxFQUFFLG1CQUFtQixDQUFDLFlBQVksQ0FBQztRQUM3QyxRQUFRLEVBQUUsS0FBSztLQUNoQixDQUFDLENBQUM7QUFDTCxDQUFDO0FBTkQsOENBTUM7QUFFRCxTQUFnQixjQUFjLENBQUMsWUFBeUMsRUFBRTtJQUV4RSxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0MsTUFBTSxHQUFHLEdBQUcsMEJBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBQyxVQUFVLEVBQUUsbUJBQW1CLENBQUMsWUFBWSxDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUxELHdDQUtDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxZQUF5QztJQUNwRSxPQUFPLENBQUMsR0FBYSxFQUFFLElBQVksRUFBRSxLQUFVLEVBQUUsRUFBRTtRQUNqRCxJQUFJLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzNDLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDckIsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekIsSUFBSSxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFDO1lBQzFCLHFCQUFxQixDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzs7WUFFOUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0MsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNwRCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxHQUFhLEVBQUUsVUFBeUIsQ0FBQyxFQUFFLFNBQVMsR0FBRyxLQUFLO0lBQ3pGLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtRQUNuQixHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMzQyxPQUFPO0tBQ1I7SUFDRCxJQUFJLFlBQVksR0FBRyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNuRSxJQUFJLFNBQVMsRUFBRTtRQUNiLFlBQVksSUFBSSxhQUFhLENBQUM7S0FDL0I7SUFDRCxHQUFHLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsU0FBK0M7SUFDckUsSUFBSSxZQUFZLEdBQWdDLEVBQUUsQ0FBQztJQUNuRCxJQUFJLFNBQVMsRUFBRTtRQUNiLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25DLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3QixZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNwRSxDQUFDLENBQUMsQ0FBQztLQUNKO1NBQU07UUFDTCxZQUFZLEdBQUcsRUFBRSxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQyIsImZpbGUiOiJydW50aW1lL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9zdGF0aWMtbWlkZGxld2FyZS5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
