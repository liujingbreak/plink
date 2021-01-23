"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaticRoute = void 0;
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
// export function createZipRoute(maxAgeMap: {[extname: string]: string} = {}):
// serveZip.ZipResourceMiddleware {
//   const maxAgeNumMap = parseMaxAgeMap(maxAgeMap);
//   const zss = serveZip('', {setHeaders: createSetHeaderFunc(maxAgeNumMap)});
//   return zss;
// }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljLW1pZGRsZXdhcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGF0aWMtbWlkZGxld2FyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFFQSxnREFBd0I7QUFDeEIsb0RBQXVCO0FBQ3ZCLHNEQUE4QjtBQUU5QixNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFekIsU0FBZ0IsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxZQUFrRCxFQUFFO0lBQ3ZHLElBQUksWUFBWSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM3QyxPQUFPLGlCQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRTtRQUMvQixVQUFVLEVBQUUsbUJBQW1CLENBQUMsWUFBWSxDQUFDO1FBQzdDLFFBQVEsRUFBRSxLQUFLO0tBQ2hCLENBQUMsQ0FBQztBQUNMLENBQUM7QUFORCw4Q0FNQztBQUVELCtFQUErRTtBQUMvRSxtQ0FBbUM7QUFDbkMsb0RBQW9EO0FBQ3BELCtFQUErRTtBQUMvRSxnQkFBZ0I7QUFDaEIsSUFBSTtBQUVKLFNBQVMsbUJBQW1CLENBQUMsWUFBeUM7SUFDcEUsT0FBTyxDQUFDLEdBQWEsRUFBRSxJQUFZLEVBQUUsS0FBVSxFQUFFLEVBQUU7UUFDakQsSUFBSSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMzQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3JCLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLElBQUksZ0JBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQztZQUMxQixxQkFBcUIsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7O1lBRTlDLEdBQUcsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzdDLEdBQUcsQ0FBQyxTQUFTLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsR0FBYSxFQUFFLFVBQXlCLENBQUMsRUFBRSxTQUFTLEdBQUcsS0FBSztJQUN6RixJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7UUFDbkIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDM0MsT0FBTztLQUNSO0lBQ0QsSUFBSSxZQUFZLEdBQUcsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDbkUsSUFBSSxTQUFTLEVBQUU7UUFDYixZQUFZLElBQUksYUFBYSxDQUFDO0tBQy9CO0lBQ0QsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDL0MsQ0FBQztBQUVELFNBQVMsY0FBYyxDQUFDLFNBQStDO0lBQ3JFLElBQUksWUFBWSxHQUFnQyxFQUFFLENBQUM7SUFDbkQsSUFBSSxTQUFTLEVBQUU7UUFDYixNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNuQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDN0IsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFDcEUsQ0FBQyxDQUFDLENBQUM7S0FDSjtTQUFNO1FBQ0wsWUFBWSxHQUFHLEVBQUUsQ0FBQztLQUNuQjtJQUNELE9BQU8sWUFBWSxDQUFDO0FBQ3RCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgc2VydmVaaXAgZnJvbSAnc2VydmUtc3RhdGljLXppcCc7XG5pbXBvcnQge1Jlc3BvbnNlLCBIYW5kbGVyfSBmcm9tICdleHByZXNzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuXG5jb25zdCBtcyA9IHJlcXVpcmUoJ21zJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdGF0aWNSb3V0ZShzdGF0aWNEaXI6IHN0cmluZywgbWF4QWdlTWFwOiB7W2V4dG5hbWU6IHN0cmluZ106IHN0cmluZyB8IG51bWJlcn0gPSB7fSk6IEhhbmRsZXIge1xuICBsZXQgbWF4QWdlTnVtTWFwID0gcGFyc2VNYXhBZ2VNYXAobWF4QWdlTWFwKTtcbiAgcmV0dXJuIGV4cHJlc3Muc3RhdGljKHN0YXRpY0Rpciwge1xuICAgIHNldEhlYWRlcnM6IGNyZWF0ZVNldEhlYWRlckZ1bmMobWF4QWdlTnVtTWFwKSxcbiAgICByZWRpcmVjdDogZmFsc2VcbiAgfSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVaaXBSb3V0ZShtYXhBZ2VNYXA6IHtbZXh0bmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9KTpcbi8vIHNlcnZlWmlwLlppcFJlc291cmNlTWlkZGxld2FyZSB7XG4vLyAgIGNvbnN0IG1heEFnZU51bU1hcCA9IHBhcnNlTWF4QWdlTWFwKG1heEFnZU1hcCk7XG4vLyAgIGNvbnN0IHpzcyA9IHNlcnZlWmlwKCcnLCB7c2V0SGVhZGVyczogY3JlYXRlU2V0SGVhZGVyRnVuYyhtYXhBZ2VOdW1NYXApfSk7XG4vLyAgIHJldHVybiB6c3M7XG4vLyB9XG5cbmZ1bmN0aW9uIGNyZWF0ZVNldEhlYWRlckZ1bmMobWF4QWdlTnVtTWFwOiB7W2V4dG5hbWU6IHN0cmluZ106IG51bWJlcn0pIHtcbiAgcmV0dXJuIChyZXM6IFJlc3BvbnNlLCBwYXRoOiBzdHJpbmcsIGVudHJ5OiBhbnkpID0+IHtcbiAgICB2YXIgZXh0ID0gUGF0aC5leHRuYW1lKHBhdGgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKGV4dC5zdGFydHNXaXRoKCcuJykpXG4gICAgICBleHQgPSBleHQuc3Vic3RyaW5nKDEpO1xuICAgIGlmIChfLmhhcyhtYXhBZ2VOdW1NYXAsIGV4dCkpXG4gICAgICBzZXRDYWNoZUNvbnRyb2xIZWFkZXIocmVzLCBtYXhBZ2VOdW1NYXBbZXh0XSk7XG4gICAgZWxzZVxuICAgICAgcmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICduby1jYWNoZScpO1xuICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNldENhY2hlQ29udHJvbEhlYWRlcihyZXM6IFJlc3BvbnNlLCBfbWF4YWdlOiBudW1iZXIgfCBudWxsID0gMCwgaW1tdXRhYmxlID0gZmFsc2UpIHtcbiAgaWYgKF9tYXhhZ2UgPT0gbnVsbCkge1xuICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAnbm8tY2FjaGUnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIGNhY2hlQ29udHJvbCA9ICdwdWJsaWMsIG1heC1hZ2U9JyArIE1hdGguZmxvb3IoX21heGFnZSAvIDEwMDApO1xuICBpZiAoaW1tdXRhYmxlKSB7XG4gICAgY2FjaGVDb250cm9sICs9ICcsIGltbXV0YWJsZSc7XG4gIH1cbiAgcmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsIGNhY2hlQ29udHJvbCk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTWF4QWdlTWFwKG1heEFnZU1hcDoge1tleHRuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXJ9KSB7XG4gIGxldCBtYXhBZ2VOdW1NYXA6IHtbZXh0bmFtZTogc3RyaW5nXTogbnVtYmVyfSA9IHt9O1xuICBpZiAobWF4QWdlTWFwKSB7XG4gICAgT2JqZWN0LmtleXMobWF4QWdlTWFwKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IG1heEFnZU1hcFtrZXldO1xuICAgICAgbWF4QWdlTnVtTWFwW2tleV0gPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gbXModmFsdWUpIDogdmFsdWU7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgbWF4QWdlTnVtTWFwID0ge307XG4gIH1cbiAgcmV0dXJuIG1heEFnZU51bU1hcDtcbn1cbiJdfQ==