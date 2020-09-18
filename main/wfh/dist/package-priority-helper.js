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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMENBQTRCO0FBRzVCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUVqRSxNQUFNLGNBQWMsR0FBRyx3QkFBd0IsQ0FBQztBQUdoRCxpQ0FBaUM7QUFDakMsU0FBZ0IsYUFBYSxDQUFDLFFBQTJCLEVBQUUsR0FBMEMsRUFBRSxnQkFBeUI7SUFDOUgsTUFBTSxjQUFjLEdBQXNCLEVBQUUsQ0FBQztJQUM3QyxNQUFNLGNBQWMsR0FBdUMsRUFBRSxDQUFDO0lBQzlELE1BQU0sYUFBYSxHQUF1QyxFQUFFLENBQUM7SUFDN0QsSUFBSSxnQkFBZ0IsSUFBSSxJQUFJO1FBQzFCLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztJQUVoQyxNQUFNLGFBQWEsR0FBMEIsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN2RCxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ3BCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLGdCQUFpQixDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3hCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDekI7YUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNSLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NB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bXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGFja2FnZU5vZGVJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9idWlsZC11dGlsL3RzL3BhY2thZ2UtaW5zdGFuY2UnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwYWNrYWdlUHJpb3JpdHlIZWxwZXInKTtcblxuY29uc3QgcHJpb3JpdHlTdHJSZWcgPSAvKGJlZm9yZXxhZnRlcilcXHMrKFxcUyspLztcbmV4cG9ydCB0eXBlIFBhY2thZ2VJbnN0YW5jZSA9IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCBQYWNrYWdlTm9kZUluc3RhbmNlO1xuXG4vLyB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGhcbmV4cG9ydCBmdW5jdGlvbiBvcmRlclBhY2thZ2VzKHBhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VbXSwgcnVuOiAoLi4uYXJnOiBhbnlbXSkgPT4gUHJvbWlzZTxhbnk+IHwgYW55LCBwcmlvcml0eVByb3BlcnR5Pzogc3RyaW5nKSB7XG4gIGNvbnN0IG51bWJlclR5cGVQcmlvOiBQYWNrYWdlSW5zdGFuY2VbXSA9IFtdO1xuICBjb25zdCBiZWZvcmVQYWNrYWdlczoge1trZXk6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZVtdfSA9IHt9O1xuICBjb25zdCBhZnRlclBhY2thZ2VzOiB7W2tleTogc3RyaW5nXTogUGFja2FnZUluc3RhbmNlW119ID0ge307XG4gIGlmIChwcmlvcml0eVByb3BlcnR5ID09IG51bGwpXG4gICAgcHJpb3JpdHlQcm9wZXJ0eSA9ICdwcmlvcml0eSc7XG5cbiAgY29uc3QgYmVmb3JlT3JBZnRlcjogTWFwPHN0cmluZywgc3RyaW5nW10+ID0gbmV3IE1hcCgpO1xuICBwYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcbiAgICBjb25zdCBwcmlvcml0eSA9IF8uZ2V0KHBrLCBwcmlvcml0eVByb3BlcnR5ISk7XG4gICAgaWYgKF8uaXNOdW1iZXIocHJpb3JpdHkpKSB7XG4gICAgICBudW1iZXJUeXBlUHJpby5wdXNoKHBrKTtcbiAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcocHJpb3JpdHkpKSB7XG4gICAgICBjb25zdCByZXMgPSBwcmlvcml0eVN0clJlZy5leGVjKHByaW9yaXR5KTtcbiAgICAgIGlmICghcmVzKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBmb3JtYXQgb2YgcGFja2FnZS5qc29uIC0gcHJpb3JpdHkgaW4gJyArXG4gICAgICAgICAgcGsubG9uZ05hbWUgKyAnOiAnICsgcHJpb3JpdHkpO1xuICAgICAgfVxuICAgICAgY29uc3QgdGFyZ2V0UGFja2FnZU5hbWUgPSByZXNbMl07XG4gICAgICBpZiAocmVzWzFdID09PSAnYmVmb3JlJykge1xuICAgICAgICBpZiAoIWJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSkge1xuICAgICAgICAgIGJlZm9yZVBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSA9IFtdO1xuICAgICAgICAgIGJlZm9yZU9yQWZ0ZXIuc2V0KHRhcmdldFBhY2thZ2VOYW1lLCBbcGsubG9uZ05hbWUsIHByaW9yaXR5UHJvcGVydHkhXSk7IC8vIHRyYWNrIHRhcmdldCBwYWNrYWdlXG4gICAgICAgIH1cbiAgICAgICAgYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdLnB1c2gocGspO1xuICAgICAgfSBlbHNlIGlmIChyZXNbMV0gPT09ICdhZnRlcicpIHtcbiAgICAgICAgaWYgKCFhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXSkge1xuICAgICAgICAgIGFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdID0gW107XG4gICAgICAgICAgYmVmb3JlT3JBZnRlci5zZXQodGFyZ2V0UGFja2FnZU5hbWUsIFtway5sb25nTmFtZSwgcHJpb3JpdHlQcm9wZXJ0eSFdKTsgLy8gdHJhY2sgdGFyZ2V0IHBhY2thZ2VcbiAgICAgICAgfVxuICAgICAgICBhZnRlclBhY2thZ2VzW3RhcmdldFBhY2thZ2VOYW1lXS5wdXNoKHBrKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGsuanNvbiA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGsuanNvbikpO1xuICAgICAgXy5zZXQocGssIHByaW9yaXR5UHJvcGVydHkhICsgJycsIDUwMDApO1xuICAgICAgbnVtYmVyVHlwZVByaW8ucHVzaChwayk7XG4gICAgfVxuICB9KTtcbiAgbnVtYmVyVHlwZVByaW8uc29ydChmdW5jdGlvbihwazEsIHBrMikge1xuICAgIHJldHVybiBfLmdldChwazIsIHByaW9yaXR5UHJvcGVydHkhKSAtIF8uZ2V0KHBrMSwgcHJpb3JpdHlQcm9wZXJ0eSEpO1xuICB9KTtcblxuICAvLyBjb25zb2xlLmxvZyhudW1iZXJUeXBlUHJpby5tYXAocCA9PiBwLmxvbmdOYW1lICsgJyAnICsgXy5nZXQocCwgcHJpb3JpdHlQcm9wZXJ0eSEpKSk7XG5cbiAgY29uc3QgcGtOYW1lcyA9IHBhY2thZ2VzLm1hcChwID0+IHAubG9uZ05hbWUpO1xuXG4gIGNvbnN0IG5vdEZvdW5kID0gXy5kaWZmZXJlbmNlKEFycmF5LmZyb20oYmVmb3JlT3JBZnRlci5rZXlzKCkpLCBwa05hbWVzKVxuICAubWFwKG5hbWUgPT4gbmFtZSArIGAgYnkgJHtiZWZvcmVPckFmdGVyLmdldChuYW1lKSEuam9pbignXFwncyAnKX1gKTtcbiAgaWYgKG5vdEZvdW5kLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBlcnIgPSAnUHJpb3JpdHkgZGVwZW5kZWQgcGFja2FnZXMgYXJlIG5vdCBmb3VuZDogJyArICBub3RGb3VuZCArXG4gICAgICAnXFxuVG90YWwgcGFja2FnZXMgYXZhaWxhYmxlOlxcbicgKyBwa05hbWVzLmpvaW4oJ1xcbicpO1xuICAgIGxvZy5lcnJvcihlcnIpO1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoZXJyKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlc1N5bmMocGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZVtdKSB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlcykge1xuICAgICAgYXdhaXQgcnVuUGFja2FnZShwayk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcnVuUGFja2FnZXNBc3luYyhwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10pIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwocGFja2FnZXMubWFwKHJ1blBhY2thZ2UpKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2UocGs6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIGF3YWl0IGJlZm9yZUhhbmRsZXJzRm9yKHBrLmxvbmdOYW1lKTtcbiAgICBsb2cuZGVidWcocGsubG9uZ05hbWUsICcgc3RhcnRzIHdpdGggcHJpb3JpdHk6ICcsIF8uZ2V0KHBrLCBwcmlvcml0eVByb3BlcnR5ISkpO1xuICAgIGNvbnN0IGFueVJlcyA9IHJ1bihwayk7XG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGFueVJlcyk7XG4gICAgbG9nLmRlYnVnKHBrLmxvbmdOYW1lLCAnIGVuZHMnKTtcbiAgICBhd2FpdCBhZnRlckhhbmRsZXJzRm9yKHBrLmxvbmdOYW1lKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGJlZm9yZUhhbmRsZXJzRm9yKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBydW5QYWNrYWdlc0FzeW5jKGJlZm9yZVBhY2thZ2VzW25hbWVdID8gYmVmb3JlUGFja2FnZXNbbmFtZV0gOiBbXSk7XG4gIH1cblxuICBmdW5jdGlvbiBhZnRlckhhbmRsZXJzRm9yKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBydW5QYWNrYWdlc0FzeW5jKGFmdGVyUGFja2FnZXNbbmFtZV0gPyBhZnRlclBhY2thZ2VzW25hbWVdIDogW10pO1xuICB9XG5cbiAgcmV0dXJuIHJ1blBhY2thZ2VzU3luYyhudW1iZXJUeXBlUHJpbyk7XG59XG4iXX0=