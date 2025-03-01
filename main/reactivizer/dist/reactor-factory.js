"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DerivedReactorFactory = exports.BaseReactorFactory = void 0;
const simplex_reactor_1 = require("./simplex-reactor");
const stream_dispense_1 = require("./stream-dispense");
class BaseReactorFactory {
    constructor(protoOptions) {
        this.protoOptions = protoOptions;
        this.reactorDefinition = (init, ...p) => { init(...p); };
    }
    /** Define message subscription in this method will be able to be inherited by any derived SimplexRectors
     **/
    defineReactor(fac) {
        this.reactorDefinition = fac;
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
        if (this._interceptors == null)
            this._interceptors = [];
        this._interceptors.push(a$ => {
            const ac = stream_dispense_1.ActionDispenser.ofAction$(a$);
            return inter(ac);
        });
        return this;
    }
    /** create SimplexReactor instance */
    create(...params) {
        return this._create(a => a, params);
    }
    /** do not call this method directly, use create() instead */
    _create(overrideOpts, param) {
        let service;
        this.reactorDefinition(instanceOpts => {
            const mergedOpts = this.protoOptions ? Object.assign(Object.assign({}, this.protoOptions), instanceOpts) :
                instanceOpts;
            service = new simplex_reactor_1.SimplexReactor(overrideOpts(mergedOpts));
            if (this._interceptors)
                service.s.prependInterceptor(...this._interceptors);
            return service;
        }, ...param);
        return service;
    }
}
exports.BaseReactorFactory = BaseReactorFactory;
class DerivedReactorFactory {
    constructor(baseFactory, featOptions) {
        this.baseFactory = baseFactory;
        this.reactorDefinition = (init, ...p) => { init(); };
        this.featTableForList = featOptions === null || featOptions === void 0 ? void 0 : featOptions.tableFor;
        if (featOptions) {
            this.featOpts = Object.assign({}, featOptions);
            delete this.featOpts.tableFor;
        }
    }
    defineReactor(fac) {
        this.reactorDefinition = fac;
        return this;
    }
    /** New interceptors are appended to existing interceptors which is inherited from base factory */
    interceptor(...interc) {
        this._interceptors = interc;
        return this;
    }
    interceptorByType(inter) {
        if (this._interceptors == null)
            this._interceptors = [];
        this._interceptors.push(a$ => {
            const ac = stream_dispense_1.ActionDispenser.ofAction$(a$);
            return inter(ac);
        });
        return this;
    }
    interceptorForBase(...interc) {
        this.baseInterceptors = interc;
        return this;
    }
    interceptorForBaseByType(interc) {
        if (this.baseInterceptors == null)
            this.baseInterceptors = [];
        this.baseInterceptors.push(a$ => {
            const ac = stream_dispense_1.ActionDispenser.ofAction$(a$);
            return interc(ac);
        });
        return this;
    }
    forExtend(newOpts) {
        return new DerivedReactorFactory(this, newOpts);
    }
    /** do not call this method directly, use create() instead */
    _create(overrideOpts, params) {
        let service;
        this.reactorDefinition((instanceOpts, ...superParam) => {
            const mixed = Object.assign(Object.assign({}, this.featOpts), instanceOpts);
            service = this.baseFactory._create(baseOpts => overrideOpts(Object.assign(baseOpts, mixed)), superParam).config({
                tableFor: this.featTableForList
            }).forExtend();
            if (this._interceptors)
                service.s.prependInterceptor(...this._interceptors);
            if (this.baseInterceptors)
                service.s.appendInterceptorToSrc(...this.baseInterceptors);
            return service;
        }, ...params);
        return service;
    }
    /** create SimplexReactor instance */
    create(...params) {
        return this._create(a => a, params);
    }
}
exports.DerivedReactorFactory = DerivedReactorFactory;
//# sourceMappingURL=reactor-factory.js.map