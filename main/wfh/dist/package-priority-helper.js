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
// tslint:disable max-line-length
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsK0JBQStCLENBQUMsQ0FBQztBQUV6RSxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQVFoRCxpQ0FBaUM7QUFDakMsU0FBZ0IsYUFBYSxDQUFDLFFBQXVCLEVBQUUsR0FBd0Q7SUFDN0csTUFBTSxjQUFjLEdBQThCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLGNBQWMsR0FBK0MsRUFBRSxDQUFDO0lBQ3RFLE1BQU0sYUFBYSxHQUErQyxFQUFFLENBQUM7SUFFckUsTUFBTSxhQUFhLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdkQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNwQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDLEVBQTZCLENBQUMsQ0FBQztTQUNwRDthQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0M7b0JBQzdELEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMs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QVEsQ0FBQyxDQUFDO1lBQzNELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2QixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVCLE1BQU0sZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7S0FBQTtJQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUNyQyxPQUFPLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZO1FBQ3BDLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBL0VELHNDQStFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncGxpbmsucGFja2FnZS1wcmlvcml0eS1oZWxwZXInKTtcblxuY29uc3QgcHJpb3JpdHlTdHJSZWcgPSAvKGJlZm9yZXxhZnRlcilcXHMrKFxcUyspLztcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgcHJpb3JpdHk/OiBzdHJpbmcgfCBudW1iZXI7XG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5ID0ge1trZXkgaW4ga2V5b2YgUGFja2FnZUluZm9dLT86IFBhY2thZ2VJbmZvW2tleV19O1xuLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJQYWNrYWdlcyhwYWNrYWdlczogUGFja2FnZUluZm9bXSwgcnVuOiAocGs6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KSA9PiBQcm9taXNlPGFueT4gfCBhbnkpIHtcbiAgY29uc3QgbnVtYmVyVHlwZVByaW86IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W10gPSBbXTtcbiAgY29uc3QgYmVmb3JlUGFja2FnZXM6IHtba2V5OiBzdHJpbmddOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eVtdfSA9IHt9O1xuICBjb25zdCBhZnRlclBhY2thZ2VzOiB7W2tleTogc3RyaW5nXTogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXX0gPSB7fTtcblxuICBjb25zdCBiZWZvcmVPckFmdGVyOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4gPSBuZXcgTWFwKCk7XG4gIHBhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuICAgIGNvbnN0IHByaW9yaXR5ID0gcGsucHJpb3JpdHk7XG4gICAgaWYgKF8uaXNOdW1iZXIocHJpb3JpdHkpKSB7XG4gICAgICBudW1iZXJUeXBlUHJpby5wdXNoKHBrIGFzIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KTtcbiAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcocHJpb3JpdHkpKSB7XG4gICAgICBjb25zdCByZXMgPSBwcmlvcml0eVN0clJlZy5leGVjKHByaW9yaXR5KTtcbiAgICAgIGlmICghcmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmb3JtYXQgb2YgcGFja2FnZS5qc29uIC0gcHJpb3JpdHkgaW4gJyArXG4gICAgICAgICAgcGsubmFtZSArICc6ICcgKyBwcmlvcml0eSk7XG4gICAgICB9XG4gICAgICBjb25zdCB0YXJnZXRQYWNrYWdlTmFtZSA9IHJlc1syXTtcbiAgICAgIGlmIChyZXNbMV0gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgIGlmICghYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdKSB7XG4gICAgICAgICAgYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdID0gW107XG4gICAgICAgICAgYmVmb3JlT3JBZnRlci5zZXQodGFyZ2V0UGFja2FnZU5hbWUsIFtway5uYW1lLCBway5wcmlvcml0eSBhcyBzdHJpbmddKTsgLy8gdHJhY2sgdGFyZ2V0IHBhY2thZ2VcbiAgICAgICAgfVxuICAgICAgICBiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0ucHVzaChwayBhcyBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSk7XG4gICAgICB9IGVsc2UgaWYgKHJlc1sxXSA9PT0gJ2FmdGVyJykge1xuICAgICAgICBpZiAoIWFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdKSB7XG4gICAgICAgICAgYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgICAgICBiZWZvcmVPckFmdGVyLnNldCh0YXJnZXRQYWNrYWdlTmFtZSwgW3BrLm5hbWUsIHBrLnByaW9yaXR5IGFzIHN0cmluZ10pOyAvLyB0cmFjayB0YXJnZXQgcGFja2FnZVxuICAgICAgICB9XG4gICAgICAgIGFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdLnB1c2gocGsgYXMgUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBway5wcmlvcml0eSA9IDUwMDA7XG4gICAgICBudW1iZXJUeXBlUHJpby5wdXNoKHBrIGFzIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KTtcbiAgICB9XG4gIH0pO1xuICBudW1iZXJUeXBlUHJpby5zb3J0KGZ1bmN0aW9uKHBrMSwgcGsyKSB7XG4gICAgcmV0dXJuIHBrMi5wcmlvcml0eSBhcyBudW1iZXIgLSAocGsxLnByaW9yaXR5IGFzIG51bWJlcik7XG4gIH0pO1xuXG4gIGNvbnN0IHBrTmFtZXMgPSBwYWNrYWdlcy5tYXAocCA9PiBwLm5hbWUpO1xuXG4gIGNvbnN0IG5vdEZvdW5kID0gXy5kaWZmZXJlbmNlKEFycmF5LmZyb20oYmVmb3JlT3JBZnRlci5rZXlzKCkpLCBwa05hbWVzKVxuICAubWFwKG5hbWUgPT4gbmFtZSArIGAgYnkgJHtiZWZvcmVPckFmdGVyLmdldChuYW1lKSEuam9pbignXFwncyAnKX1gKTtcblxuICBpZiAobm90Rm91bmQubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGVyciA9ICdQcmlvcml0eSBkZXBlbmRlZCBwYWNrYWdlcyBhcmUgbm90IGZvdW5kOiAnICsgIG5vdEZvdW5kICtcbiAgICAgICdcXG5Ub3RhbCBwYWNrYWdlcyBhdmFpbGFibGU6XFxuJyArIHBrTmFtZXMuam9pbignXFxuJyk7XG4gICAgbG9nLmVycm9yKGVycik7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihlcnIpKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2VzU3luYyhwYWNrYWdlczogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXSkge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXMpIHtcbiAgICAgIGF3YWl0IHJ1blBhY2thZ2UocGspO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1blBhY2thZ2VzQXN5bmMocGFja2FnZXM6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W10pIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocGFja2FnZXMubWFwKHJ1blBhY2thZ2UpKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2UocGs6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KSB7XG4gICAgYXdhaXQgYmVmb3JlSGFuZGxlcnNGb3IocGsubmFtZSk7XG4gICAgbG9nLmRlYnVnKHBrLm5hbWUsICcgc3RhcnRzIHdpdGggcHJpb3JpdHk6ICcsIHBrLnByaW9yaXR5KTtcbiAgICBjb25zdCBhbnlSZXMgPSBydW4ocGspO1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShhbnlSZXMpO1xuICAgIGxvZy5kZWJ1Zyhway5uYW1lLCAnIGVuZHMnKTtcbiAgICBhd2FpdCBhZnRlckhhbmRsZXJzRm9yKHBrLm5hbWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmVmb3JlSGFuZGxlcnNGb3IobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHJ1blBhY2thZ2VzQXN5bmMoYmVmb3JlUGFja2FnZXNbbmFtZV0gPyBiZWZvcmVQYWNrYWdlc1tuYW1lXSA6IFtdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFmdGVySGFuZGxlcnNGb3IobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHJ1blBhY2thZ2VzQXN5bmMoYWZ0ZXJQYWNrYWdlc1tuYW1lXSA/IGFmdGVyUGFja2FnZXNbbmFtZV0gOiBbXSk7XG4gIH1cblxuICByZXR1cm4gcnVuUGFja2FnZXNTeW5jKG51bWJlclR5cGVQcmlvKTtcbn1cbiJdfQ==