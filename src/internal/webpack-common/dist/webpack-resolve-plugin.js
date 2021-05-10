"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlinkWebpackResolvePlugin = void 0;
class PlinkWebpackResolvePlugin {
    apply(resolver /* EnhancedResolve.Resolver */) {
        resolver.hooks.resolve.tapPromise('PlinkModuleResolver', (req, ctx) => __awaiter(this, void 0, void 0, function* () {
            console.log(req.path, req.request);
        }));
    }
}
exports.PlinkWebpackResolvePlugin = PlinkWebpackResolvePlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1yZXNvbHZlLXBsdWdpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYnBhY2stcmVzb2x2ZS1wbHVnaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBdUJBLE1BQWEseUJBQXlCO0lBQ3BDLEtBQUssQ0FBQyxRQUFrQixDQUFDLDhCQUE4QjtRQUNyRCxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMscUJBQXFCLEVBQUUsQ0FBTyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDMUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBTkQsOERBTUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRoaXMgV2VicGFjayByZXNvbHZlIHBsdWdpbiBpcyBleHBlcmltZW50YWwgYW5kIGRlYnVnIHB1cnBvc2VkLlxuICogTm90IGJlaW5nIHVzZWQgYW55d2hlcmUuXG4gKi9cbmltcG9ydCB7SG9va30gZnJvbSAndGFwYWJsZSc7XG4vLyBpbXBvcnQge30gZnJvbSAnZW5oYW5jZWQtcmVzb2x2ZSc7XG5cbmludGVyZmFjZSBSZXNvbHZlciB7XG4gIGhvb2tzOiB7XG4gICAgcmVzb2x2ZTogSG9vazxSZXF1ZXN0LCBSZXF1ZXN0Q29udGV4dD47XG4gIH07XG59XG5cbmludGVyZmFjZSBSZXF1ZXN0Q29udGV4dCB7XG4gIHN0YWNrOiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIFJlcXVlc3Qge1xuICBjb250ZXh0OiB7aXNzdWVyPzogc3RyaW5nOyBjb21waWxlcj86IHVua25vd247fTtcbiAgcGF0aDogc3RyaW5nO1xuICByZXF1ZXN0OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBQbGlua1dlYnBhY2tSZXNvbHZlUGx1Z2luIHtcbiAgYXBwbHkocmVzb2x2ZXI6IFJlc29sdmVyIC8qIEVuaGFuY2VkUmVzb2x2ZS5SZXNvbHZlciAqLykge1xuICAgIHJlc29sdmVyLmhvb2tzLnJlc29sdmUudGFwUHJvbWlzZSgnUGxpbmtNb2R1bGVSZXNvbHZlcicsIGFzeW5jIChyZXEsIGN0eCkgPT4ge1xuICAgICAgY29uc29sZS5sb2cocmVxLnBhdGgsIHJlcS5yZXF1ZXN0KTtcbiAgICB9KTtcbiAgfVxufVxuIl19