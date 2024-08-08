/* eslint-disable no-console */
import {vec2, mat4} from 'gl-matrix';

function run() {
  const mainCoordOrig = [0.5, 0.5] as [number, number];
  const mainCoord = mat4.fromTranslation(mat4.create(), [...mainCoordOrig, 0]);
  const position = [1, 2] as [number, number];
  const subMatOrigin = [2, 2] as [number, number];
  const subMatOfMain = mat4.fromTranslation(mat4.create(), [...subMatOrigin, 0]);
  const subMat = mat4.mul(mat4.create(), mainCoord, subMatOfMain);

  const absPoint = vec2.transformMat4(vec2.create(), position, subMat);
  console.log(absPoint); // [ 3.5, 4.5 ]

  // In case: position is a vector relative to main coordinate
  // to get a relative vector of sub coordinate:
  const invertedSubMat = mat4.invert(mat4.create(), subMatOfMain);

  const pointInSubCoordinate = vec2.transformMat4(vec2.create(), position, invertedSubMat);
  console.log('invert:', pointInSubCoordinate);
}

run();
