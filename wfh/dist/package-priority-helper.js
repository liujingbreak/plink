"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1wcmlvcml0eS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXByaW9yaXR5LWhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUc1QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFakUsTUFBTSxjQUFjLEdBQUcsd0JBQXdCLENBQUM7QUFHaEQsaUNBQWlDO0FBQ2pDLFNBQWdCLGFBQWEsQ0FBQyxRQUEyQixFQUFFLEdBQW9DLEVBQUUsZ0JBQXlCO0lBQ3hILE1BQU0sY0FBYyxHQUFzQixFQUFFLENBQUM7SUFDN0MsTUFBTSxjQUFjLEdBQXVDLEVBQUUsQ0FBQztJQUM5RCxNQUFNLGFBQWEsR0FBdUMsRUFBRSxDQUFDO0lBQzdELElBQUksZ0JBQWdCLElBQUksSUFBSTtRQUMxQixnQkFBZ0IsR0FBRyxVQUFVLENBQUM7SUFFaEMsTUFBTSxhQUFhLEdBQTBCLElBQUksR0FBRyxFQUFFLENBQUM7SUFDdkQsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNwQixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxnQkFBaUIsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3pCO2FBQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDUixNQUFNLElBQUksS0FBSyxDQUFDLCtDQUErQztvQkFDN0QsRUFB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QWUsVUFBVSxDQUFDLEVBQW1COztZQUMzQyxNQUFNLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNyQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsZ0JBQWlCLENBQUMsQ0FBQyxDQUFDO1lBQ2hGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2QixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sZ0JBQWdCLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7S0FBQTtJQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBWTtRQUNyQyxPQUFPLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZO1FBQ3BDLE9BQU8sZ0JBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFFLENBQUM7SUFFRCxPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN6QyxDQUFDO0FBakZELHNDQWlGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYWNrYWdlTm9kZUluc3RhbmNlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICcuL2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3BhY2thZ2VQcmlvcml0eUhlbHBlcicpO1xuXG5jb25zdCBwcmlvcml0eVN0clJlZyA9IC8oYmVmb3JlfGFmdGVyKVxccysoXFxTKykvO1xuZXhwb3J0IHR5cGUgUGFja2FnZUluc3RhbmNlID0gUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IFBhY2thZ2VOb2RlSW5zdGFuY2U7XG5cbi8vIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aFxuZXhwb3J0IGZ1bmN0aW9uIG9yZGVyUGFja2FnZXMocGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZVtdLCBydW46ICguLi5hcmc6IGFueVtdKSA9PiBQcm9taXNlPGFueT4sIHByaW9yaXR5UHJvcGVydHk/OiBzdHJpbmcpIHtcbiAgY29uc3QgbnVtYmVyVHlwZVByaW86IFBhY2thZ2VJbnN0YW5jZVtdID0gW107XG4gIGNvbnN0IGJlZm9yZVBhY2thZ2VzOiB7W2tleTogc3RyaW5nXTogUGFja2FnZUluc3RhbmNlW119ID0ge307XG4gIGNvbnN0IGFmdGVyUGFja2FnZXM6IHtba2V5OiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2VbXX0gPSB7fTtcbiAgaWYgKHByaW9yaXR5UHJvcGVydHkgPT0gbnVsbClcbiAgICBwcmlvcml0eVByb3BlcnR5ID0gJ3ByaW9yaXR5JztcblxuICBjb25zdCBiZWZvcmVPckFmdGVyOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT4gPSBuZXcgTWFwKCk7XG4gIHBhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuICAgIGNvbnN0IHByaW9yaXR5ID0gXy5nZXQocGssIHByaW9yaXR5UHJvcGVydHkhKTtcbiAgICBpZiAoXy5pc051bWJlcihwcmlvcml0eSkpIHtcbiAgICAgIG51bWJlclR5cGVQcmlvLnB1c2gocGspO1xuICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhwcmlvcml0eSkpIHtcbiAgICAgIGNvbnN0IHJlcyA9IHByaW9yaXR5U3RyUmVnLmV4ZWMocHJpb3JpdHkpO1xuICAgICAgaWYgKCFyZXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZvcm1hdCBvZiBwYWNrYWdlLmpzb24gLSBwcmlvcml0eSBpbiAnICtcbiAgICAgICAgICBway5sb25nTmFtZSArICc6ICcgKyBwcmlvcml0eSk7XG4gICAgICB9XG4gICAgICBjb25zdCB0YXJnZXRQYWNrYWdlTmFtZSA9IHJlc1syXTtcbiAgICAgIGlmIChyZXNbMV0gPT09ICdiZWZvcmUnKSB7XG4gICAgICAgIGlmICghYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdKSB7XG4gICAgICAgICAgYmVmb3JlUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdID0gW107XG4gICAgICAgICAgYmVmb3JlT3JBZnRlci5zZXQodGFyZ2V0UGFja2FnZU5hbWUsIFtway5sb25nTmFtZSwgcHJpb3JpdHlQcm9wZXJ0eSFdKTsgLy8gdHJhY2sgdGFyZ2V0IHBhY2thZ2VcbiAgICAgICAgfVxuICAgICAgICBiZWZvcmVQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0ucHVzaChwayk7XG4gICAgICB9IGVsc2UgaWYgKHJlc1sxXSA9PT0gJ2FmdGVyJykge1xuICAgICAgICBpZiAoIWFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdKSB7XG4gICAgICAgICAgYWZ0ZXJQYWNrYWdlc1t0YXJnZXRQYWNrYWdlTmFtZV0gPSBbXTtcbiAgICAgICAgICBiZWZvcmVPckFmdGVyLnNldCh0YXJnZXRQYWNrYWdlTmFtZSwgW3BrLmxvbmdOYW1lLCBwcmlvcml0eVByb3BlcnR5IV0pOyAvLyB0cmFjayB0YXJnZXQgcGFja2FnZVxuICAgICAgICB9XG4gICAgICAgIGFmdGVyUGFja2FnZXNbdGFyZ2V0UGFja2FnZU5hbWVdLnB1c2gocGspO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBfLnNldChwaywgcHJpb3JpdHlQcm9wZXJ0eSEsIDUwMDApO1xuICAgICAgbnVtYmVyVHlwZVByaW8ucHVzaChwayk7XG4gICAgfVxuICB9KTtcblxuICBudW1iZXJUeXBlUHJpby5zb3J0KGZ1bmN0aW9uKHBrMSwgcGsyKSB7XG4gICAgcmV0dXJuIF8uZ2V0KHBrMiwgcHJpb3JpdHlQcm9wZXJ0eSEpIC0gXy5nZXQocGsxLCBwcmlvcml0eVByb3BlcnR5ISk7XG4gIH0pO1xuXG4gIGNvbnN0IHBrTmFtZXMgPSBwYWNrYWdlcy5tYXAocCA9PiBwLmxvbmdOYW1lKTtcblxuICBjb25zdCBub3RGb3VuZCA9IF8uZGlmZmVyZW5jZShBcnJheS5mcm9tKGJlZm9yZU9yQWZ0ZXIua2V5cygpKSwgcGtOYW1lcylcbiAgLm1hcChuYW1lID0+IG5hbWUgKyBgIGJ5ICR7YmVmb3JlT3JBZnRlci5nZXQobmFtZSkhLmpvaW4oJ1xcJ3MgJyl9YCk7XG4gIGlmIChub3RGb3VuZC5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZXJyID0gJ1ByaW9yaXR5IGRlcGVuZGVkIHBhY2thZ2VzIGFyZSBub3QgZm91bmQ6ICcgKyAgbm90Rm91bmQgK1xuICAgICAgJ1xcblRvdGFsIHBhY2thZ2VzIGF2YWlsYWJsZTpcXG4nICsgcGtOYW1lcy5qb2luKCdcXG4nKTtcbiAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKGVycikpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gcnVuUGFja2FnZXNTeW5jKHBhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VbXSkge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXMpIHtcbiAgICAgIGF3YWl0IHJ1blBhY2thZ2UocGspO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHJ1blBhY2thZ2VzQXN5bmMocGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZVtdKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHBhY2thZ2VzLm1hcChydW5QYWNrYWdlKSk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlKHBrOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICBhd2FpdCBiZWZvcmVIYW5kbGVyc0Zvcihway5sb25nTmFtZSk7XG4gICAgbG9nLmRlYnVnKHBrLmxvbmdOYW1lLCAnIHN0YXJ0cyB3aXRoIHByaW9yaXR5OiAnLCBfLmdldChwaywgcHJpb3JpdHlQcm9wZXJ0eSEpKTtcbiAgICBjb25zdCBhbnlSZXMgPSBydW4ocGspO1xuICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShhbnlSZXMpO1xuICAgIGxvZy5kZWJ1Zyhway5sb25nTmFtZSwgJyBlbmRzJyk7XG4gICAgYXdhaXQgYWZ0ZXJIYW5kbGVyc0Zvcihway5sb25nTmFtZSk7XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVIYW5kbGVyc0ZvcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcnVuUGFja2FnZXNBc3luYyhiZWZvcmVQYWNrYWdlc1tuYW1lXSA/IGJlZm9yZVBhY2thZ2VzW25hbWVdIDogW10pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWZ0ZXJIYW5kbGVyc0ZvcihuYW1lOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gcnVuUGFja2FnZXNBc3luYyhhZnRlclBhY2thZ2VzW25hbWVdID8gYWZ0ZXJQYWNrYWdlc1tuYW1lXSA6IFtdKTtcbiAgfVxuXG4gIHJldHVybiBydW5QYWNrYWdlc1N5bmMobnVtYmVyVHlwZVByaW8pO1xufVxuIl19