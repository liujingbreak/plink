"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderPackages = void 0;
const _ = __importStar(require("lodash"));
const log = require('log4js').getLogger('plink.package-priority-helper');
const priorityStrReg = /(before|after)\s+(\S+)/;
// eslint-disable  max-len
function orderPackages(packages, run) {
    const numberTypePrio = [];
    const beforePackages = {};
    const afterPackages = {};
    const beforeOrAfter = new Map();
    packages.forEach(pk => {
        const priority = pk.priority;
        if (_.isNumber(priority)) {
            numberTypePrio.push(pk);
        }
        else if (_.isString(priority)) {
            const res = priorityStrReg.exec(priority);
            if (!res) {
                throw new Error('Invalid format of package.json - priority in ' +
                    pk.name + ': ' + priority);
            }
            const targetPackageName = res[2];
            if (res[1] === 'before') {
                if (!beforePackages[targetPackageName]) {
                    beforePackages[targetPackageName] = [];
                    beforeOrAfter.set(targetPackageName, [pk.name, pk.priority]); // track target package
                }
                beforePackages[targetPackageName].push(pk);
            }
            else if (res[1] === 'after') {
                if (!afterPackages[targetPackageName]) {
                    afterPackages[targetPackageName] = [];
                    beforeOrAfter.set(targetPackageName, [pk.name, pk.priority]); // track target package
                }
                afterPackages[targetPackageName].push(pk);
            }
        }
        else {
            pk.priority = 5000;
            numberTypePrio.push(pk);
        }
    });
    numberTypePrio.sort(function (pk1, pk2) {
        return pk2.priority - pk1.priority;
    });
    const pkNames = packages.map(p => p.name);
    const notFound = _.difference(Array.from(beforeOrAfter.keys()), pkNames)
        .map(name => name + ` by ${beforeOrAfter.get(name).join('\'s ')}`);
    if (notFound.length > 0) {
        const err = 'Priority depended packages are not found: ' + notFound +
            '\nTotal packages available:\n' + pkNames.join('\n');
        log.error(err);
        return Promise.reject(new Error(err));
    }
    function runPackagesSync(packages) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const pk of packages) {
                yield runPackage(pk);
            }
        });
    }
    function runPackagesAsync(packages) {
        return Promise.all(packages.map(runPackage));
    }
    function runPackage(pk) {
        return __awaiter(this, void 0, void 0, function* () {
            yield beforeHandlersFor(pk.name);
            log.debug(pk.name, ' starts with priority: ', pk.priority);
            const anyRes = run(pk);
            yield Promise.resolve(anyRes);
            log.debug(pk.name, ' ends');
            yield afterHandlersFor(pk.name);
        });
    }
    function beforeHandlersFor(name) {
        return runPackagesAsync(beforePackages[name] ? beforePackages[name] : []);
    }
    function afterHandlersFor(name) {
        return runPackagesAsync(afterPackages[name] ? afterPackages[name] : []);
    }
    return runPackagesSync(numberTypePrio);
}
exports.orderPackages = orderPackages;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsQ0FBQztBQUV6RSxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQVFoRCwwQkFBMEI7QUFDMUIsU0FBZ0IsYUFBYSxDQUFDLFFBQXVCLEVBQUUsR0FBd0Q7SUFDN0csTUFBTSxjQUFjLEdBQThCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLGNBQWMsR0FBK0MsRUFBRSxDQUFDO0lBQ3RFLE1BQU0sYUFBYSxHQUErQyxFQUFFLENBQUM7SUFFckUsTUFBTSxhQUFhLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdkQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNwQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDLEVBQTZCLENBQUMsQ0FBQztTQUNwRDthQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0M7b0JBQzdELEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFO2dCQUN2QixJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLEVBQUU7b0JBQ3RDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDdkMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFFBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO2lCQUNoRztnQkFDRCxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBNkIsQ0FBQyxDQUFDO2FBQ3ZFO2lCQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRTtnQkFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUNyQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ3RDLGFBQWEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtpQkFDaEc7Z0JBQ0QsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQTZCLENBQUMsQ0FBQzthQUN0RTtTQUNGO2FBQU07WUFDTCxFQUFFLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztZQUNuQixjQUFjLENBQUMsSUFBSSxDQUFDLEVBQTZCLENBQUMsQ0FBQztTQUNwRDtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsY0FBYyxDQUFDLElBQUksQ0FBQyxVQUFTLEdBQUcsRUFBRSxHQUFHO1FBQ25DLE9BQU8sR0FBRyxDQUFDLFFBQWtCLEdBQUksR0FBRyxDQUFDLFFBQW1CLENBQUM7SUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTFDLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUM7U0FDdkUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLE9BQU8sYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRXBFLElBQUksUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDdkIsTUFBTSxHQUFHLEdBQUcsNENBQTRDLEdBQUksUUFBUTtZQUNsRSwrQkFBK0IsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztLQUN2QztJQUVELFNBQWUsZUFBZSxDQUFDLFFBQW1DOztZQUNoRSxLQUFLLE1BQU0sRUFBRSxJQUFJLFFBQVEsRUFBRTtnQkFDekIsTUFBTSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdEI7UUFDSCxDQUFDO0tBQUE7SUFFRCxTQUFTLGdCQUFnQixDQUFDLFFBQW1DO1FBQzNELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELFNBQWUsVUFBVSxDQUFDLEVBQTJCOztZQUNuRCxNQUFNLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2QixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVCLE1BQU0sZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7S0FBQTtJQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUNyQyxPQUFPLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZO1FBQ3BDLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBL0VELHNDQStFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncGxpbmsucGFja2FnZS1wcmlvcml0eS1oZWxwZXInKTtcblxuY29uc3QgcHJpb3JpdHlTdHJSZWcgPSAvKGJlZm9yZXxhZnRlcilcXHMrKFxcUyspLztcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJpb3JpdHk/OiBzdHJpbmcgfCBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5ID0ge1trZXkgaW4ga2V5b2YgUGFja2FnZUluZm9dLT86IFBhY2thZ2VJbmZvW2tleV19O1xuLy8gZXNsaW50LWRpc2FibGUgIG1heC1sZW5cbmV4cG9ydCBmdW5jdGlvbiBvcmRlclBhY2thZ2VzKHBhY2thZ2VzOiBQYWNrYWdlSW5mb1tdLCBydW46IChwazogUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpID0+IFByb21pc2U8YW55PiB8IGFueSkge1xuICBjb25zdCBudW1iZXJUeXBlUHJpbzogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXSA9IFtdO1xuICBjb25zdCBiZWZvcmVQYWNrYWdlczoge1trZXk6IHN0cmluZ106IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W119ID0ge307XG4gIGNvbnN0IGFmdGVyUGFja2FnZXM6IHtba2V5OiBzdHJpbmddOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eVtdfSA9IHt9O1xuXG4gIGNvbnN0IGJlZm9yZU9yQWZ0ZXI6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoKTtcbiAgcGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG4gICAgY29uc3QgcHJpb3JpdHkgPSBway5wcmlvcml0eTtcbiAgICBpZiAoXy5pc051bWJlcihwcmlvcml0eSkpIHtcbiAgICAgIG51bWJlclR5cGVQcmlvLnB1c2gocGsgYXMgUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpO1xuICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhwcmlvcml0eSkpIHtcbiAgICAgIGNvbnN0IHJlcyA9IHByaW9yaXR5U3RyUmVnLmV4ZWMocHJpb3JpdHkpO1xuICAgICAgaWYgKCFyZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZvcm1hdCBvZiBwYWNrYWdlLmpzb24gLSBwcmlvcml0eSBpbiAnICtcbiAgICAgICAgICBway5uYW1lICsgJzogJyArIHByaW9yaXR5KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFBhY2thZ2VOYW1lID0gcmVzWzJdO1xuICAgICAgaWYgKHJlc1sxXSA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgaWYgKCFiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgICBiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgICAgICBiZWZvcmVPckFmdGVyLnNldCh0YXJnZXRQYWNrYWdlTmFtZSwgW3BrLm5hbWUsIHBrLnByaW9yaXR5IGFzIHN0cmluZ10pOyAvLyB0cmFjayB0YXJnZXQgcGFja2FnZVxuICAgICAgICB9XG4gICAgICAgIGJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXS5wdXNoKHBrIGFzIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KTtcbiAgICAgIH0gZWxzZSBpZiAocmVzWzFdID09PSAnYWZ0ZXInKSB7XG4gICAgICAgIGlmICghYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgICBhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSA9IFtdO1xuICAgICAgICAgIGJlZm9yZU9yQWZ0ZXIuc2V0KHRhcmdldFBhY2thZ2VOYW1lLCBbcGsubmFtZSwgcGsucHJpb3JpdHkgYXMgc3RyaW5nXSk7IC8vIHRyYWNrIHRhcmdldCBwYWNrYWdlXG4gICAgICAgIH1cbiAgICAgICAgYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0ucHVzaChwayBhcyBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBrLnByaW9yaXR5ID0gNTAwMDtcbiAgICAgIG51bWJlclR5cGVQcmlvLnB1c2gocGsgYXMgUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpO1xuICAgIH1cbiAgfSk7XG4gIG51bWJlclR5cGVQcmlvLnNvcnQoZnVuY3Rpb24ocGsxLCBwazIpIHtcbiAgICByZXR1cm4gcGsyLnByaW9yaXR5IGFzIG51bWJlciAtIChwazEucHJpb3JpdHkgYXMgbnVtYmVyKTtcbiAgfSk7XG5cbiAgY29uc3QgcGtOYW1lcyA9IHBhY2thZ2VzLm1hcChwID0+IHAubmFtZSk7XG5cbiAgY29uc3Qgbm90Rm91bmQgPSBfLmRpZmZlcmVuY2UoQXJyYXkuZnJvbShiZWZvcmVPckFmdGVyLmtleXMoKSksIHBrTmFtZXMpXG4gIC5tYXAobmFtZSA9PiBuYW1lICsgYCBieSAke2JlZm9yZU9yQWZ0ZXIuZ2V0KG5hbWUpIS5qb2luKCdcXCdzICcpfWApO1xuXG4gIGlmIChub3RGb3VuZC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZXJyID0gJ1ByaW9yaXR5IGRlcGVuZGVkIHBhY2thZ2VzIGFyZSBub3QgZm91bmQ6ICcgKyAgbm90Rm91bmQgK1xuICAgICAgJ1xcblRvdGFsIHBhY2thZ2VzIGF2YWlsYWJsZTpcXG4nICsgcGtOYW1lcy5qb2luKCdcXG4nKTtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGVycikpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcnVuUGFja2FnZXNTeW5jKHBhY2thZ2VzOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eVtdKSB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlcykge1xuICAgICAgYXdhaXQgcnVuUGFja2FnZShwayk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuUGFja2FnZXNBc3luYyhwYWNrYWdlczogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXSkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChwYWNrYWdlcy5tYXAocnVuUGFja2FnZSkpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcnVuUGFja2FnZShwazogUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpIHtcbiAgICBhd2FpdCBiZWZvcmVIYW5kbGVyc0Zvcihway5uYW1lKTtcbiAgICBsb2cuZGVidWcocGsubmFtZSwgJyBzdGFydHMgd2l0aCBwcmlvcml0eTogJywgcGsucHJpb3JpdHkpO1xuICAgIGNvbnN0IGFueVJlcyA9IHJ1bihwayk7XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGFueVJlcyk7XG4gICAgbG9nLmRlYnVnKHBrLm5hbWUsICcgZW5kcycpO1xuICAgIGF3YWl0IGFmdGVySGFuZGxlcnNGb3IocGsubmFtZSk7XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVIYW5kbGVyc0ZvcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcnVuUGFja2FnZXNBc3luYyhiZWZvcmVQYWNrYWdlc1tuYW1lXSA/IGJlZm9yZVBhY2thZ2VzW25hbWVdIDogW10pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWZ0ZXJIYW5kbGVyc0ZvcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcnVuUGFja2FnZXNBc3luYyhhZnRlclBhY2thZ2VzW25hbWVdID8gYWZ0ZXJQYWNrYWdlc1tuYW1lXSA6IFtdKTtcbiAgfVxuXG4gIHJldHVybiBydW5QYWNrYWdlc1N5bmMobnVtYmVyVHlwZVByaW8pO1xufVxuIl19