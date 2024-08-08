"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const gl_matrix_1 = require("gl-matrix");
function run() {
    const mainCoordOrig = [0.5, 0.5];
    const mainCoord = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [...mainCoordOrig, 0]);
    const position = [1, 2];
    const subMatOrigin = [2, 2];
    const subMatOfMain = gl_matrix_1.mat4.fromTranslation(gl_matrix_1.mat4.create(), [...subMatOrigin, 0]);
    const subMat = gl_matrix_1.mat4.mul(gl_matrix_1.mat4.create(), mainCoord, subMatOfMain);
    const absPoint = gl_matrix_1.vec2.transformMat4(gl_matrix_1.vec2.create(), position, subMat);
    console.log(absPoint); // [ 3.5, 4.5 ]
    // In case: position is a vector relative to main coordinate
    // to get a relative vector of sub coordinate:
    const invertedSubMat = gl_matrix_1.mat4.invert(gl_matrix_1.mat4.create(), subMatOfMain);
    const pointInSubCoordinate = gl_matrix_1.vec2.transformMat4(gl_matrix_1.vec2.create(), position, invertedSubMat);
    console.log('invert:', pointInSubCoordinate);
}
run();
//# sourceMappingURL=matrix.test.js.map