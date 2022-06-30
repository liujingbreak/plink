"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable  no-console */
var unzip = require('gulp-unzip');
const fs = tslib_1.__importStar(require("fs-extra"));
var gulp = require('gulp');
fs.mkdirsSync('dist/static');
gulp.src('webui-static.zip')
    .pipe(unzip())
    .pipe(gulp.dest('dist/static'))
    .on('end', () => console.log('Unzip webui-static.zip to dist/static'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW56aXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1bnppcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxnQ0FBZ0M7QUFDaEMsSUFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xDLHFEQUErQjtBQUMvQixJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFM0IsRUFBRSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM3QixJQUFJLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0tBQzNCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztLQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0tBQzlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8qIGVzbGludC1kaXNhYmxlICBuby1jb25zb2xlICovXG52YXIgdW56aXAgPSByZXF1aXJlKCdndWxwLXVuemlwJyk7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG52YXIgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcblxuZnMubWtkaXJzU3luYygnZGlzdC9zdGF0aWMnKTtcbmd1bHAuc3JjKCd3ZWJ1aS1zdGF0aWMuemlwJylcbi5waXBlKHVuemlwKCkpXG4ucGlwZShndWxwLmRlc3QoJ2Rpc3Qvc3RhdGljJykpXG4ub24oJ2VuZCcsICgpID0+IGNvbnNvbGUubG9nKCdVbnppcCB3ZWJ1aS1zdGF0aWMuemlwIHRvIGRpc3Qvc3RhdGljJykpO1xuIl19