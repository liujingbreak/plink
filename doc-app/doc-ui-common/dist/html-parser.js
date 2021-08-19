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
exports.createBranch = exports.createPath = exports.createParseOperator = exports.HtmlTokenType = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
var HtmlTokenType;
(function (HtmlTokenType) {
    // comments,
    HtmlTokenType[HtmlTokenType["<"] = 0] = "<";
    HtmlTokenType[HtmlTokenType[">"] = 1] = ">";
    HtmlTokenType[HtmlTokenType["/>"] = 2] = "/>";
    HtmlTokenType[HtmlTokenType["("] = 3] = "(";
    HtmlTokenType[HtmlTokenType[")"] = 4] = ")";
    HtmlTokenType[HtmlTokenType["["] = 5] = "[";
    HtmlTokenType[HtmlTokenType["]"] = 6] = "]";
    HtmlTokenType[HtmlTokenType["</"] = 7] = "</";
    HtmlTokenType[HtmlTokenType["="] = 8] = "=";
    HtmlTokenType[HtmlTokenType["qm"] = 9] = "qm";
    HtmlTokenType[HtmlTokenType["identity"] = 10] = "identity";
    HtmlTokenType[HtmlTokenType["stringLiteral"] = 11] = "stringLiteral";
    HtmlTokenType[HtmlTokenType["any"] = 12] = "any";
    HtmlTokenType[HtmlTokenType["space"] = 13] = "space";
    HtmlTokenType[HtmlTokenType["comment"] = 14] = "comment";
})(HtmlTokenType = exports.HtmlTokenType || (exports.HtmlTokenType = {}));
class Context {
    constructor(rootScopeCreator, output) {
        this.output = output;
        // handlerStack: {name: string; handler: StateHandler<T, U>}[] = [];
        this._needRestore = false;
        // _caching = false;
        this._cacheData = [];
        this._cacheStartPos = 0;
        this._marker = [];
        this.currScope = this.rootScope = rootScopeCreator();
    }
    mark() {
        if (this._marker.length === 0) {
            this._cacheData.splice(0);
            this._cacheData[0] = this.currValue;
            this._cacheStartPos = this.index;
        }
        this._marker.push(this.index);
        // this._caching = true;
    }
    clearMark() {
        this._marker.pop();
        this._cacheData.splice(0);
    }
    restore() {
        this._needRestore = true;
    }
    _onNext(inputValue, index) {
        this.index = index;
        this.currValue = inputValue;
        if (this._marker.length > 0) {
            this._cacheData.push(inputValue);
        }
        this.currScope.run(this);
        if (this.error) {
            throw new Error(`At position ${index}, ${this.error}, handler stacks: ${scopeStack(this.currScope).join('\n')}`);
        }
        if (this._needRestore && this._marker.length > 0) {
            this._needRestore = false;
            const mark = this._marker.pop();
            for (let i = mark - this._cacheStartPos, end = this._cacheData.length; i < end; i++) {
                this.currValue = this._cacheData[i];
                this.index = i + this._cacheStartPos;
                this.currScope.run(this);
            }
        }
    }
}
class ValueStep {
    constructor(scope, value) {
        this.scope = scope;
        this.value = value;
    }
    run(value) {
        return (this.value === value);
    }
}
class HandlerStep {
    constructor(scope, scopeCreator) {
        this.scope = scope;
        this.scopeCreator = scopeCreator;
    }
    run(ctx) {
        const childScope = this.scopeCreator();
        childScope.parent = this.scope;
        childScope.run(ctx);
        return true;
    }
}
function scopeStack(currScope) {
    const desc = [currScope.name];
    let scope = currScope.parent;
    while (scope) {
        desc.unshift(currScope.name);
        scope = currScope.parent;
    }
    return desc;
}
function returnStack(currScope, ctx) {
    if (currScope.parent) {
        const nextStep = currScope.parent.curreStep.next;
        if (nextStep) {
            currScope.parent.curreStep = nextStep;
            currScope.parent.run(ctx);
        }
    }
}
function createParseOperator(rootHandler) {
    return (input) => {
        return new rx.Observable(sub => {
            const ctx = new Context(rootHandler, sub);
            const subscription = input.pipe(op.map(function (inputValue, index) {
                ctx._onNext(inputValue, index);
            })).subscribe();
            return () => subscription.unsubscribe();
        });
    };
}
exports.createParseOperator = createParseOperator;
function createPath(name, ...values) {
    let step = 0;
    const handler = function (ctx) {
        if (step >= values.length) {
            ctx.handlerStack.pop();
        }
        const stepValue = values[step];
        if (isHandlerFactory(stepValue)) {
            const handler = stepValue();
            ctx.handlerStack.push(handler);
        }
        else if (stepValue !== ctx.currValue) {
            ctx.error = `Expect "${stepValue.toString()}", but get: ${ctx.currValue.toString()}`;
            return false;
        }
        step++;
        return true;
    };
    return { name, handler };
}
exports.createPath = createPath;
createPath._isHandler = true;
function createBranch(name, ...choices) {
    let choiceIdx = 0;
    let isLookAhead = true;
    const handler = function (ctx) {
        if (choiceIdx === 0) {
            ctx.mark();
        }
        if (choiceIdx >= choices.length) {
            ctx.handlerStack.pop();
            ctx.error = 'Out of choice';
            ctx.clearMark();
            return false;
        }
        const choice = choices[choiceIdx];
        if (isLookAhead) {
            if (isHandlerFactory(choice.la)) {
                ctx.handlerStack.push(choice.la());
            }
            else if (choice.la === ctx.currValue) {
            }
        }
        else {
        }
        choiceIdx++;
        return true;
    };
    return { name, handler };
}
exports.createBranch = createBranch;
createBranch._isHandler = true;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbC1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodG1sLXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQTJCO0FBQzNCLG1EQUFxQztBQUVyQyxJQUFZLGFBaUJYO0FBakJELFdBQVksYUFBYTtJQUN2QixZQUFZO0lBQ1osMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCw2Q0FBSSxDQUFBO0lBQ0osMkNBQUcsQ0FBQTtJQUNILDJDQUFHLENBQUE7SUFDSCwyQ0FBRyxDQUFBO0lBQ0gsMkNBQUcsQ0FBQTtJQUNILDZDQUFJLENBQUE7SUFDSiwyQ0FBRyxDQUFBO0lBQ0gsNkNBQUUsQ0FBQTtJQUNGLDBEQUFRLENBQUE7SUFDUixvRUFBYSxDQUFBO0lBQ2IsZ0RBQUcsQ0FBQTtJQUNILG9EQUFLLENBQUE7SUFDTCx3REFBTyxDQUFBO0FBQ1QsQ0FBQyxFQWpCVyxhQUFhLEdBQWIscUJBQWEsS0FBYixxQkFBYSxRQWlCeEI7QUFFRCxNQUFNLE9BQU87SUFjWCxZQUFZLGdCQUEwQyxFQUFTLE1BQXdCO1FBQXhCLFdBQU0sR0FBTixNQUFNLENBQWtCO1FBUnZGLG9FQUFvRTtRQUNwRSxpQkFBWSxHQUFHLEtBQUssQ0FBQztRQUVyQixvQkFBb0I7UUFDcEIsZUFBVSxHQUFRLEVBQUUsQ0FBQztRQUNyQixtQkFBYyxHQUFHLENBQUMsQ0FBQztRQUNuQixZQUFPLEdBQWEsRUFBRSxDQUFDO1FBR3JCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ3ZELENBQUM7SUFFRCxJQUFJO1FBQ0YsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDN0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxD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SUFBSSxFQUFFLENBQUM7U0FDWjtRQUNELElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7WUFDL0IsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUN2QixHQUFHLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQztZQUM1QixHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDaEIsT0FBTyxLQUFLLENBQUM7U0FDZDtRQUNELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsQyxJQUFJLFdBQVcsRUFBRTtZQUNmLElBQUksZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUMvQixHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNwQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssR0FBRyxDQUFDLFNBQVMsRUFBRTthQUV2QztTQUNGO2FBQU07U0FFTjtRQUNELFNBQVMsRUFBRSxDQUFDO1FBQ1osT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUM7SUFDRixPQUFPLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDO0FBQ3pCLENBQUM7QUE5QkQsb0NBOEJDO0FBQ0EsWUFBaUQsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmV4cG9ydCBlbnVtIEh0bWxUb2tlblR5cGUge1xuICAvLyBjb21tZW50cyxcbiAgJzwnLFxuICAnPicsXG4gICcvPicsXG4gICcoJyxcbiAgJyknLFxuICAnWycsXG4gICddJyxcbiAgJzwvJyxcbiAgJz0nLFxuICBxbSwgLy8gcXVvdGF0aW9uIG1hcmtcbiAgaWRlbnRpdHksXG4gIHN0cmluZ0xpdGVyYWwsXG4gIGFueSwgLy8gLipcbiAgc3BhY2UsXG4gIGNvbW1lbnRcbn1cblxuY2xhc3MgQ29udGV4dDxULCBVPiB7XG4gIGN1cnJWYWx1ZSE6IFQ7XG4gIGluZGV4ITogbnVtYmVyO1xuICBlcnJvcj86IHN0cmluZztcbiAgcm9vdFNjb3BlOiBIYW5kbGVyU2NvcGU8VCwgVT47XG4gIGN1cnJTY29wZTogSGFuZGxlclNjb3BlPFQsIFU+O1xuICAvLyBoYW5kbGVyU3RhY2s6IHtuYW1lOiBzdHJpbmc7IGhhbmRsZXI6IFN0YXRlSGFuZGxlcjxULCBVPn1bXSA9IFtdO1xuICBfbmVlZFJlc3RvcmUgPSBmYWxzZTtcblxuICAvLyBfY2FjaGluZyA9IGZhbHNlO1xuICBfY2FjaGVEYXRhOiBUW10gPSBbXTtcbiAgX2NhY2hlU3RhcnRQb3MgPSAwO1xuICBfbWFya2VyOiBudW1iZXJbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKHJvb3RTY29wZUNyZWF0b3I6ICgpID0+IEhhbmRsZXJTY29wZTxULCBVPiwgcHVibGljIG91dHB1dDogcnguU3Vic2NyaWJlcjxVPikge1xuICAgIHRoaXMuY3VyclNjb3BlID0gdGhpcy5yb290U2NvcGUgPSByb290U2NvcGVDcmVhdG9yKCk7XG4gIH1cblxuICBtYXJrKCkge1xuICAgIGlmICh0aGlzLl9tYXJrZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLl9jYWNoZURhdGEuc3BsaWNlKDApO1xuICAgICAgdGhpcy5fY2FjaGVEYXRhWzBdID0gdGhpcy5jdXJyVmFsdWU7XG4gICAgICB0aGlzLl9jYWNoZVN0YXJ0UG9zID0gdGhpcy5pbmRleDtcbiAgICB9XG4gICAgdGhpcy5fbWFya2VyLnB1c2godGhpcy5pbmRleCk7XG4gICAgLy8gdGhpcy5fY2FjaGluZyA9IHRydWU7XG4gIH1cblxuICBjbGVhck1hcmsoKSB7XG4gICAgdGhpcy5fbWFya2VyLnBvcCgpO1xuICAgIHRoaXMuX2NhY2hlRGF0YS5zcGxpY2UoMCk7XG4gIH1cblxuICByZXN0b3JlKCkge1xuICAgIHRoaXMuX25lZWRSZXN0b3JlID0gdHJ1ZTtcbiAgfVxuXG4gIF9vbk5leHQoaW5wdXRWYWx1ZTogVCwgaW5kZXg6IG51bWJlcikge1xuICAgIHRoaXMuaW5kZXggPSBpbmRleDtcbiAgICB0aGlzLmN1cnJWYWx1ZSA9IGlucHV0VmFsdWU7XG4gICAgaWYgKHRoaXMuX21hcmtlci5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9jYWNoZURhdGEucHVzaChpbnB1dFZhbHVlKTtcbiAgICB9XG4gICAgdGhpcy5jdXJyU2NvcGUucnVuKHRoaXMpO1xuICAgIGlmICh0aGlzLmVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEF0IHBvc2l0aW9uICR7aW5kZXh9LCAke3RoaXMuZXJyb3J9LCBoYW5kbGVyIHN0YWNrczogJHtzY29wZVN0YWNrKHRoaXMuY3VyclNjb3BlKS5qb2luKCdcXG4nKX1gKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuX25lZWRSZXN0b3JlICYmIHRoaXMuX21hcmtlci5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9uZWVkUmVzdG9yZSA9IGZhbHNlO1xuICAgICAgY29uc3QgbWFyayA9IHRoaXMuX21hcmtlci5wb3AoKSE7XG4gICAgICBmb3IgKGxldCBpID0gbWFyayAtIHRoaXMuX2NhY2hlU3RhcnRQb3MsIGVuZCA9IHRoaXMuX2NhY2hlRGF0YS5sZW5ndGg7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgICB0aGlzLmN1cnJWYWx1ZSA9IHRoaXMuX2NhY2hlRGF0YVtpXTtcbiAgICAgICAgdGhpcy5pbmRleCA9IGkgKyB0aGlzLl9jYWNoZVN0YXJ0UG9zO1xuICAgICAgICB0aGlzLmN1cnJTY29wZS5ydW4odGhpcyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBTdGVwPFQsIFU+IHtcbiAgbmV4dD86IFN0ZXA8VCwgVT47XG4gIHNjb3BlOiBIYW5kbGVyU2NvcGU8VCwgVT47XG4gIC8vIHJ1bih2YWx1ZTogVCk6IGJvb2xlYW47XG5cbn1cblxuY2xhc3MgVmFsdWVTdGVwPFQsIFU+IGltcGxlbWVudHMgU3RlcDxULCBVPiB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBzY29wZTogSGFuZGxlclNjb3BlPFQsIFU+LCBwdWJsaWMgdmFsdWU6IFQpIHtcbiAgfVxuICBydW4odmFsdWU6IFQpIHtcbiAgICByZXR1cm4gKHRoaXMudmFsdWUgPT09IHZhbHVlKTtcbiAgfVxufVxuXG5jbGFzcyBIYW5kbGVyU3RlcDxULCBVPiBpbXBsZW1lbnRzIFN0ZXA8VCwgVT4ge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgc2NvcGU6IEhhbmRsZXJTY29wZTxULCBVPiwgcHVibGljIHNjb3BlQ3JlYXRvcjogKCkgPT4gSGFuZGxlclNjb3BlPFQsIFU+KSB7fVxuXG4gIHJ1bihjdHg6IENvbnRleHQ8VCwgVT4pIHtcbiAgICBjb25zdCBjaGlsZFNjb3BlID0gdGhpcy5zY29wZUNyZWF0b3IoKTtcbiAgICBjaGlsZFNjb3BlLnBhcmVudCA9IHRoaXMuc2NvcGU7XG4gICAgY2hpbGRTY29wZS5ydW4oY3R4KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgSGFuZGxlclNjb3BlPFQsIFU+IHtcbiAgbmFtZTogc3RyaW5nO1xuICBzdGFydFN0ZXA6IFN0ZXA8VCwgVT47XG4gIGN1cnJlU3RlcDogU3RlcDxULCBVPjtcbiAgcGFyZW50PzogSGFuZGxlclNjb3BlPFQsIFU+O1xuICBydW4oY3R4OiBDb250ZXh0PFQsIFU+KTogdm9pZDtcbn1cblxuZnVuY3Rpb24gc2NvcGVTdGFjazxULCBVPihjdXJyU2NvcGU6IEhhbmRsZXJTY29wZTxULCBVPikge1xuICBjb25zdCBkZXNjID0gW2N1cnJTY29wZS5uYW1lXTtcbiAgbGV0IHNjb3BlID0gY3VyclNjb3BlLnBhcmVudDtcbiAgd2hpbGUgKHNjb3BlKSB7XG4gICAgZGVzYy51bnNoaWZ0KGN1cnJTY29wZS5uYW1lKTtcbiAgICBzY29wZSA9IGN1cnJTY29wZS5wYXJlbnQ7XG4gIH1cbiAgcmV0dXJuIGRlc2M7XG59XG5cbmZ1bmN0aW9uIHJldHVyblN0YWNrPFQsIFU+KGN1cnJTY29wZTogSGFuZGxlclNjb3BlPFQsIFU+LCBjdHg6IENvbnRleHQ8VCwgVT4pIHtcbiAgaWYgKGN1cnJTY29wZS5wYXJlbnQpIHtcbiAgICBjb25zdCBuZXh0U3RlcCA9IGN1cnJTY29wZS5wYXJlbnQuY3VycmVTdGVwLm5leHQ7XG4gICAgaWYgKG5leHRTdGVwKSB7XG4gICAgICBjdXJyU2NvcGUucGFyZW50LmN1cnJlU3RlcCA9IG5leHRTdGVwO1xuICAgICAgY3VyclNjb3BlLnBhcmVudC5ydW4oY3R4KTtcbiAgICB9XG4gIH1cbn1cblxudHlwZSBTdGF0ZUhhbmRsZXI8VCwgVT4gPSAoY3R4OiBDb250ZXh0PFQsIFU+KSA9PiBib29sZWFuO1xuXG5pbnRlcmZhY2UgSGFuZGxlckZhY3Rvcnk8VCwgVT4ge1xuICAoKToge25hbWU6IHN0cmluZzsgaGFuZGxlcjogU3RhdGVIYW5kbGVyPFQsIFU+fTtcbiAgX2lzSGFuZGxlcjogdHJ1ZTtcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGFyc2VPcGVyYXRvcjxULCBVPihyb290SGFuZGxlcjogU3RhdGVIYW5kbGVyPFQsIFU+KSB7XG4gIHJldHVybiAoaW5wdXQ6IHJ4Lk9ic2VydmFibGU8VD4pID0+IHtcbiAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8VT4oc3ViID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IG5ldyBDb250ZXh0PFQsIFU+KHJvb3RIYW5kbGVyLCBzdWIpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gaW5wdXQucGlwZShvcC5tYXAoZnVuY3Rpb24oaW5wdXRWYWx1ZTogVCwgaW5kZXg6IG51bWJlcikge1xuICAgICAgICBjdHguX29uTmV4dChpbnB1dFZhbHVlLCBpbmRleCk7XG4gICAgICB9KSkuc3Vic2NyaWJlKCk7XG4gICAgICByZXR1cm4gKCkgPT4gc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKCk7XG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYXRoPFQgZXh0ZW5kcyBzdHJpbmcgfCB7dG9TdHJpbmcoKTogc3RyaW5nfSwgVT4oXG4gIG5hbWU6IHN0cmluZywgLi4udmFsdWVzOiAoVCB8IEhhbmRsZXJGYWN0b3J5PFQsIFU+KVtdKSA6IFJldHVyblR5cGU8SGFuZGxlckZhY3Rvcnk8VCwgVT4+IHtcbiAgbGV0IHN0ZXAgPSAwO1xuXG4gIGNvbnN0IGhhbmRsZXI6IFN0YXRlSGFuZGxlcjxULCBVPiA9IGZ1bmN0aW9uKGN0eCkge1xuICAgIGlmIChzdGVwID49IHZhbHVlcy5sZW5ndGgpIHtcbiAgICAgIGN0eC5oYW5kbGVyU3RhY2sucG9wKCk7XG4gICAgfVxuICAgIGNvbnN0IHN0ZXBWYWx1ZSA9IHZhbHVlc1tzdGVwXTtcbiAgICBpZiAoaXNIYW5kbGVyRmFjdG9yeShzdGVwVmFsdWUpKSB7XG4gICAgICBjb25zdCBoYW5kbGVyID0gc3RlcFZhbHVlKCk7XG4gICAgICBjdHguaGFuZGxlclN0YWNrLnB1c2goaGFuZGxlcik7XG4gICAgfSBlbHNlIGlmIChzdGVwVmFsdWUgIT09IGN0eC5jdXJyVmFsdWUpIHtcbiAgICAgIGN0eC5lcnJvciA9IGBFeHBlY3QgXCIke3N0ZXBWYWx1ZS50b1N0cmluZygpfVwiLCBidXQgZ2V0OiAke2N0eC5jdXJyVmFsdWUudG9TdHJpbmcoKX1gO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBzdGVwKys7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG4gIHJldHVybiB7bmFtZSwgaGFuZGxlcn07XG59XG4oY3JlYXRlUGF0aCBhcyBIYW5kbGVyRmFjdG9yeTx1bmtub3duLCB1bmtub3duPikuX2lzSGFuZGxlciA9IHRydWU7XG5cbmludGVyZmFjZSBDaG9pY2U8VCwgVT4ge1xuICAvKiogbG9vayBhaGVhZCAqL1xuICBsYTogVCB8IEhhbmRsZXJGYWN0b3J5PFQsIFU+O1xuICBwYXRoOiBUIHwgSGFuZGxlckZhY3Rvcnk8VCwgVT47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCcmFuY2g8VCBleHRlbmRzIHN0cmluZyB8IHt0b1N0cmluZygpOiBzdHJpbmd9LCBVPihcbiAgbmFtZTogc3RyaW5nLCAuLi5jaG9pY2VzOiBDaG9pY2U8VCwgVT5bXSkgOiBSZXR1cm5UeXBlPEhhbmRsZXJGYWN0b3J5PFQsIFU+PiB7XG5cbiAgbGV0IGNob2ljZUlkeCA9IDA7XG4gIGxldCBpc0xvb2tBaGVhZCA9IHRydWU7XG5cbiAgY29uc3QgaGFuZGxlcjogU3RhdGVIYW5kbGVyPFQsIFU+ID0gZnVuY3Rpb24oY3R4KSB7XG4gICAgaWYgKGNob2ljZUlkeCA9PT0gMCkge1xuICAgICAgY3R4Lm1hcmsoKTtcbiAgICB9XG4gICAgaWYgKGNob2ljZUlkeCA+PSBjaG9pY2VzLmxlbmd0aCkge1xuICAgICAgY3R4LmhhbmRsZXJTdGFjay5wb3AoKTtcbiAgICAgIGN0eC5lcnJvciA9ICdPdXQgb2YgY2hvaWNlJztcbiAgICAgIGN0eC5jbGVhck1hcmsoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgY29uc3QgY2hvaWNlID0gY2hvaWNlc1tjaG9pY2VJZHhdO1xuICAgIGlmIChpc0xvb2tBaGVhZCkge1xuICAgICAgaWYgKGlzSGFuZGxlckZhY3RvcnkoY2hvaWNlLmxhKSkge1xuICAgICAgICBjdHguaGFuZGxlclN0YWNrLnB1c2goY2hvaWNlLmxhKCkpO1xuICAgICAgfSBlbHNlIGlmIChjaG9pY2UubGEgPT09IGN0eC5jdXJyVmFsdWUpIHtcblxuICAgICAgfVxuICAgIH0gZWxzZSB7XG5cbiAgICB9XG4gICAgY2hvaWNlSWR4Kys7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG4gIHJldHVybiB7bmFtZSwgaGFuZGxlcn07XG59XG4oY3JlYXRlQnJhbmNoIGFzIEhhbmRsZXJGYWN0b3J5PHVua25vd24sIHVua25vd24+KS5faXNIYW5kbGVyID0gdHJ1ZTtcblxuIl19