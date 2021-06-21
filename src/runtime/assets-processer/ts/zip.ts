/* eslint-disable  no-console */
const gulp = require('gulp');
const zip = require('gulp-zip');

console.log('zip dist/static to webui-static.zip');
gulp.src('dist/static/**/*')
.pipe(zip('webui-static.zip'))
.pipe(gulp.dest('.'));

export {};
