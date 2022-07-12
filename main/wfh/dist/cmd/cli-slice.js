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
exports.availabeCliExtension = exports.getStore = exports.getState = exports.cliActionDispatcher = exports.cliSlice = void 0;
const rxjs_1 = require("rxjs");
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
const op = __importStar(require("rxjs/operators"));
const helper_1 = require("../../../packages/redux-toolkit-observable/dist/helper");
const pkgMgr = __importStar(require("../package-mgr"));
const store_1 = require("../store");
const initialState = {
    commandByPackage: new Map(),
    commandInfoByName: new Map(),
    version: ''
    // loadedExtensionCmds: new Map()
};
const simpleReduces = {
    plinkUpgraded(d, newVersion) {
        d.version = newVersion;
    },
    updateLocale(d, [lang, country]) {
        d.osLang = lang;
        d.osCountry = country;
    },
    addCommandMeta(d, { pkg, metas }) {
        const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.name)[1]);
        d.commandByPackage.set(pkg, names);
        for (let i = 0, l = names.length; i < l; i++) {
            d.commandInfoByName.set(names[i], metas[i]);
        }
    }
};
exports.cliSlice = store_1.stateFactory.newSlice({
    name: 'cli',
    initialState,
    reducers: (0, helper_1.createReducers)(simpleReduces)
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
    // const actionStreams = castByActionType(cliSlice.actions, action$);
    return (0, rxjs_1.merge)(getStore().pipe(op.map(s => s.version), op.distinctUntilChanged(), op.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), (0, rxjs_1.from)(getLocale()).pipe(op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
            exports.cliActionDispatcher.updateLocale([lang, country]);
            pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
    })), store_1.processExitAction$.pipe(op.tap(() => exports.cliActionDispatcher._change(s => {
        s.commandByPackage.clear();
        s.commandInfoByName.clear();
    })))).pipe(op.catchError(ex => {
        // eslint-disable-next-line no-console
        console.error(ex);
        return (0, rxjs_1.of)();
    }), op.ignoreElements());
});
function availabeCliExtension() {
}
exports.availabeCliExtension = availabeCliExtension;
//# sourceMappingURL=cli-slice.js.map