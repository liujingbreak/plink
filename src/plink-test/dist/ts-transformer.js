"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tsc_util_1 = require("@wfh/plink/wfh/dist/utils/tsc-util");
const typescript_1 = __importDefault(require("typescript"));
const createTransformer = (config) => {
    // const events = wath(config!.rootFiles);
    // rx.merge(
    //   events.onWriteFile.pipe( op.map(({payload: [fileName, data, onError, sources]}) => {
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
            const compiled = (0, tsc_util_1.transpileSingleFile)(sourceText, typescript_1.default);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtdHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cy10cmFuc2Zvcm1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUlBLGlFQUF1RTtBQUN2RSw0REFBNEI7QUFPNUIsTUFBTSxpQkFBaUIsR0FBOEUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtJQUM5RywwQ0FBMEM7SUFDMUMsWUFBWTtJQUNaLHlGQUF5RjtJQUN6RixrQkFBa0I7SUFDbEIsU0FBUztJQUNULE9BQU87SUFDUCxvQ0FBb0M7SUFDcEMsNkNBQTZDO0lBQzdDLHdDQUF3QztJQUN4QyxNQUFNO0lBQ04saUJBQWlCO0lBRWpCLE1BQU0sV0FBVyxHQUF1QztRQUN0RCxPQUFPLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxPQUFPO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLElBQUEsOEJBQW1CLEVBQUMsVUFBVSxFQUFFLG9CQUFFLENBQUMsQ0FBQztZQUNyRCxJQUFJLFFBQVEsQ0FBQyxlQUFlLEVBQUU7Z0JBQzVCLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsT0FBTztnQkFDTCxJQUFJLEVBQUUsUUFBUSxDQUFDLFVBQVU7Z0JBQ3pCLEdBQUcsRUFBRSxRQUFRLENBQUMsYUFBYTthQUM1QixDQUFDO1FBQ0osQ0FBQztLQUNGLENBQUM7SUFFRixPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDLENBQUM7QUFFRixrQkFBZSxFQUFDLGlCQUFpQixFQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcbmltcG9ydCB7VHJhbnNmb3JtZXJDcmVhdG9yLCBTeW5jVHJhbnNmb3JtZXJ9IGZyb20gJ0BqZXN0L3RyYW5zZm9ybSc7XG5pbXBvcnQge3RyYW5zcGlsZVNpbmdsZUZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvdHNjLXV0aWwnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuLy8gaW5zcGVjdG9yLm9wZW4oOTIyMiwgJ2xvY2FsaG9zdCcsIHRydWUpO1xuXG50eXBlIFRyYW5zZm9ybWVyQ29uZmlnID0ge1xuICByb290RmlsZXM6IHN0cmluZ1tdO1xufTtcblxuY29uc3QgY3JlYXRlVHJhbnNmb3JtZXI6IFRyYW5zZm9ybWVyQ3JlYXRvcjxTeW5jVHJhbnNmb3JtZXI8VHJhbnNmb3JtZXJDb25maWc+LCBUcmFuc2Zvcm1lckNvbmZpZz4gPSAoY29uZmlnKSA9PiB7XG4gIC8vIGNvbnN0IGV2ZW50cyA9IHdhdGgoY29uZmlnIS5yb290RmlsZXMpO1xuICAvLyByeC5tZXJnZShcbiAgLy8gICBldmVudHMub25Xcml0ZUZpbGUucGlwZSggb3AubWFwKCh7cGF5bG9hZDogW2ZpbGVOYW1lLCBkYXRhLCBvbkVycm9yLCBzb3VyY2VzXX0pID0+IHtcbiAgLy8gICAgICAgZGVidWdnZXI7XG4gIC8vICAgICB9KVxuICAvLyAgICksXG4gIC8vICAgZXZlbnRzLm9uRGlhZ25vc3RpY1N0cmluZy5waXBlKFxuICAvLyAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgLy8gICAgIG9wLm1hcChpbmZvID0+IGNvbnNvbGUubG9nKGluZm8pKVxuICAvLyAgIClcbiAgLy8gKS5zdWJzY3JpYmUoKTtcblxuICBjb25zdCB0cmFuc2Zvcm1lcjogU3luY1RyYW5zZm9ybWVyPFRyYW5zZm9ybWVyQ29uZmlnPiA9IHtcbiAgICBwcm9jZXNzKHNvdXJjZVRleHQsIHNvdXJjZVBhdGgsIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IGNvbXBpbGVkID0gdHJhbnNwaWxlU2luZ2xlRmlsZShzb3VyY2VUZXh0LCB0cyk7XG4gICAgICBpZiAoY29tcGlsZWQuZGlhZ25vc3RpY3NUZXh0KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoY29tcGlsZWQuZGlhZ25vc3RpY3NUZXh0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvZGU6IGNvbXBpbGVkLm91dHB1dFRleHQsXG4gICAgICAgIG1hcDogY29tcGlsZWQuc291cmNlTWFwVGV4dFxuICAgICAgfTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHRyYW5zZm9ybWVyO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge2NyZWF0ZVRyYW5zZm9ybWVyfTtcbiJdfQ==