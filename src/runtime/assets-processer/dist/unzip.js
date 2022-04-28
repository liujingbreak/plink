"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
/* eslint-disable  no-console */
var unzip = require('gulp-unzip');
const fs = __importStar(require("fs-extra"));
var gulp = require('gulp');
fs.mkdirsSync('dist/static');
gulp.src('webui-static.zip')
    .pipe(unzip())
    .pipe(gulp.dest('dist/static'))
    .on('end', () => console.log('Unzip webui-static.zip to dist/static'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW56aXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bnppcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0NBQWdDO0FBQ2hDLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNsQyw2Q0FBK0I7QUFDL0IsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTNCLEVBQUUsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDN0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztLQUMzQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7S0FDYixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUM5QixFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG4vKiBlc2xpbnQtZGlzYWJsZSAgbm8tY29uc29sZSAqL1xudmFyIHVuemlwID0gcmVxdWlyZSgnZ3VscC11bnppcCcpO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xudmFyIGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5cbmZzLm1rZGlyc1N5bmMoJ2Rpc3Qvc3RhdGljJyk7XG5ndWxwLnNyYygnd2VidWktc3RhdGljLnppcCcpXG4ucGlwZSh1bnppcCgpKVxuLnBpcGUoZ3VscC5kZXN0KCdkaXN0L3N0YXRpYycpKVxuLm9uKCdlbmQnLCAoKSA9PiBjb25zb2xlLmxvZygnVW56aXAgd2VidWktc3RhdGljLnppcCB0byBkaXN0L3N0YXRpYycpKTtcbiJdfQ==