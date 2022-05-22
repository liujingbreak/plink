"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsc_util_1 = require("@wfh/plink/wfh/dist/utils/tsc-util");
const createTransformer = (config) => {
    console.log(process.pid, config);
    // const events = watch(config!.rootFiles);
    // rx.merge(
    //   events.onWriteFile.pipe(
    //     op.map(({payload: [fileName, data, onError, sources]}) => {
    //       debugger;
    //     })
    //   ),
    //   events.onDiagnosticString.pipe(
    //     // eslint-disable-next-line no-console
    //     op.map(info => console.log(info))
    //   )
    // ).subscribe();
    const transformer = {
        process(sourceText, sourcePath, options) {
            const compiled = (0, tsc_util_1.transpileSingleFile)(sourceText, sourcePath);
            console.log('transpile', sourcePath, 'map:', compiled.sourceMapText);
            if (compiled.diagnosticsText) {
                console.error(compiled.diagnosticsText);
            }
            return {
                code: compiled.outputText,
                map: compiled.sourceMapText
            };
        }
    };
    return transformer;
};
exports.default = { createTransformer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtdHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cy10cmFuc2Zvcm1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLGlFQUF1RTtBQU92RSxNQUFNLGlCQUFpQixHQUE4RSxDQUFDLE1BQU0sRUFBRSxFQUFFO0lBQzlHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNqQywyQ0FBMkM7SUFDM0MsWUFBWTtJQUNaLDZCQUE2QjtJQUM3QixrRUFBa0U7SUFDbEUsa0JBQWtCO0lBQ2xCLFNBQVM7SUFDVCxPQUFPO0lBQ1Asb0NBQW9DO0lBQ3BDLDZDQUE2QztJQUM3Qyx3Q0FBd0M7SUFDeEMsTUFBTTtJQUNOLGlCQUFpQjtJQUVqQixNQUFNLFdBQVcsR0FBdUM7UUFDdEQsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTztZQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFBLDhCQUFtQixFQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUM3RCxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNyRSxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsT0FBTztnQkFDTCxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVU7Z0JBQ3pCLEdBQUcsRUFBRSxRQUFRLENBQUMsYUFBYTthQUM1QixDQUFDO1FBQ0osQ0FBQztLQUNGLENBQUM7SUFFRixPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDLENBQUM7QUFFRixrQkFBZSxFQUFDLGlCQUFpQixFQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XHJcbi8vIGltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xyXG4vLyBpbXBvcnQgaW5zcGVjdG9yIGZyb20gJ2luc3BlY3Rvcic7XHJcbmltcG9ydCB7VHJhbnNmb3JtZXJDcmVhdG9yLCBTeW5jVHJhbnNmb3JtZXJ9IGZyb20gJ0BqZXN0L3RyYW5zZm9ybSc7XHJcbmltcG9ydCB7dHJhbnNwaWxlU2luZ2xlRmlsZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy90c2MtdXRpbCc7XHJcbi8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcclxuXHJcbnR5cGUgVHJhbnNmb3JtZXJDb25maWcgPSB7XHJcbiAgcm9vdEZpbGVzOiBzdHJpbmdbXVxyXG59O1xyXG5cclxuY29uc3QgY3JlYXRlVHJhbnNmb3JtZXI6IFRyYW5zZm9ybWVyQ3JlYXRvcjxTeW5jVHJhbnNmb3JtZXI8VHJhbnNmb3JtZXJDb25maWc+LCBUcmFuc2Zvcm1lckNvbmZpZz4gPSAoY29uZmlnKSA9PiB7XHJcbiAgY29uc29sZS5sb2cocHJvY2Vzcy5waWQsIGNvbmZpZyk7XHJcbiAgLy8gY29uc3QgZXZlbnRzID0gd2F0Y2goY29uZmlnIS5yb290RmlsZXMpO1xyXG4gIC8vIHJ4Lm1lcmdlKFxyXG4gIC8vICAgZXZlbnRzLm9uV3JpdGVGaWxlLnBpcGUoXHJcbiAgLy8gICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlTmFtZSwgZGF0YSwgb25FcnJvciwgc291cmNlc119KSA9PiB7XHJcbiAgLy8gICAgICAgZGVidWdnZXI7XHJcbiAgLy8gICAgIH0pXHJcbiAgLy8gICApLFxyXG4gIC8vICAgZXZlbnRzLm9uRGlhZ25vc3RpY1N0cmluZy5waXBlKFxyXG4gIC8vICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxyXG4gIC8vICAgICBvcC5tYXAoaW5mbyA9PiBjb25zb2xlLmxvZyhpbmZvKSlcclxuICAvLyAgIClcclxuICAvLyApLnN1YnNjcmliZSgpO1xyXG5cclxuICBjb25zdCB0cmFuc2Zvcm1lcjogU3luY1RyYW5zZm9ybWVyPFRyYW5zZm9ybWVyQ29uZmlnPiA9IHtcclxuICAgIHByb2Nlc3Moc291cmNlVGV4dCwgc291cmNlUGF0aCwgb3B0aW9ucykge1xyXG4gICAgICBjb25zdCBjb21waWxlZCA9IHRyYW5zcGlsZVNpbmdsZUZpbGUoc291cmNlVGV4dCwgc291cmNlUGF0aCk7XHJcbiAgICAgIGNvbnNvbGUubG9nKCd0cmFuc3BpbGUnLCBzb3VyY2VQYXRoLCAnbWFwOicsIGNvbXBpbGVkLnNvdXJjZU1hcFRleHQpO1xyXG4gICAgICBpZiAoY29tcGlsZWQuZGlhZ25vc3RpY3NUZXh0KSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihjb21waWxlZC5kaWFnbm9zdGljc1RleHQpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY29kZTogY29tcGlsZWQub3V0cHV0VGV4dCxcclxuICAgICAgICBtYXA6IGNvbXBpbGVkLnNvdXJjZU1hcFRleHRcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9O1xyXG5cclxuICByZXR1cm4gdHJhbnNmb3JtZXI7XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCB7Y3JlYXRlVHJhbnNmb3JtZXJ9O1xyXG4iXX0=