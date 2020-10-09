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
            pk.json = JSON.parse(JSON.stringify(pk.json));
            _.set(pk, priorityProperty + '', 5000);
            numberTypePrio.push(pk);
        }
    });
    numberTypePrio.sort(function (pk1, pk2) {
        return _.get(pk2, priorityProperty) - _.get(pk1, priorityProperty);
    });
    // console.log(numberTypePrio.map(p => p.longName + ' ' + _.get(p, priorityProperty!)));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBRzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUVqRSxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQUdoRCxpQ0FBaUM7QUFDakMsU0FBZ0IsYUFBYSxDQUFDLFFBQTJCLEVBQUUsR0FBMEMsRUFBRSxnQkFBeUI7SUFDOUgsTUFBTSxjQUFjLEdBQXNCLEVBQUUsQ0FBQztJQUM3QyxNQUFNLGNBQWMsR0FBdUMsRUFBRSxDQUFDO0lBQzlELE1BQU0sYUFBYSxHQUF1QyxFQUFFLENBQUM7SUFDN0QsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJO1FBQzFCLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztJQUVoQyxNQUFNLGFBQWEsR0FBMEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN2RCxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGdCQUFpQixDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3hCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDekI7YUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NB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bXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGFja2FnZU5vZGVJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluc3RhbmNlJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcigncGFja2FnZVByaW9yaXR5SGVscGVyJyk7XG5cbmNvbnN0IHByaW9yaXR5U3RyUmVnID0gLyhiZWZvcmV8YWZ0ZXIpXFxzKyhcXFMrKS87XG5leHBvcnQgdHlwZSBQYWNrYWdlSW5zdGFuY2UgPSBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgUGFja2FnZU5vZGVJbnN0YW5jZTtcblxuLy8gdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoXG5leHBvcnQgZnVuY3Rpb24gb3JkZXJQYWNrYWdlcyhwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10sIHJ1bjogKC4uLmFyZzogYW55W10pID0+IFByb21pc2U8YW55PiB8IGFueSwgcHJpb3JpdHlQcm9wZXJ0eT86IHN0cmluZykge1xuICBjb25zdCBudW1iZXJUeXBlUHJpbzogUGFja2FnZUluc3RhbmNlW10gPSBbXTtcbiAgY29uc3QgYmVmb3JlUGFja2FnZXM6IHtba2V5OiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2VbXX0gPSB7fTtcbiAgY29uc3QgYWZ0ZXJQYWNrYWdlczoge1trZXk6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZVtdfSA9IHt9O1xuICBpZiAocHJpb3JpdHlQcm9wZXJ0eSA9PSBudWxsKVxuICAgIHByaW9yaXR5UHJvcGVydHkgPSAncHJpb3JpdHknO1xuXG4gIGNvbnN0IGJlZm9yZU9yQWZ0ZXI6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoKTtcbiAgcGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG4gICAgY29uc3QgcHJpb3JpdHkgPSBfLmdldChwaywgcHJpb3JpdHlQcm9wZXJ0eSEpO1xuICAgIGlmIChfLmlzTnVtYmVyKHByaW9yaXR5KSkge1xuICAgICAgbnVtYmVyVHlwZVByaW8ucHVzaChwayk7XG4gICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKHByaW9yaXR5KSkge1xuICAgICAgY29uc3QgcmVzID0gcHJpb3JpdHlTdHJSZWcuZXhlYyhwcmlvcml0eSk7XG4gICAgICBpZiAoIXJlcykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZm9ybWF0IG9mIHBhY2thZ2UuanNvbiAtIHByaW9yaXR5IGluICcgK1xuICAgICAgICAgIHBrLmxvbmdOYW1lICsgJzogJyArIHByaW9yaXR5KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFBhY2thZ2VOYW1lID0gcmVzWzJdO1xuICAgICAgaWYgKHJlc1sxXSA9PT0gJ2JlZm9yZScpIHtcbiAgICAgICAgaWYgKCFiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgICBiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgICAgICBiZWZvcmVPckFmdGVyLnNldCh0YXJnZXRQYWNrYWdlTmFtZSwgW3BrLmxvbmdOYW1lLCBwcmlvcml0eVByb3BlcnR5IV0pOyAvLyB0cmFjayB0YXJnZXQgcGFja2FnZVxuICAgICAgICB9XG4gICAgICAgIGJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXS5wdXNoKHBrKTtcbiAgICAgIH0gZWxzZSBpZiAocmVzWzFdID09PSAnYWZ0ZXInKSB7XG4gICAgICAgIGlmICghYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0pIHtcbiAgICAgICAgICBhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSA9IFtdO1xuICAgICAgICAgIGJlZm9yZU9yQWZ0ZXIuc2V0KHRhcmdldFBhY2thZ2VOYW1lLCBbcGsubG9uZ05hbWUsIHByaW9yaXR5UHJvcGVydHkhXSk7IC8vIHRyYWNrIHRhcmdldCBwYWNrYWdlXG4gICAgICAgIH1cbiAgICAgICAgYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0ucHVzaChwayk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBrLmpzb24gPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHBrLmpzb24pKTtcbiAgICAgIF8uc2V0KHBrLCBwcmlvcml0eVByb3BlcnR5ISArICcnLCA1MDAwKTtcbiAgICAgIG51bWJlclR5cGVQcmlvLnB1c2gocGspO1xuICAgIH1cbiAgfSk7XG4gIG51bWJlclR5cGVQcmlvLnNvcnQoZnVuY3Rpb24ocGsxLCBwazIpIHtcbiAgICByZXR1cm4gXy5nZXQocGsyLCBwcmlvcml0eVByb3BlcnR5ISkgLSBfLmdldChwazEsIHByaW9yaXR5UHJvcGVydHkhKTtcbiAgfSk7XG5cbiAgLy8gY29uc29sZS5sb2cobnVtYmVyVHlwZVByaW8ubWFwKHAgPT4gcC5sb25nTmFtZSArICcgJyArIF8uZ2V0KHAsIHByaW9yaXR5UHJvcGVydHkhKSkpO1xuXG4gIGNvbnN0IHBrTmFtZXMgPSBwYWNrYWdlcy5tYXAocCA9PiBwLmxvbmdOYW1lKTtcblxuICBjb25zdCBub3RGb3VuZCA9IF8uZGlmZmVyZW5jZShBcnJheS5mcm9tKGJlZm9yZU9yQWZ0ZXIua2V5cygpKSwgcGtOYW1lcylcbiAgLm1hcChuYW1lID0+IG5hbWUgKyBgIGJ5ICR7YmVmb3JlT3JBZnRlci5nZXQobmFtZSkhLmpvaW4oJ1xcJ3MgJyl9YCk7XG4gIGlmIChub3RGb3VuZC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZXJyID0gJ1ByaW9yaXR5IGRlcGVuZGVkIHBhY2thZ2VzIGFyZSBub3QgZm91bmQ6ICcgKyAgbm90Rm91bmQgK1xuICAgICAgJ1xcblRvdGFsIHBhY2thZ2VzIGF2YWlsYWJsZTpcXG4nICsgcGtOYW1lcy5qb2luKCdcXG4nKTtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGVycikpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcnVuUGFja2FnZXNTeW5jKHBhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VbXSkge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXMpIHtcbiAgICAgIGF3YWl0IHJ1blBhY2thZ2UocGspO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1blBhY2thZ2VzQXN5bmMocGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZVtdKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHBhY2thZ2VzLm1hcChydW5QYWNrYWdlKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlKHBrOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICBhd2FpdCBiZWZvcmVIYW5kbGVyc0Zvcihway5sb25nTmFtZSk7XG4gICAgbG9nLmRlYnVnKHBrLmxvbmdOYW1lLCAnIHN0YXJ0cyB3aXRoIHByaW9yaXR5OiAnLCBfLmdldChwaywgcHJpb3JpdHlQcm9wZXJ0eSEpKTtcbiAgICBjb25zdCBhbnlSZXMgPSBydW4ocGspO1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShhbnlSZXMpO1xuICAgIGxvZy5kZWJ1Zyhway5sb25nTmFtZSwgJyBlbmRzJyk7XG4gICAgYXdhaXQgYWZ0ZXJIYW5kbGVyc0Zvcihway5sb25nTmFtZSk7XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVIYW5kbGVyc0ZvcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcnVuUGFja2FnZXNBc3luYyhiZWZvcmVQYWNrYWdlc1tuYW1lXSA/IGJlZm9yZVBhY2thZ2VzW25hbWVdIDogW10pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWZ0ZXJIYW5kbGVyc0ZvcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcnVuUGFja2FnZXNBc3luYyhhZnRlclBhY2thZ2VzW25hbWVdID8gYWZ0ZXJQYWNrYWdlc1tuYW1lXSA6IFtdKTtcbiAgfVxuXG4gIHJldHVybiBydW5QYWNrYWdlc1N5bmMobnVtYmVyVHlwZVByaW8pO1xufVxuIl19