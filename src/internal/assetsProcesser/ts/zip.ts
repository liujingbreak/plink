const zip = require('gulp-zip');
const gulp = require('gulp');
import api from '__api';
const log = require('log4js').getLogger(api.packageName);

export function zipStatic() {
	return new Promise((resolve, reject) => {
		log.info(`zip ${api.config.get('staticDir')} to webui-static.zip`);
		gulp.src(api.config.get('staticDir') + '/**/*')
		.pipe(zip('webui-static.zip'))
		.pipe(gulp.dest('.'))
		.on('end', resolve)
		.on('error', reject);
	});
}

// export function unZipStatic() {	
// 	return new Promise((resolve, reject) => {
// 		gulp.src('webui-static.zip')
// 		.pipe(unzip())
// 		.pipe(gulp.dest('.'))
// 		.on('end', resolve)
// 		.on('error', reject);
// 	});
// }
