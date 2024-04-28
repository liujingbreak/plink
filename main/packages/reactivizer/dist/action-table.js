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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ActionTable_latestPayloadsByName$;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDataTable = exports.ActionTable = void 0;
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const control_1 = require("./control");
const EMPTY_ARRY = [];
class ActionTable {
    get dataChange$() {
        if (__classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f"))
            return __classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f");
        __classPrivateFieldSet(this, _ActionTable_latestPayloadsByName$, this.actionNamesAdded$.pipe(rx.switchMap(() => rx.merge(...this.actionNames.map(actionName => this.l[actionName]))), rx.map(() => {
            this.data = {};
            for (const k of this.actionNames) {
                const v = this.actionSnapshot.get(k);
                const old = this.data[k];
                if (old === EMPTY_ARRY || old == null)
                    this.data[k] = v ? v.slice(1) : EMPTY_ARRY;
                else {
                    if (v) {
                        old.splice(0);
                        for (let i = 1, l = v.length; i < l; i++)
                            old.push(v[i]);
                    }
                    else
                        this.data[k] = EMPTY_ARRY;
                }
            }
            return this.data;
        }), rx.share()), "f");
        return __classPrivateFieldGet(this, _ActionTable_latestPayloadsByName$, "f");
    }
    constructor(streamCtl, actionNames) {
        this.streamCtl = streamCtl;
        this.latestPayloads = {};
        this.data = {};
        this.actionSnapshot = new Map();
        // private
        _ActionTable_latestPayloadsByName$.set(this, void 0);
        // #latestPayloadsSnapshot$: rx.Observable<Map<keyof I, InferMapParam<I, keyof I>>> | undefined;
        this.actionNamesAdded$ = new rx.ReplaySubject(1);
        this.actionNames = [];
        this.l = this.latestPayloads;
        this.addActions(...actionNames);
        this.actionNamesAdded$.pipe(rx.map(actionNames => {
            this.onAddActions(actionNames);
        })).subscribe();
        this.dataChange$.subscribe(); // to make sure this.data will be fulfilled even when there is no any external observer
    }
    getData() {
        return this.data;
    }
    /** Add actions to be recoreded in table map,
     * by creating `ReplaySubject(1)` for each action payload stream respectively
     */
    addActions(...actionNames) {
        this.actionNames = this.actionNames.concat(actionNames);
        this.actionNamesAdded$.next(actionNames);
        return this;
    }
    onAddActions(actionNames) {
        var _a;
        for (const type of actionNames) {
            if (this.data[type] == null)
                this.data[type] = EMPTY_ARRY;
            if (stream_core_1.has.call(this.latestPayloads, type))
                continue;
            const a$ = new rx.ReplaySubject(1);
            this.streamCtl.at[type].pipe(rx.map(a => {
                const arr = this.actionSnapshot.get(type);
                if (arr == null) {
                    const mapParam = [{ i: a.i, r: a.r }, ...a.p];
                    this.actionSnapshot.set(type, mapParam);
                    return mapParam;
                }
                else {
                    arr[0] = { i: a.i, r: a.r };
                    arr.splice(1, arr.length - 1, ...a.p); // reuse old array
                    return arr;
                }
            })).subscribe(a$);
            this.latestPayloads[type] = ((_a = this.streamCtl.opts) === null || _a === void 0 ? void 0 : _a.debugTableAction) ?
                a$.pipe(this.debugLogLatestActionOperator(type)) :
                a$.asObservable();
        }
    }
    getLatestActionOf(actionName) {
        return this.actionSnapshot.get(actionName);
    }
    debugLogLatestActionOperator(type) {
        var _a, _b;
        const core = (_a = this.streamCtl.core) !== null && _a !== void 0 ? _a : this.streamCtl;
        return ((_b = this.streamCtl.opts) === null || _b === void 0 ? void 0 : _b.log) ?
            rx.map((action, idx) => {
                if (idx === 0 && !core.debugExcludeSet.has(type)) {
                    this.streamCtl.opts.log(core.logPrefix + 'rx:latest', type, (0, stream_core_1.actionMetaToStr)(action[0]));
                }
                return action;
            }) :
            (typeof window !== 'undefined') || (typeof Worker !== 'undefined') ?
                rx.map((p, idx) => {
                    if (idx === 0 && !core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(`%c ${core.logPrefix}rx:latest `, 'color: #f0fe0fe0; background: #8c61dd;', type, (0, stream_core_1.actionMetaToStr)(p[0]));
                    }
                    return p;
                }) :
                rx.map((p, idx) => {
                    if (idx > 0 && !core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(core.logPrefix + 'latest:', type, (0, stream_core_1.actionMetaToStr)(p[0]));
                    }
                    return p;
                });
    }
}
exports.ActionTable = ActionTable;
_ActionTable_latestPayloadsByName$ = new WeakMap();
/** Consider it as Apache Kafka's KTable */
class ActionDataTable {
    constructor(source$, keySelector) {
        this.source$ = source$;
        this.keySelector = keySelector;
        this.snapshot = new Map();
        /** Alias of latestPayload */
        this.l = this.latestPayloadOf;
        this.future$ = this.source$.pipe((0, control_1.mapActionToPayload)(), rx.share());
        this.future$.subscribe(payload => {
            const key = keySelector(payload);
            this.snapshot.set(key, payload);
        });
    }
    latestPayloadOf(key) {
        if (this.snapshot.has(key)) {
            // replay last action
            return rx.concat(rx.of(this.snapshot.get(key)), this.future$.pipe(rx.filter(p => this.keySelector(p) === key)));
        }
        else {
            return this.future$.pipe(rx.filter(p => this.keySelector(p) === key));
        }
    }
}
exports.ActionDataTable = ActionDataTable;
//# sourceMappingURL=action-table.js.map