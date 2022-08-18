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
//# sourceMappingURL=unzip.js.map