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
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
var unzip = require('gulp-unzip');
const fs = __importStar(require("fs-extra"));
var gulp = require('gulp');
fs.mkdirsSync('dist/static');
gulp.src('webui-static.zip')
    .pipe(unzip())
    .pipe(gulp.dest('dist/static'))
    .on('end', () => console.log('Unzip webui-static.zip to dist/static'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW56aXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bnppcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSwrQkFBK0I7QUFDL0IsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xDLDZDQUErQjtBQUMvQixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFM0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0tBQzNCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQzlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbnZhciB1bnppcCA9IHJlcXVpcmUoJ2d1bHAtdW56aXAnKTtcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbnZhciBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuXG5mcy5ta2RpcnNTeW5jKCdkaXN0L3N0YXRpYycpO1xuZ3VscC5zcmMoJ3dlYnVpLXN0YXRpYy56aXAnKVxuLnBpcGUodW56aXAoKSlcbi5waXBlKGd1bHAuZGVzdCgnZGlzdC9zdGF0aWMnKSlcbi5vbignZW5kJywgKCkgPT4gY29uc29sZS5sb2coJ1VuemlwIHdlYnVpLXN0YXRpYy56aXAgdG8gZGlzdC9zdGF0aWMnKSk7XG4iXX0=