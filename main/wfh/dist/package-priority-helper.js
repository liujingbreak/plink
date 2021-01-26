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
const log = require('log4js').getLogger('packagePriorityHelper');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUVqRSxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQVFoRCxpQ0FBaUM7QUFDakMsU0FBZ0IsYUFBYSxDQUFDLFFBQXVCLEVBQUUsR0FBd0Q7SUFDN0csTUFBTSxjQUFjLEdBQThCLEVBQUUsQ0FBQztJQUNyRCxNQUFNLGNBQWMsR0FBK0MsRUFBRSxDQUFDO0lBQ3RFLE1BQU0sYUFBYSxHQUErQyxFQUFFLENBQUM7SUFFckUsTUFBTSxhQUFhLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdkQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNwQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQzdCLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDLEVBQTZCLENBQUMsQ0FBQztTQUNwRDthQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ1IsTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0M7b0JBQzdELEVBQUUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDO2FBQzlCO1lBQ0QsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUMs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QVEsQ0FBQyxDQUFDO1lBQzNELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2QixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzVCLE1BQU0sZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xDLENBQUM7S0FBQTtJQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUNyQyxPQUFPLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZO1FBQ3BDLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBL0VELHNDQStFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncGFja2FnZVByaW9yaXR5SGVscGVyJyk7XG5cbmNvbnN0IHByaW9yaXR5U3RyUmVnID0gLyhiZWZvcmV8YWZ0ZXIpXFxzKyhcXFMrKS87XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByaW9yaXR5Pzogc3RyaW5nIHwgbnVtYmVyO1xufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSA9IHtba2V5IGluIGtleW9mIFBhY2thZ2VJbmZvXS0/OiBQYWNrYWdlSW5mb1trZXldfTtcbi8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuZXhwb3J0IGZ1bmN0aW9uIG9yZGVyUGFja2FnZXMocGFja2FnZXM6IFBhY2thZ2VJbmZvW10sIHJ1bjogKHBrOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSkgPT4gUHJvbWlzZTxhbnk+IHwgYW55KSB7XG4gIGNvbnN0IG51bWJlclR5cGVQcmlvOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eVtdID0gW107XG4gIGNvbnN0IGJlZm9yZVBhY2thZ2VzOiB7W2tleTogc3RyaW5nXTogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXX0gPSB7fTtcbiAgY29uc3QgYWZ0ZXJQYWNrYWdlczoge1trZXk6IHN0cmluZ106IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W119ID0ge307XG5cbiAgY29uc3QgYmVmb3JlT3JBZnRlcjogTWFwPHN0cmluZywgc3RyaW5nW10+ID0gbmV3IE1hcCgpO1xuICBwYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcbiAgICBjb25zdCBwcmlvcml0eSA9IHBrLnByaW9yaXR5O1xuICAgIGlmIChfLmlzTnVtYmVyKHByaW9yaXR5KSkge1xuICAgICAgbnVtYmVyVHlwZVByaW8ucHVzaChwayBhcyBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSk7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHByaW9yaXR5KSkge1xuICAgICAgY29uc3QgcmVzID0gcHJpb3JpdHlTdHJSZWcuZXhlYyhwcmlvcml0eSk7XG4gICAgICBpZiAoIXJlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZm9ybWF0IG9mIHBhY2thZ2UuanNvbiAtIHByaW9yaXR5IGluICcgK1xuICAgICAgICAgIHBrLm5hbWUgKyAnOiAnICsgcHJpb3JpdHkpO1xuICAgICAgfVxuICAgICAgY29uc3QgdGFyZ2V0UGFja2FnZU5hbWUgPSByZXNbMl07XG4gICAgICBpZiAocmVzWzFdID09PSAnYmVmb3JlJykge1xuICAgICAgICBpZiAoIWJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSkge1xuICAgICAgICAgIGJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSA9IFtdO1xuICAgICAgICAgIGJlZm9yZU9yQWZ0ZXIuc2V0KHRhcmdldFBhY2thZ2VOYW1lLCBbcGsubmFtZSwgcGsucHJpb3JpdHkgYXMgc3RyaW5nXSk7IC8vIHRyYWNrIHRhcmdldCBwYWNrYWdlXG4gICAgICAgIH1cbiAgICAgICAgYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdLnB1c2gocGsgYXMgUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpO1xuICAgICAgfSBlbHNlIGlmIChyZXNbMV0gPT09ICdhZnRlcicpIHtcbiAgICAgICAgaWYgKCFhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSkge1xuICAgICAgICAgIGFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdID0gW107XG4gICAgICAgICAgYmVmb3JlT3JBZnRlci5zZXQodGFyZ2V0UGFja2FnZU5hbWUsIFtway5uYW1lLCBway5wcmlvcml0eSBhcyBzdHJpbmddKTsgLy8gdHJhY2sgdGFyZ2V0IHBhY2thZ2VcbiAgICAgICAgfVxuICAgICAgICBhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXS5wdXNoKHBrIGFzIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGsucHJpb3JpdHkgPSA1MDAwO1xuICAgICAgbnVtYmVyVHlwZVByaW8ucHVzaChwayBhcyBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSk7XG4gICAgfVxuICB9KTtcbiAgbnVtYmVyVHlwZVByaW8uc29ydChmdW5jdGlvbihwazEsIHBrMikge1xuICAgIHJldHVybiBwazIucHJpb3JpdHkgYXMgbnVtYmVyIC0gKHBrMS5wcmlvcml0eSBhcyBudW1iZXIpO1xuICB9KTtcblxuICBjb25zdCBwa05hbWVzID0gcGFja2FnZXMubWFwKHAgPT4gcC5uYW1lKTtcblxuICBjb25zdCBub3RGb3VuZCA9IF8uZGlmZmVyZW5jZShBcnJheS5mcm9tKGJlZm9yZU9yQWZ0ZXIua2V5cygpKSwgcGtOYW1lcylcbiAgLm1hcChuYW1lID0+IG5hbWUgKyBgIGJ5ICR7YmVmb3JlT3JBZnRlci5nZXQobmFtZSkhLmpvaW4oJ1xcJ3MgJyl9YCk7XG5cbiAgaWYgKG5vdEZvdW5kLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBlcnIgPSAnUHJpb3JpdHkgZGVwZW5kZWQgcGFja2FnZXMgYXJlIG5vdCBmb3VuZDogJyArICBub3RGb3VuZCArXG4gICAgICAnXFxuVG90YWwgcGFja2FnZXMgYXZhaWxhYmxlOlxcbicgKyBwa05hbWVzLmpvaW4oJ1xcbicpO1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoZXJyKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlc1N5bmMocGFja2FnZXM6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W10pIHtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VzKSB7XG4gICAgICBhd2FpdCBydW5QYWNrYWdlKHBrKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBydW5QYWNrYWdlc0FzeW5jKHBhY2thZ2VzOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eVtdKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHBhY2thZ2VzLm1hcChydW5QYWNrYWdlKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlKHBrOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSkge1xuICAgIGF3YWl0IGJlZm9yZUhhbmRsZXJzRm9yKHBrLm5hbWUpO1xuICAgIGxvZy5kZWJ1Zyhway5uYW1lLCAnIHN0YXJ0cyB3aXRoIHByaW9yaXR5OiAnLCBway5wcmlvcml0eSk7XG4gICAgY29uc3QgYW55UmVzID0gcnVuKHBrKTtcbiAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUoYW55UmVzKTtcbiAgICBsb2cuZGVidWcocGsubmFtZSwgJyBlbmRzJyk7XG4gICAgYXdhaXQgYWZ0ZXJIYW5kbGVyc0Zvcihway5uYW1lKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZUhhbmRsZXJzRm9yKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBydW5QYWNrYWdlc0FzeW5jKGJlZm9yZVBhY2thZ2VzW25hbWVdID8gYmVmb3JlUGFja2FnZXNbbmFtZV0gOiBbXSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZnRlckhhbmRsZXJzRm9yKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBydW5QYWNrYWdlc0FzeW5jKGFmdGVyUGFja2FnZXNbbmFtZV0gPyBhZnRlclBhY2thZ2VzW25hbWVdIDogW10pO1xuICB9XG5cbiAgcmV0dXJuIHJ1blBhY2thZ2VzU3luYyhudW1iZXJUeXBlUHJpbyk7XG59XG4iXX0=