var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _BaseReactorFactory_id, _BaseReactorFactory_setting, _DerivedReactorFactory_id, _DerivedReactorFactory_setting;
import { SimplexReactor } from './simplex-reactor';
import { ActionDispenser } from './action-dispenser';
function increId() {
    const id = [Date.now(), Math.random().toString(36).slice(2)];
    return id;
}
export class BaseReactorFactory {
    constructor(protoOptions) {
        this.protoOptions = protoOptions;
        _BaseReactorFactory_id.set(this, void 0);
        this.reactorDefinition = 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (ctx, ..._p) => { ctx.init(); };
        _BaseReactorFactory_setting.set(this, void 0);
        __classPrivateFieldSet(this, _BaseReactorFactory_id, increId(), "f");
    }
    /** Define message subscription in this method will be able to be inherited by any derived SimplexRectors
     **/
    defineReactor(defCb) {
        const self = this;
        self.reactorDefinition = defCb;
        return self;
    }
    /** Mainly for setting debug options for later creating service instance.
     * Unlike consturctor parameter `protoOptions`:
     * - this setting options will not be inherited by derived factory
     * - it does not allow set property `tableFor` which changes the "shape" of the service
    **/
    setting(opt) {
        __classPrivateFieldSet(this, _BaseReactorFactory_setting, opt, "f");
        return this;
    }
    forExtend(newOpts) {
        return new DerivedReactorFactory(this, newOpts);
    }
    interceptor(...interc) {
        this._interceptors = interc;
        return this;
    }
    interceptorByType(inter) {
        var _a;
        (_a = this._interceptors) !== null && _a !== void 0 ? _a : (this._interceptors = []);
        this._interceptors.push(a$ => {
            const ac = ActionDispenser.ofAction$(a$);
            return inter(ac);
        });
        return this;
    }
    /** create SimplexReactor instance */
    create(...params) {
        var _a;
        let service;
        this.reactorDefinition({
            setting: (_a = __classPrivateFieldGet(this, _BaseReactorFactory_setting, "f")) !== null && _a !== void 0 ? _a : null,
            init: opt => {
                var _a, _b;
                var _c;
                const mergedOpts = Object.assign(Object.assign({}, this.protoOptions), (opt !== null && opt !== void 0 ? opt : __classPrivateFieldGet(this, _BaseReactorFactory_setting, "f")));
                if (this.protoOptions.tableFor)
                    mergedOpts.tableFor = ((_a = mergedOpts.tableFor) !== null && _a !== void 0 ? _a : []).concat(this.protoOptions.tableFor);
                service = new SimplexReactor(mergedOpts);
                (_b = (_c = service).factoryIds) !== null && _b !== void 0 ? _b : (_c.factoryIds = []);
                service.factoryIds.push(...__classPrivateFieldGet(this, _BaseReactorFactory_id, "f"));
                if (this._interceptors)
                    service.s.prependInterceptor(...this._interceptors);
                return service;
            }
        }, ...params);
        if (service == null) {
            throw new Error(`ReactorFactory ${this.protoOptions.name}, super service constructor must be executed synchronously`);
        }
        return service;
    }
    isFactoryOf(svc) {
        var _a;
        const ids = (_a = svc.factoryIds) !== null && _a !== void 0 ? _a : [];
        for (let i = 0, l = ids.length; i < l; i += 3) {
            if (ids[i] === __classPrivateFieldGet(this, _BaseReactorFactory_id, "f")[0] && ids[i + 1] === __classPrivateFieldGet(this, _BaseReactorFactory_id, "f")[1]) {
                return true;
            }
        }
        return false;
    }
}
_BaseReactorFactory_id = new WeakMap(), _BaseReactorFactory_setting = new WeakMap();
export class DerivedReactorFactory {
    /** Do not instantiate through constructor, instead, use BaseReactorFactory['forExtend'] */
    constructor(baseFactory, superConfigUpdate) {
        this.baseFactory = baseFactory;
        this.superConfigUpdate = superConfigUpdate;
        _DerivedReactorFactory_id.set(this, void 0);
        this.reactorDefinition = (ctx, ...p) => { ctx.init(null, ...p); };
        _DerivedReactorFactory_setting.set(this, void 0);
        __classPrivateFieldSet(this, _DerivedReactorFactory_id, increId(), "f");
    }
    defineReactor(defCb) {
        const casted = this;
        casted.reactorDefinition = defCb;
        return casted;
    }
    /** New interceptors are appended to existing interceptors which is inherited from base factory */
    interceptor(...interc) {
        this._interceptors = interc;
        return this;
    }
    interceptorByType(inter) {
        var _a;
        (_a = this._interceptors) !== null && _a !== void 0 ? _a : (this._interceptors = []);
        this._interceptors.push(a$ => {
            const ac = ActionDispenser.ofAction$(a$);
            return inter(ac);
        });
        return this;
    }
    interceptorForBase(...interc) {
        this.baseInterceptors = interc;
        return this;
    }
    interceptorForBaseByType(interc) {
        var _a;
        (_a = this.baseInterceptors) !== null && _a !== void 0 ? _a : (this.baseInterceptors = []);
        this.baseInterceptors.push(a$ => {
            const ac = ActionDispenser.ofAction$(a$);
            return interc(ac);
        });
        return this;
    }
    forExtend(newOpts) {
        return new DerivedReactorFactory(this, newOpts);
    }
    /** Mainly for setting debug options for later creating service instance.
     * Unlike consturctor parameter `superConfigUpdate`:
     * - this setting options will not be inherited by derived factory
     * - it does not allow set property `tableFor` which changes the "shape" of the service
    **/
    setting(opt) {
        __classPrivateFieldSet(this, _DerivedReactorFactory_setting, opt, "f");
        return this;
    }
    /** create SimplexReactor instance */
    create(...params) {
        var _a;
        let service;
        this.reactorDefinition({
            setting: (_a = __classPrivateFieldGet(this, _DerivedReactorFactory_setting, "f")) !== null && _a !== void 0 ? _a : null,
            init: (superOpts, ...superParam) => {
                var _a, _b;
                var _c;
                const mergedSuperOpts = Object.assign(Object.assign({}, this.superConfigUpdate), (superOpts !== null && superOpts !== void 0 ? superOpts : __classPrivateFieldGet(this, _DerivedReactorFactory_setting, "f")));
                if (this.superConfigUpdate.tableFor)
                    mergedSuperOpts.tableFor = ((_a = mergedSuperOpts.tableFor) !== null && _a !== void 0 ? _a : []).concat(this.superConfigUpdate.tableFor);
                // delete mergedSuperOpts.tableFor;
                service = this.baseFactory.setting(mergedSuperOpts)
                    .create(...superParam)
                    .toExtend();
                (_b = (_c = service).factoryIds) !== null && _b !== void 0 ? _b : (_c.factoryIds = []);
                service.factoryIds.push(...__classPrivateFieldGet(this, _DerivedReactorFactory_id, "f"));
                if (this._interceptors)
                    service.s.prependInterceptor(...this._interceptors);
                if (this.baseInterceptors)
                    service.s.appendInterceptorToSrc(...this.baseInterceptors);
                return service;
            }
        }, ...params);
        if (service == null) {
            throw new Error(`ReactorFactory ${this.superConfigUpdate.name}, super service constructor must be executed synchronously`);
        }
        return service;
    }
    isFactoryOf(svc) {
        var _a;
        const ids = (_a = svc.factoryIds) !== null && _a !== void 0 ? _a : [];
        for (let i = 0, l = ids.length; i < l; i += 3) {
            if (ids[i] === __classPrivateFieldGet(this, _DerivedReactorFactory_id, "f")[0] && ids[i + 1] === __classPrivateFieldGet(this, _DerivedReactorFactory_id, "f")[1]) {
                return true;
            }
        }
        return false;
    }
}
_DerivedReactorFactory_id = new WeakMap(), _DerivedReactorFactory_setting = new WeakMap();
//# sourceMappingURL=reactor-factory.js.map