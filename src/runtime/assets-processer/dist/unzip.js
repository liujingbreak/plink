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
/* eslint-disable  no-console */
var unzip = require('gulp-unzip');
const fs = __importStar(require("fs-extra"));
var gulp = require('gulp');
fs.mkdirsSync('dist/static');
gulp.src('webui-static.zip')
    .pipe(unzip())
    .pipe(gulp.dest('dist/static'))
    .on('end', () => console.log('Unzip webui-static.zip to dist/static'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW56aXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bnppcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnQ0FBZ0M7QUFDaEMsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xDLDZDQUErQjtBQUMvQixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFM0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0tBQzNCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQzlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlICovXG52YXIgdW56aXAgPSByZXF1aXJlKCdndWxwLXVuemlwJyk7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG52YXIgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcblxuZnMubWtkaXJzU3luYygnZGlzdC9zdGF0aWMnKTtcbmd1bHAuc3JjKCd3ZWJ1aS1zdGF0aWMuemlwJylcbi5waXBlKHVuemlwKCkpXG4ucGlwZShndWxwLmRlc3QoJ2Rpc3Qvc3RhdGljJykpXG4ub24oJ2VuZCcsICgpID0+IGNvbnNvbGUubG9nKCdVbnppcCB3ZWJ1aS1zdGF0aWMuemlwIHRvIGRpc3Qvc3RhdGljJykpO1xuIl19