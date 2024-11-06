import { SimplexReactor } from './simplex-reactor';
import { ActionDispenser } from './stream-dispense';
export class BaseReactorFactory {
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
            const ac = ActionDispenser.ofAction$(a$);
            return inter(ac);
        });
        return this;
    }
    create(...params) {
        return this._create(a => a, params);
    }
    /** do not call this method directly, use create() instead */
    _create(overrideOpts, param) {
        let service;
        this.reactorsFac(instanceOpts => {
            const mergedOpts = this.protoOptions ? Object.assign(Object.assign({}, this.protoOptions), instanceOpts) :
                instanceOpts;
            service = new SimplexReactor(overrideOpts(mergedOpts));
            if (this._interceptors)
                service.s.prependInterceptor(...this._interceptors);
            return service;
        }, ...param);
        return service;
    }
}
export class DerivedReactorFactory {
    constructor(baseFactory, featOptions) {
        this.baseFactory = baseFactory;
        this.reactorsFac = () => { };
        this.featTableForList = featOptions === null || featOptions === void 0 ? void 0 : featOptions.tableFor;
        if (featOptions) {
            this.featOpts = Object.assign({}, featOptions);
            delete this.featOpts.tableFor;
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
        if (this.baseInterceptors == null)
            this.baseInterceptors = [];
        this.baseInterceptors.push(a$ => {
            const ac = ActionDispenser.ofAction$(a$);
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
        this.reactorsFac((instanceOpts, ...superParam) => {
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
    create(...params) {
        return this._create(a => a, params);
    }
}
//# sourceMappingURL=reactor-factory.js.map