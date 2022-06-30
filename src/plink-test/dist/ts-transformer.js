"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const tsc_util_1 = require("@wfh/plink/wfh/dist/utils/tsc-util");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHMtdHJhbnNmb3JtZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0cy10cmFuc2Zvcm1lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQSxpRUFBdUU7QUFDdkUsb0VBQTRCO0FBTzVCLE1BQU0saUJBQWlCLEdBQThFLENBQUMsTUFBTSxFQUFFLEVBQUU7SUFDOUcsMENBQTBDO0lBQzFDLFlBQVk7SUFDWix5RkFBeUY7SUFDekYsa0JBQWtCO0lBQ2xCLFNBQVM7SUFDVCxPQUFPO0lBQ1Asb0NBQW9DO0lBQ3BDLDZDQUE2QztJQUM3Qyx3Q0FBd0M7SUFDeEMsTUFBTTtJQUNOLGlCQUFpQjtJQUVqQixNQUFNLFdBQVcsR0FBdUM7UUFDdEQsT0FBTyxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTztZQUNyQyxNQUFNLFFBQVEsR0FBRyxJQUFBLDhCQUFtQixFQUFDLFVBQVUsRUFBRSxvQkFBRSxDQUFDLENBQUM7WUFDckQsSUFBSSxRQUFRLENBQUMsZUFBZSxFQUFFO2dCQUM1QixPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQzthQUN6QztZQUNELE9BQU87Z0JBQ0wsSUFBSSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUN6QixHQUFHLEVBQUUsUUFBUSxDQUFDLGFBQWE7YUFDNUIsQ0FBQztRQUNKLENBQUM7S0FDRixDQUFDO0lBRUYsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsRUFBQyxpQkFBaUIsRUFBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQgaW5zcGVjdG9yIGZyb20gJ2luc3BlY3Rvcic7XG5pbXBvcnQge1RyYW5zZm9ybWVyQ3JlYXRvciwgU3luY1RyYW5zZm9ybWVyfSBmcm9tICdAamVzdC90cmFuc2Zvcm0nO1xuaW1wb3J0IHt0cmFuc3BpbGVTaW5nbGVGaWxlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3RzYy11dGlsJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcblxudHlwZSBUcmFuc2Zvcm1lckNvbmZpZyA9IHtcbiAgcm9vdEZpbGVzOiBzdHJpbmdbXTtcbn07XG5cbmNvbnN0IGNyZWF0ZVRyYW5zZm9ybWVyOiBUcmFuc2Zvcm1lckNyZWF0b3I8U3luY1RyYW5zZm9ybWVyPFRyYW5zZm9ybWVyQ29uZmlnPiwgVHJhbnNmb3JtZXJDb25maWc+ID0gKGNvbmZpZykgPT4ge1xuICAvLyBjb25zdCBldmVudHMgPSB3YXRoKGNvbmZpZyEucm9vdEZpbGVzKTtcbiAgLy8gcngubWVyZ2UoXG4gIC8vICAgZXZlbnRzLm9uV3JpdGVGaWxlLnBpcGUoIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlTmFtZSwgZGF0YSwgb25FcnJvciwgc291cmNlc119KSA9PiB7XG4gIC8vICAgICAgIGRlYnVnZ2VyO1xuICAvLyAgICAgfSlcbiAgLy8gICApLFxuICAvLyAgIGV2ZW50cy5vbkRpYWdub3N0aWNTdHJpbmcucGlwZShcbiAgLy8gICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIC8vICAgICBvcC5tYXAoaW5mbyA9PiBjb25zb2xlLmxvZyhpbmZvKSlcbiAgLy8gICApXG4gIC8vICkuc3Vic2NyaWJlKCk7XG5cbiAgY29uc3QgdHJhbnNmb3JtZXI6IFN5bmNUcmFuc2Zvcm1lcjxUcmFuc2Zvcm1lckNvbmZpZz4gPSB7XG4gICAgcHJvY2Vzcyhzb3VyY2VUZXh0LCBzb3VyY2VQYXRoLCBvcHRpb25zKSB7XG4gICAgICBjb25zdCBjb21waWxlZCA9IHRyYW5zcGlsZVNpbmdsZUZpbGUoc291cmNlVGV4dCwgdHMpO1xuICAgICAgaWYgKGNvbXBpbGVkLmRpYWdub3N0aWNzVGV4dCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGNvbXBpbGVkLmRpYWdub3N0aWNzVGV4dCk7XG4gICAgICB9XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb2RlOiBjb21waWxlZC5vdXRwdXRUZXh0LFxuICAgICAgICBtYXA6IGNvbXBpbGVkLnNvdXJjZU1hcFRleHRcbiAgICAgIH07XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB0cmFuc2Zvcm1lcjtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtjcmVhdGVUcmFuc2Zvcm1lcn07XG4iXX0=