"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
    async function runPackagesSync(packages) {
        for (const pk of packages) {
            await runPackage(pk);
        }
    }
    function runPackagesAsync(packages) {
        return Promise.all(packages.map(runPackage));
    }
    async function runPackage(pk) {
        await beforeHandlersFor(pk.name);
        log.debug(pk.name, ' starts with priority: ', pk.priority);
        const anyRes = run(pk);
        await Promise.resolve(anyRes);
        log.debug(pk.name, ' ends');
        await afterHandlersFor(pk.name);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFFekUsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLENBQUM7QUFRaEQsMEJBQTBCO0FBQzFCLFNBQWdCLGFBQWEsQ0FBQyxRQUF1QixFQUFFLEdBQXdEO0lBQzdHLE1BQU0sY0FBYyxHQUE4QixFQUFFLENBQUM7SUFDckQsTUFBTSxjQUFjLEdBQStDLEVBQUUsQ0FBQztJQUN0RSxNQUFNLGFBQWEsR0FBK0MsRUFBRSxDQUFDO0lBRXJFLE1BQU0sYUFBYSxHQUEwQixJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3ZELFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDcEIsTUFBTSxRQUFRLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQztRQUM3QixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDeEIsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUE2QixDQUFDLENBQUM7U0FDcEQ7YUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQStDO29CQUM3RCxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQzthQUM5QjtZQUNELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLENBQUMs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Q0FBQyxDQUFDO1FBQzNELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN2QixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLE1BQU0sZ0JBQWdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQVk7UUFDckMsT0FBTyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQztJQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBWTtRQUNwQyxPQUFPLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsT0FBTyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDekMsQ0FBQztBQS9FRCxzQ0ErRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtcHJpb3JpdHktaGVscGVyJyk7XG5cbmNvbnN0IHByaW9yaXR5U3RyUmVnID0gLyhiZWZvcmV8YWZ0ZXIpXFxzKyhcXFMrKS87XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByaW9yaXR5Pzogc3RyaW5nIHwgbnVtYmVyO1xufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSA9IHtba2V5IGluIGtleW9mIFBhY2thZ2VJbmZvXS0/OiBQYWNrYWdlSW5mb1trZXldfTtcbi8vIGVzbGludC1kaXNhYmxlICBtYXgtbGVuXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJQYWNrYWdlcyhwYWNrYWdlczogUGFja2FnZUluZm9bXSwgcnVuOiAocGs6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KSA9PiBQcm9taXNlPGFueT4gfCBhbnkpIHtcbiAgY29uc3QgbnVtYmVyVHlwZVByaW86IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W10gPSBbXTtcbiAgY29uc3QgYmVmb3JlUGFja2FnZXM6IHtba2V5OiBzdHJpbmddOiBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eVtdfSA9IHt9O1xuICBjb25zdCBhZnRlclBhY2thZ2VzOiB7W2tleTogc3RyaW5nXTogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXX0gPSB7fTtcblxuICBjb25zdCBiZWZvcmVPckFmdGVyOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4gPSBuZXcgTWFwKCk7XG4gIHBhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuICAgIGNvbnN0IHByaW9yaXR5ID0gcGsucHJpb3JpdHk7XG4gICAgaWYgKF8uaXNOdW1iZXIocHJpb3JpdHkpKSB7XG4gICAgICBudW1iZXJUeXBlUHJpby5wdXNoKHBrIGFzIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KTtcbiAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcocHJpb3JpdHkpKSB7XG4gICAgICBjb25zdCByZXMgPSBwcmlvcml0eVN0clJlZy5leGVjKHByaW9yaXR5KTtcbiAgICAgIGlmICghcmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmb3JtYXQgb2YgcGFja2FnZS5qc29uIC0gcHJpb3JpdHkgaW4gJyArXG4gICAgICAgICAgcGsubmFtZSArICc6ICcgKyBwcmlvcml0eSk7XG4gICAgICB9XG4gICAgICBjb25zdCB0YXJnZXRQYWNrYWdlTmFtZSA9IHJlc1syXTtcbiAgICAgIGlmIChyZXNbMV0gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgIGlmICghYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdKSB7XG4gICAgICAgICAgYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdID0gW107XG4gICAgICAgICAgYmVmb3JlT3JBZnRlci5zZXQodGFyZ2V0UGFja2FnZU5hbWUsIFtway5uYW1lLCBway5wcmlvcml0eSBhcyBzdHJpbmddKTsgLy8gdHJhY2sgdGFyZ2V0IHBhY2thZ2VcbiAgICAgICAgfVxuICAgICAgICBiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0ucHVzaChwayBhcyBQYWNrYWdlSW5mb1dpdGhQcmlvcml0eSk7XG4gICAgICB9IGVsc2UgaWYgKHJlc1sxXSA9PT0gJ2FmdGVyJykge1xuICAgICAgICBpZiAoIWFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdKSB7XG4gICAgICAgICAgYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgICAgICBiZWZvcmVPckFmdGVyLnNldCh0YXJnZXRQYWNrYWdlTmFtZSwgW3BrLm5hbWUsIHBrLnByaW9yaXR5IGFzIHN0cmluZ10pOyAvLyB0cmFjayB0YXJnZXQgcGFja2FnZVxuICAgICAgICB9XG4gICAgICAgIGFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdLnB1c2gocGsgYXMgUGFja2FnZUluZm9XaXRoUHJpb3JpdHkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBway5wcmlvcml0eSA9IDUwMDA7XG4gICAgICBudW1iZXJUeXBlUHJpby5wdXNoKHBrIGFzIFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KTtcbiAgICB9XG4gIH0pO1xuICBudW1iZXJUeXBlUHJpby5zb3J0KGZ1bmN0aW9uKHBrMSwgcGsyKSB7XG4gICAgcmV0dXJuIHBrMi5wcmlvcml0eSBhcyBudW1iZXIgLSAocGsxLnByaW9yaXR5IGFzIG51bWJlcik7XG4gIH0pO1xuXG4gIGNvbnN0IHBrTmFtZXMgPSBwYWNrYWdlcy5tYXAocCA9PiBwLm5hbWUpO1xuXG4gIGNvbnN0IG5vdEZvdW5kID0gXy5kaWZmZXJlbmNlKEFycmF5LmZyb20oYmVmb3JlT3JBZnRlci5rZXlzKCkpLCBwa05hbWVzKVxuICAubWFwKG5hbWUgPT4gbmFtZSArIGAgYnkgJHtiZWZvcmVPckFmdGVyLmdldChuYW1lKSEuam9pbignXFwncyAnKX1gKTtcblxuICBpZiAobm90Rm91bmQubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGVyciA9ICdQcmlvcml0eSBkZXBlbmRlZCBwYWNrYWdlcyBhcmUgbm90IGZvdW5kOiAnICsgIG5vdEZvdW5kICtcbiAgICAgICdcXG5Ub3RhbCBwYWNrYWdlcyBhdmFpbGFibGU6XFxuJyArIHBrTmFtZXMuam9pbignXFxuJyk7XG4gICAgbG9nLmVycm9yKGVycik7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcihlcnIpKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2VzU3luYyhwYWNrYWdlczogUGFja2FnZUluZm9XaXRoUHJpb3JpdHlbXSkge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXMpIHtcbiAgICAgIGF3YWl0IHJ1blBhY2thZ2UocGspO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1blBhY2thZ2VzQXN5bmMocGFja2FnZXM6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5W10pIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocGFja2FnZXMubWFwKHJ1blBhY2thZ2UpKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2UocGs6IFBhY2thZ2VJbmZvV2l0aFByaW9yaXR5KSB7XG4gICAgYXdhaXQgYmVmb3JlSGFuZGxlcnNGb3IocGsubmFtZSk7XG4gICAgbG9nLmRlYnVnKHBrLm5hbWUsICcgc3RhcnRzIHdpdGggcHJpb3JpdHk6ICcsIHBrLnByaW9yaXR5KTtcbiAgICBjb25zdCBhbnlSZXMgPSBydW4ocGspO1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShhbnlSZXMpO1xuICAgIGxvZy5kZWJ1Zyhway5uYW1lLCAnIGVuZHMnKTtcbiAgICBhd2FpdCBhZnRlckhhbmRsZXJzRm9yKHBrLm5hbWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gYmVmb3JlSGFuZGxlcnNGb3IobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHJ1blBhY2thZ2VzQXN5bmMoYmVmb3JlUGFja2FnZXNbbmFtZV0gPyBiZWZvcmVQYWNrYWdlc1tuYW1lXSA6IFtdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFmdGVySGFuZGxlcnNGb3IobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHJ1blBhY2thZ2VzQXN5bmMoYWZ0ZXJQYWNrYWdlc1tuYW1lXSA/IGFmdGVyUGFja2FnZXNbbmFtZV0gOiBbXSk7XG4gIH1cblxuICByZXR1cm4gcnVuUGFja2FnZXNTeW5jKG51bWJlclR5cGVQcmlvKTtcbn1cbiJdfQ==