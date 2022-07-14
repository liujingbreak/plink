"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ofPayloadAction = exports.stateFactory = void 0;
/* eslint-disable no-console */
const redux_toolkit_observable_1 = require("./redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const immer_1 = require("immer");
const operators_1 = require("rxjs/operators");
(0, immer_1.enableES5)();
(0, immer_1.enableMapSet)();
exports.stateFactory = module.hot && module.hot.data && module.hot.data.stateFactory ? module.hot.data.stateFactory :
    new redux_toolkit_observable_1.StateFactory({});
let sub;
if (process.env.NODE_ENV === 'development' || (process.env.REACT_APP_env && process.env.REACT_APP_env !== 'prod')) {
    sub = exports.stateFactory.log$.pipe((0, operators_1.tap)(params => {
        if (params[0] === 'state')
            console.log('%c redux:state ', 'font-weight: bold; color: black; background: #44c2fd;', ...params.slice(1));
        else if (params[0] === 'action')
            console.log('%c redux:action ', 'font-weight: bold; color: white; background: #8c61ff;', ...params.slice(1));
        else
            console.log(...params);
    })).subscribe();
}
if (module.hot) {
    module.hot.dispose(data => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        data.stateFactory = exports.stateFactory;
        sub.unsubscribe();
    });
}
//# sourceMappingURL=state-factory-browser.js.map