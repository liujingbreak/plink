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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
function orderPackages(packages, run, priorityProperty) {
    const numberTypePrio = [];
    const beforePackages = {};
    const afterPackages = {};
    if (priorityProperty == null)
        priorityProperty = 'priority';
    const beforeOrAfter = new Map();
    packages.forEach(pk => {
        const priority = _.get(pk, priorityProperty);
        if (_.isNumber(priority)) {
            numberTypePrio.push(pk);
        }
        else if (_.isString(priority)) {
            const res = priorityStrReg.exec(priority);
            if (!res) {
                throw new Error('Invalid format of package.json - priority in ' +
                    pk.longName + ': ' + priority);
            }
            const targetPackageName = res[2];
            if (res[1] === 'before') {
                if (!beforePackages[targetPackageName]) {
                    beforePackages[targetPackageName] = [];
                    beforeOrAfter.set(targetPackageName, [pk.longName, priorityProperty]); // track target package
                }
                beforePackages[targetPackageName].push(pk);
            }
            else if (res[1] === 'after') {
                if (!afterPackages[targetPackageName]) {
                    afterPackages[targetPackageName] = [];
                    beforeOrAfter.set(targetPackageName, [pk.longName, priorityProperty]); // track target package
                }
                afterPackages[targetPackageName].push(pk);
            }
        }
        else {
            _.set(pk, priorityProperty, 5000);
            numberTypePrio.push(pk);
        }
    });
    numberTypePrio.sort(function (pk1, pk2) {
        return _.get(pk2, priorityProperty) - _.get(pk1, priorityProperty);
    });
    const pkNames = packages.map(p => p.longName);
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
            yield beforeHandlersFor(pk.longName);
            log.debug(pk.longName, ' starts with priority: ', _.get(pk, priorityProperty));
            const anyRes = run(pk);
            yield Promise.resolve(anyRes);
            log.debug(pk.longName, ' ends');
            yield afterHandlersFor(pk.longName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBRzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUVqRSxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQUdoRCxpQ0FBaUM7QUFDakMsU0FBZ0IsYUFBYSxDQUFDLFFBQTJCLEVBQUUsR0FBb0MsRUFBRSxnQkFBeUI7SUFDeEgsTUFBTSxjQUFjLEdBQXNCLEVBQUUsQ0FBQztJQUM3QyxNQUFNLGNBQWMsR0FBdUMsRUFBRSxDQUFDO0lBQzlELE1BQU0sYUFBYSxHQUF1QyxFQUFFLENBQUM7SUFDN0QsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJO1FBQzFCLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztJQUVoQyxNQUFNLGFBQWEsR0FBMEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN2RCxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGdCQUFpQixDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3hCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDekI7YUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NBQStDO29CQUM3RCxFQUFFLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQzthQUNsQztZQUNELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRTtnQkFDdkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUN0QyxjQUFjLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ3ZDLGFBQWEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLGdCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtpQkFDaEc7Z0JBQ0QsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzVDO2lCQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRTtnQkFDN0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUNyQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ3RDLGFBQWEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLGdCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QjtpQkFDaEc7Z0JBQ0QsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzNDO1NBQ0Y7YUFBTTtZQUNMLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGdCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25DLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDekI7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBUyxHQUFHLEVBQUUsR0FBRztRQUNuQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGdCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsZ0JBQWlCLENBQUMsQ0FBQztJQUN2RSxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFOUMsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQztTQUN2RSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsT0FBTyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEUsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtRQUN2QixNQUFNLEdBQUcsR0FBRyw0Q0FBNEMsR0FBSSxRQUFRO1lBQ2xFLCtCQUErQixHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkQsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNmLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3ZDO0lBRUQsU0FBZSxlQUFlLENBQUMsUUFBMkI7O1lBQ3hELEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO2dCQUN6QixNQUFNLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN0QjtRQUNILENBQUM7S0FBQTtJQUVELFNBQVMsZ0JBQWdCLENBQUMsUUFBMkI7UUFDbkQsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsU0FBZSxVQUFVLENBQUMsRUFBbUI7O1lBQzNDLE1BQU0saUJBQWlCLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxnQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDaEYsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEMsTUFBTSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdEMsQ0FBQztLQUFBO0lBRUQsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZO1FBQ3JDLE9BQU8sZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVk7UUFDcEMsT0FBTyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVELE9BQU8sZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFqRkQsc0NBaUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhY2thZ2VOb2RlSW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vYnVpbGQtdXRpbC90cy9wYWNrYWdlLWluc3RhbmNlJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncGFja2FnZVByaW9yaXR5SGVscGVyJyk7XG5cbmNvbnN0IHByaW9yaXR5U3RyUmVnID0gLyhiZWZvcmV8YWZ0ZXIpXFxzKyhcXFMrKS87XG5leHBvcnQgdHlwZSBQYWNrYWdlSW5zdGFuY2UgPSBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgUGFja2FnZU5vZGVJbnN0YW5jZTtcblxuLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJQYWNrYWdlcyhwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10sIHJ1bjogKC4uLmFyZzogYW55W10pID0+IFByb21pc2U8YW55PiwgcHJpb3JpdHlQcm9wZXJ0eT86IHN0cmluZykge1xuICBjb25zdCBudW1iZXJUeXBlUHJpbzogUGFja2FnZUluc3RhbmNlW10gPSBbXTtcbiAgY29uc3QgYmVmb3JlUGFja2FnZXM6IHtba2V5OiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2VbXX0gPSB7fTtcbiAgY29uc3QgYWZ0ZXJQYWNrYWdlczoge1trZXk6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZVtdfSA9IHt9O1xuICBpZiAocHJpb3JpdHlQcm9wZXJ0eSA9PSBudWxsKVxuICAgIHByaW9yaXR5UHJvcGVydHkgPSAncHJpb3JpdHknO1xuXG4gIGNvbnN0IGJlZm9yZU9yQWZ0ZXI6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoKTtcbiAgcGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG4gICAgY29uc3QgcHJpb3JpdHkgPSBfLmdldChwaywgcHJpb3JpdHlQcm9wZXJ0eSEpO1xuICAgIGlmIChfLmlzTnVtYmVyKHByaW9yaXR5KSkge1xuICAgICAgbnVtYmVyVHlwZVByaW8ucHVzaChwayk7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHByaW9yaXR5KSkge1xuICAgICAgY29uc3QgcmVzID0gcHJpb3JpdHlTdHJSZWcuZXhlYyhwcmlvcml0eSk7XG4gICAgICBpZiAoIXJlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZm9ybWF0IG9mIHBhY2thZ2UuanNvbiAtIHByaW9yaXR5IGluICcgK1xuICAgICAgICAgIHBrLmxvbmdOYW1lICsgJzogJyArIHByaW9yaXR5KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFBhY2thZ2VOYW1lID0gcmVzWzJdO1xuICAgICAgaWYgKHJlc1sxXSA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgaWYgKCFiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgICBiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgICAgICBiZWZvcmVPckFmdGVyLnNldCh0YXJnZXRQYWNrYWdlTmFtZSwgW3BrLmxvbmdOYW1lLCBwcmlvcml0eVByb3BlcnR5IV0pOyAvLyB0cmFjayB0YXJnZXQgcGFja2FnZVxuICAgICAgICB9XG4gICAgICAgIGJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXS5wdXNoKHBrKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzWzFdID09PSAnYWZ0ZXInKSB7XG4gICAgICAgIGlmICghYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgICBhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSA9IFtdO1xuICAgICAgICAgIGJlZm9yZU9yQWZ0ZXIuc2V0KHRhcmdldFBhY2thZ2VOYW1lLCBbcGsubG9uZ05hbWUsIHByaW9yaXR5UHJvcGVydHkhXSk7IC8vIHRyYWNrIHRhcmdldCBwYWNrYWdlXG4gICAgICAgIH1cbiAgICAgICAgYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0ucHVzaChwayk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIF8uc2V0KHBrLCBwcmlvcml0eVByb3BlcnR5ISwgNTAwMCk7XG4gICAgICBudW1iZXJUeXBlUHJpby5wdXNoKHBrKTtcbiAgICB9XG4gIH0pO1xuXG4gIG51bWJlclR5cGVQcmlvLnNvcnQoZnVuY3Rpb24ocGsxLCBwazIpIHtcbiAgICByZXR1cm4gXy5nZXQocGsyLCBwcmlvcml0eVByb3BlcnR5ISkgLSBfLmdldChwazEsIHByaW9yaXR5UHJvcGVydHkhKTtcbiAgfSk7XG5cbiAgY29uc3QgcGtOYW1lcyA9IHBhY2thZ2VzLm1hcChwID0+IHAubG9uZ05hbWUpO1xuXG4gIGNvbnN0IG5vdEZvdW5kID0gXy5kaWZmZXJlbmNlKEFycmF5LmZyb20oYmVmb3JlT3JBZnRlci5rZXlzKCkpLCBwa05hbWVzKVxuICAubWFwKG5hbWUgPT4gbmFtZSArIGAgYnkgJHtiZWZvcmVPckFmdGVyLmdldChuYW1lKSEuam9pbignXFwncyAnKX1gKTtcbiAgaWYgKG5vdEZvdW5kLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBlcnIgPSAnUHJpb3JpdHkgZGVwZW5kZWQgcGFja2FnZXMgYXJlIG5vdCBmb3VuZDogJyArICBub3RGb3VuZCArXG4gICAgICAnXFxuVG90YWwgcGFja2FnZXMgYXZhaWxhYmxlOlxcbicgKyBwa05hbWVzLmpvaW4oJ1xcbicpO1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoZXJyKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlc1N5bmMocGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZVtdKSB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlcykge1xuICAgICAgYXdhaXQgcnVuUGFja2FnZShwayk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuUGFja2FnZXNBc3luYyhwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10pIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocGFja2FnZXMubWFwKHJ1blBhY2thZ2UpKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2UocGs6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIGF3YWl0IGJlZm9yZUhhbmRsZXJzRm9yKHBrLmxvbmdOYW1lKTtcbiAgICBsb2cuZGVidWcocGsubG9uZ05hbWUsICcgc3RhcnRzIHdpdGggcHJpb3JpdHk6ICcsIF8uZ2V0KHBrLCBwcmlvcml0eVByb3BlcnR5ISkpO1xuICAgIGNvbnN0IGFueVJlcyA9IHJ1bihwayk7XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGFueVJlcyk7XG4gICAgbG9nLmRlYnVnKHBrLmxvbmdOYW1lLCAnIGVuZHMnKTtcbiAgICBhd2FpdCBhZnRlckhhbmRsZXJzRm9yKHBrLmxvbmdOYW1lKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZUhhbmRsZXJzRm9yKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBydW5QYWNrYWdlc0FzeW5jKGJlZm9yZVBhY2thZ2VzW25hbWVdID8gYmVmb3JlUGFja2FnZXNbbmFtZV0gOiBbXSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZnRlckhhbmRsZXJzRm9yKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBydW5QYWNrYWdlc0FzeW5jKGFmdGVyUGFja2FnZXNbbmFtZV0gPyBhZnRlclBhY2thZ2VzW25hbWVdIDogW10pO1xuICB9XG5cbiAgcmV0dXJuIHJ1blBhY2thZ2VzU3luYyhudW1iZXJUeXBlUHJpbyk7XG59XG4iXX0=