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
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabeCliExtension = exports.getStore = exports.getState = exports.cliActionDispatcher = exports.cliSlice = void 0;
const rxjs_1 = require("rxjs");
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
const op = __importStar(require("rxjs/operators"));
const pkgMgr = __importStar(require("../package-mgr"));
const store_1 = require("../store");
const initialState = {
    commandByPackage: new Map(),
    commandInfoByName: new Map(),
    version: ''
    // loadedExtensionCmds: new Map()
};
exports.cliSlice = store_1.stateFactory.newSlice({
    name: 'cli',
    initialState,
    reducers: {
        plinkUpgraded(d, { payload: newVersion }) {
            d.version = newVersion;
        },
        updateLocale(d, { payload: [lang, country] }) {
            d.osLang = lang;
            d.osCountry = country;
        },
        addCommandMeta(d, { payload: { pkg, metas } }) {
            const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.name)[1]);
            // const existingMetas = d.commandByPackage.get(pkg);
            d.commandByPackage.set(pkg, names);
            // if (existingMetas) {
            //   existingMetas.push(...names);
            // } else {
            //   d.commandByPackage.set(pkg, names);
            // }
            for (let i = 0, l = names.length; i < l; i++) {
                d.commandInfoByName.set(names[i], metas[i]);
            }
        }
    }
});
exports.cliActionDispatcher = store_1.stateFactory.bindActionCreators(exports.cliSlice);
function getState() {
    return store_1.stateFactory.sliceState(exports.cliSlice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.cliSlice);
}
exports.getStore = getStore;
const getLocale = require('os-locale');
const drcpPkJson = require('../../../package.json');
store_1.stateFactory.addEpic((action$, state$) => {
    return rxjs_1.merge(getStore().pipe(op.map(s => s.version), op.distinctUntilChanged(), op.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), rxjs_1.from(getLocale()).pipe(op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
            exports.cliActionDispatcher.updateLocale([lang, country]);
            pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
    })), action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'), op.tap(() => exports.cliActionDispatcher._change(s => {
        s.commandByPackage.clear();
        s.commandInfoByName.clear();
    })))).pipe(op.catchError(ex => {
        // tslint:disable-next-line: no-console
        console.error(ex);
        return rxjs_1.of();
    }), op.ignoreElements());
});
function availabeCliExtension() {
}
exports.availabeCliExtension = availabeCliExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQXVDO0FBQ3ZDLHFGQUFxRjtBQUNyRixtREFBcUM7QUFDckMsdURBQXlDO0FBQ3pDLG9DQUF3QztBQW1CeEMsTUFBTSxZQUFZLEdBQWE7SUFDN0IsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDM0IsaUJBQWlCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDNUIsT0FBTyxFQUFFLEVBQUU7SUFDWCxpQ0FBaUM7Q0FDbEMsQ0FBQztBQUVXLFFBQUEsUUFBUSxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQzVDLElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUF3QjtZQUMzRCxDQUFDLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUN6QixDQUFDO1FBQ0QsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBa0M7WUFDekUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDeEIsQ0FBQztRQUNELGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLEVBQTREO1lBQ2xHLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLHFEQUFxRDtZQUNyRCxDQUFDLENBQUMsZ0JB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LENBQUMsRUFBRTtRQUNqQix1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLFNBQUUsRUFBaUIsQ0FBQztJQUM3QixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2YgfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGNsaVNsaWNlLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge091ckNvbW1hbmRNZXRhZGF0YX0gZnJvbSAnLi90eXBlcyc7XG5leHBvcnQgaW50ZXJmYWNlIENsaVN0YXRlIHtcbiAgLyoqIGtleSBpcyBwYWNrYWdlIG5hbWUsIHZhbHVlIGlzIENvbW1hbmQgbmFtZSBhbmQgYXJncyAqL1xuICBjb21tYW5kQnlQYWNrYWdlOiBNYXA8c3RyaW5nLCBPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWUnXVtdPjtcbiAgY29tbWFuZEluZm9CeU5hbWU6IE1hcDxPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWUnXSwgT3VyQ29tbWFuZE1ldGFkYXRhPjtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBvc0xhbmc/OiBzdHJpbmc7XG4gIG9zQ291bnRyeT86IHN0cmluZztcbiAgLyoqIGtleTogY29tbWFuZCBuYW1lLCB2YWx1ZTogZmlsZSBwYXRoICovXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IE1hcDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpRXh0ZW5zaW9uIHtcbiAgcGtOYW1lOiBzdHJpbmc7XG4gIHBrZ0ZpbGVQYXRoOiBzdHJpbmc7XG4gIGZ1bmNOYW1lPzogc3RyaW5nO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENsaVN0YXRlID0ge1xuICBjb21tYW5kQnlQYWNrYWdlOiBuZXcgTWFwKCksXG4gIGNvbW1hbmRJbmZvQnlOYW1lOiBuZXcgTWFwKCksXG4gIHZlcnNpb246ICcnXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IG5ldyBNYXAoKVxufTtcblxuZXhwb3J0IGNvbnN0IGNsaVNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NsaScsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBwbGlua1VwZ3JhZGVkKGQsIHtwYXlsb2FkOiBuZXdWZXJzaW9ufTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7XG4gICAgICBkLnZlcnNpb24gPSBuZXdWZXJzaW9uO1xuICAgIH0sXG4gICAgdXBkYXRlTG9jYWxlKGQsIHtwYXlsb2FkOiBbbGFuZywgY291bnRyeV19OiBQYXlsb2FkQWN0aW9uPFtzdHJpbmcsIHN0cmluZ10+KSB7XG4gICAgICBkLm9zTGFuZyA9IGxhbmc7XG4gICAgICBkLm9zQ291bnRyeSA9IGNvdW50cnk7XG4gICAgfSxcbiAgICBhZGRDb21tYW5kTWV0YShkLCB7cGF5bG9hZDoge3BrZywgbWV0YXN9fTogUGF5bG9hZEFjdGlvbjx7cGtnOiBzdHJpbmc7IG1ldGFzOiBPdXJDb21tYW5kTWV0YWRhdGFbXX0+KSB7XG4gICAgICBjb25zdCBuYW1lcyA9IG1ldGFzLm1hcChtZXRhID0+IC9eXFxzKj8oXFxTKykvLmV4ZWMobWV0YS5uYW1lKSFbMV0pO1xuICAgICAgLy8gY29uc3QgZXhpc3RpbmdNZXRhcyA9IGQuY29tbWFuZEJ5UGFja2FnZS5nZXQocGtnKTtcbiAgICAgIGQuY29tbWFuZEJ5UGFja2FnZS5zZXQocGtnLCBuYW1lcyk7XG4gICAgICAvLyBpZiAoZXhpc3RpbmdNZXRhcykge1xuICAgICAgLy8gICBleGlzdGluZ01ldGFzLnB1c2goLi4ubmFtZXMpO1xuICAgICAgLy8gfSBlbHNlIHtcbiAgICAgIC8vICAgZC5jb21tYW5kQnlQYWNrYWdlLnNldChwa2csIG5hbWVzKTtcbiAgICAgIC8vIH1cbiAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIGQuY29tbWFuZEluZm9CeU5hbWUuc2V0KG5hbWVzW2ldLCBtZXRhc1tpXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGNsaUFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNsaVNsaWNlKTtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNsaVNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY2xpU2xpY2UpO1xufVxuXG5jb25zdCBnZXRMb2NhbGU6ICgpID0+IFByb21pc2U8c3RyaW5nPiA9IHJlcXVpcmUoJ29zLWxvY2FsZScpO1xuY29uc3QgZHJjcFBrSnNvbiA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpO1xuXG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcblxuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG9wLm1hcChzID0+IHMudmVyc2lvbiksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5tYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdxdWljayEhISEhISEhISEnLCBnZXRTdGF0ZSgpKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT09IGRyY3BQa0pzb24udmVyc2lvbikge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIucGxpbmtVcGdyYWRlZChkcmNwUGtKc29uLnZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgZnJvbShnZXRMb2NhbGUoKSkucGlwZShcbiAgICAgIG9wLm1hcChsb2NhbGUgPT4ge1xuICAgICAgICBjb25zdCBbbGFuZywgY291bnRyeV0gPSBsb2NhbGUuc3BsaXQoL1tfLV0vKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkub3NMYW5nICE9PSBsYW5nIHx8IGdldFN0YXRlKCkub3NDb3VudHJ5ICE9PSBjb3VudHJ5KSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVMb2NhbGUoW2xhbmcsIGNvdW50cnldKTtcbiAgICAgICAgICBwa2dNZ3IuYWN0aW9uRGlzcGF0Y2hlci5zZXRJbkNoaW5hKGNvdW50cnkgPyBjb3VudHJ5LnRvVXBwZXJDYXNlKCkgPT09ICdDTicgOiBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ0JFRk9SRV9TQVZFX1NUQVRFJyksXG4gICAgICBvcC50YXAoKCkgPT4gY2xpQWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICBzLmNvbW1hbmRCeVBhY2thZ2UuY2xlYXIoKTtcbiAgICAgICAgcy5jb21tYW5kSW5mb0J5TmFtZS5jbGVhcigpO1xuICAgICAgfSkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcihleCA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIG9mPFBheWxvYWRBY3Rpb24+KCk7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19