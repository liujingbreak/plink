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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
var _ActionTable_dataChange$, _ActionTable_actionNamesAdded$, _ActionTable_data;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionDataTable = exports.ActionTable = void 0;
const rx = __importStar(require("rxjs"));
const stream_core_1 = require("./stream-core");
const control_1 = require("./control");
const EMPTY_ARRY = [];
/**
 * ActionTable stores "latest" action messages, acting like a "BehaviorSubject", you can get the latest messages
 * by accessing:
 *
 * 1) `.actionSnapshot` which is a `Map`, the keys of it is message types, the values are the mapped payload array which
 *  includes ActionMeta as first element.
 * 2) `.data` which returns a hash object, the property names of it are message types, the values are the payload array
 *
 * You can also observe changes of the messages by accessing:
 * 1) `.l` or `.latestPayloads` which is a hash object, the property name of it are message types, the values
 *      are Observable of mapped payload array (which contains ActionMeta)
 * 2) `.dataChange$` which is Observable of returned hash object of `.getData()`
 *
 * Above Observable are all acting like a `ReplaySubject(1)`, which always immediately emits the last stored message when
 * being subscribed.
 */
class ActionTable {
    get dataChange$() {
        if (__classPrivateFieldGet(this, _ActionTable_dataChange$, "f"))
            return __classPrivateFieldGet(this, _ActionTable_dataChange$, "f");
        __classPrivateFieldSet(this, _ActionTable_dataChange$, __classPrivateFieldGet(this, _ActionTable_actionNamesAdded$, "f").pipe(rx.switchMap(() => rx.from(this.actionNames)), rx.mergeMap(actionName => this.latestPayloads[actionName]), rx.map(() => {
            __classPrivateFieldSet(this, _ActionTable_data, {}, "f");
            for (const k of this.actionNames) {
                const v = this.actionSnapshot.get(k);
                const old = __classPrivateFieldGet(this, _ActionTable_data, "f")[k];
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if (old === EMPTY_ARRY || old == null)
                    __classPrivateFieldGet(this, _ActionTable_data, "f")[k] = v ? v.slice(1) : EMPTY_ARRY;
                else {
                    if (v) {
                        __classPrivateFieldGet(this, _ActionTable_data, "f")[k] = v.slice(1);
                        // old.splice(0);
                        // for (let i = 1, l = v.length; i < l; i++)
                        //   (old as any[]).push(v[i]);
                    }
                    else
                        __classPrivateFieldGet(this, _ActionTable_data, "f")[k] = EMPTY_ARRY;
                }
            }
            return __classPrivateFieldGet(this, _ActionTable_data, "f");
        }), rx.share()), "f");
        return __classPrivateFieldGet(this, _ActionTable_dataChange$, "f");
    }
    get data() {
        return __classPrivateFieldGet(this, _ActionTable_data, "f");
    }
    constructor(streamCtl, actionsOrTable) {
        this.streamCtl = streamCtl;
        this.latestPayloads = {};
        _ActionTable_dataChange$.set(this, void 0);
        _ActionTable_actionNamesAdded$.set(this, void 0);
        /** the source of dataChange$ */
        _ActionTable_data.set(this, void 0);
        const baseTable = Array.isArray(actionsOrTable) ? null : actionsOrTable;
        if (baseTable == null) {
            this.actionNames = new Set();
            __classPrivateFieldSet(this, _ActionTable_actionNamesAdded$, new rx.ReplaySubject(1), "f");
            this.addActions(...actionsOrTable);
            this.actionSnapshot = new Map();
            __classPrivateFieldSet(this, _ActionTable_data, {}, "f");
        }
        else {
            this.actionNames = baseTable.actionNames;
            __classPrivateFieldSet(this, _ActionTable_actionNamesAdded$, __classPrivateFieldGet(baseTable, _ActionTable_actionNamesAdded$, "f"), "f");
            this.actionSnapshot = baseTable.actionSnapshot;
            __classPrivateFieldSet(this, _ActionTable_data, __classPrivateFieldGet(baseTable, _ActionTable_data, "f"), "f");
        }
        this.l = this.latestPayloads;
        // Assign this.#data, this.latestPayloads, this.actionSnapshot
        __classPrivateFieldGet(this, _ActionTable_actionNamesAdded$, "f").pipe(rx.mergeMap(actionNames => {
            return actionNames;
        }), rx.mergeMap(actionName => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (__classPrivateFieldGet(this, _ActionTable_data, "f")[actionName] == null)
                __classPrivateFieldGet(this, _ActionTable_data, "f")[actionName] = EMPTY_ARRY;
            if (stream_core_1.has.call(this.latestPayloads, actionName))
                return rx.EMPTY;
            const a$ = new rx.ReplaySubject(1);
            this.latestPayloads[actionName] = this.streamCtl.opts.debugTableAction ?
                a$.pipe(this.debugLogLatestActionOperator(actionName)) :
                a$.asObservable();
            let source = this.streamCtl.at[actionName];
            if (baseTable) {
                const baseLatest = baseTable.actionSnapshot.get(actionName);
                if (baseLatest) {
                    source = rx.concat(rx.of({ t: actionName, i: baseLatest[0].i, p: baseLatest.slice(1) }), source);
                }
            }
            return source.pipe(rx.map(a => {
                // Always use a brand new array to maintain immutability, which serves things like rx.distinctUntilChanged()
                const mapParam = [{ i: a.i, r: a.r }, ...a.p];
                this.actionSnapshot.set(actionName, mapParam);
                return mapParam;
            }), rx.tap(a$));
        })).subscribe();
        this.dataChange$.subscribe(); // to make sure this.#data will be fulfilled even when there is no any external observer
    }
    /** @deprecated use .data instead */
    getData() {
        return __classPrivateFieldGet(this, _ActionTable_data, "f");
    }
    /** Add actions to be recoreded in table map, action name which is duplicate to existings
     * will be ignored,
     * by creating `ReplaySubject(1)` for each action payload stream respectively
     */
    addActions(...actionNames) {
        const uniqueNewActions = actionNames.filter(a => !this.actionNames.has(a));
        for (const a of uniqueNewActions) {
            this.actionNames.add(a);
        }
        __classPrivateFieldGet(this, _ActionTable_actionNamesAdded$, "f").next(uniqueNewActions);
        return this;
    }
    getLatestActionOf(actionName) {
        return this.actionSnapshot.get(actionName);
    }
    debugLogLatestActionOperator(type) {
        var _a;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        const core = (_a = this.streamCtl.core) !== null && _a !== void 0 ? _a : this.streamCtl;
        return this.streamCtl.opts.log ?
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
                        console.log(`%c ${core.logPrefix} latest `, 'color: #f0fe0fe0; background: #8c61dd;', type, (0, stream_core_1.actionMetaToStr)(p[0]));
                    }
                    return p;
                }) :
                rx.map((p, idx) => {
                    if (idx > 0 && !core.debugExcludeSet.has(type)) {
                        // eslint-disable-next-line no-console
                        console.log(core.logPrefix + ' latest:', type, (0, stream_core_1.actionMetaToStr)(p[0]));
                    }
                    return p;
                });
    }
}
exports.ActionTable = ActionTable;
_ActionTable_dataChange$ = new WeakMap(), _ActionTable_actionNamesAdded$ = new WeakMap(), _ActionTable_data = new WeakMap();
/** Consider it as Apache Kafka's KTable */
class ActionDataTable {
    constructor(source$, keySelector) {
        this.source$ = source$;
        this.keySelector = keySelector;
        this.snapshot = new Map();
        /** Alias of latestPayload */
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.ofKey = this.getPayloadStreamOfKey;
        this.future$ = this.source$.pipe((0, control_1.mapActionToPayload)(), rx.share());
        this.future$.subscribe(payload => {
            const key = keySelector(payload);
            this.snapshot.set(key, payload);
        });
    }
    getPayloadStreamOfKey(key) {
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