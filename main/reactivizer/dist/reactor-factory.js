"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DerivedReactorFactory = exports.BaseReactorFactory = void 0;
const simplex_reactor_1 = require("./simplex-reactor");
const stream_dispense_1 = require("./stream-dispense");
class BaseReactorFactory {
    constructor(protoOptions) {
        this.protoOptions = protoOptions;
        this.reactorsFac = () => { };
    }
    defineReactor(fac) {
        this.reactorsFac = fac;
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
    create(instanceOpts) {
        const service = new simplex_reactor_1.SimplexReactor(this.protoOptions ? Object.assign(Object.assign({}, this.protoOptions), instanceOpts) :
            instanceOpts);
        if (this._interceptors)
            service.s.interceptorList$.next(this._interceptors);
        this.reactorsFac(service);
        return service;
    }
}
exports.BaseReactorFactory = BaseReactorFactory;
class DerivedReactorFactory {
    constructor(baseFactory, featOptions) {
        this.baseFactory = baseFactory;
        this.reactorsFac = () => { };
        this.featTableForList = featOptions === null || featOptions === void 0 ? void 0 : featOptions.tableFor;
        if (featOptions) {
            this.otherFeatOpts = Object.assign({}, featOptions);
            delete this.otherFeatOpts.tableFor;
        }
    }
    defineReactor(fac) {
        this.reactorsFac = fac;
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
    create(instanceOpts) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const mixedOpts = Object.assign(Object.assign({}, this.otherFeatOpts), instanceOpts);
        const service = this.baseFactory.create(mixedOpts).config({
            tableFor: this.featTableForList
        }).forExtend();
        const { s } = service;
        if (this._interceptors) {
            s.prependInterceptor(...this._interceptors);
        }
        if (this.baseInterceptors) {
            s.appendInterceptorToSrc(...this.baseInterceptors);
        }
        this.reactorsFac(service);
        return service;
    }
}
exports.DerivedReactorFactory = DerivedReactorFactory;
//# sourceMappingURL=reactor-factory.js.map