"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zip = require('gulp-zip');
const gulp = require('gulp');
const __api_1 = require("__api");
const log = require('log4js').getLogger(__api_1.default.packageName);
function zipStatic() {
    return new Promise((resolve, reject) => {
        log.info(`Will zip ${__api_1.default.config.get('staticDir')} to webui-static.zip`);
        gulp.src(__api_1.default.config.get('staticDir') + '/**/*')
            .pipe(zip('webui-static.zip'))
            .pipe(gulp.dest('.'))
            .on('end', resolve)
            .on('error', reject);
    });
}
exports.zipStatic = zipStatic;
// export function unZipStatic() {	
// 	return new Promise((resolve, reject) => {
// 		gulp.src('webui-static.zip')
// 		.pipe(unzip())
// 		.pipe(gulp.dest('.'))
// 		.on('end', resolve)
// 		.on('error', reject);
// 	});
// }

//# sourceMappingURL=zip.js.map
