/* tslint:disable no-console */
const gulp = require('gulp');
const zip = require('gulp-zip');

console.log('zip dist/static to webui-static.zip');
gulp.src('dist/static/**/*')
.pipe(zip('webui-static.zip'))
.pipe(gulp.dest('.'));

export {};

// const zip = require('gulp-zip');
// const gulp = require('gulp');
// import api from '__api';
// const log = require('log4js').getLogger(api.packageName);

// export function zipStatic() {
// 	return new Promise((resolve, reject) => {
// 		log.info(`Will zip ${api.config.get('staticDir')} to webui-static.zip`);
// 		gulp.src(api.config.get('staticDir') + '/**/*')
// 		.pipe(zip('webui-static.zip'))
// 		.pipe(gulp.dest('.'))
// 		.on('end', resolve)
// 		.on('error', reject);
// 	});
// }

