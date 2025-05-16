import { SingleActionFactory, CreateOptsOfFac, BaseReactorFactory, SimplexReactorOfFac } from '../index.js';
interface BaseActions {
    msg1(greeting: string): SingleActionFactory;
    res1(hello: string): SingleActionFactory;
    msgX(v: string): SingleActionFactory;
    onMsgX(reciever: string): SingleActionFactory;
}
declare const baseFac: BaseReactorFactory<BaseActions, readonly ["res1", "msgX"], import("../base-types.js").CoreOptions<BaseActions>, [greeting: string]>;
interface DerivedActions {
    msg2(greeting: string): SingleActionFactory;
    res2(hello: string): SingleActionFactory;
}
declare const derivedFac: import("../reactor-factory.js").DerivedReactorFactory<BaseActions & DerivedActions, ("res1" | "msgX" | "res2")[], [greeting: string], import("../base-types.js").CoreOptions<BaseActions & DerivedActions>, []>;
interface DerivedActions2 {
    msg3(greeting: string): SingleActionFactory;
    res3(hello: string): SingleActionFactory;
}
declare const derivedFac2: import("../reactor-factory.js").DerivedReactorFactory<BaseActions & DerivedActions & DerivedActions2, ("res1" | "msgX" | "res2" | "res3")[], [], import("../base-types.js").CoreOptions<BaseActions & DerivedActions & DerivedActions2>, []>;
export type BaseSimplexReactor = SimplexReactorOfFac<typeof baseFac>;
export type DerivedSimplexReactor = SimplexReactorOfFac<typeof derivedFac>;
export type DerivedSimplexReactor2 = SimplexReactorOfFac<typeof derivedFac2>;
export type OptsOfDerivedFac2 = CreateOptsOfFac<typeof derivedFac2>;
export {};
