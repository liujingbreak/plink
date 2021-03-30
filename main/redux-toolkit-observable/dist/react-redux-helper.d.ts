import { InferableComponentEnhancerWithProps } from 'react-redux';
import { StateFactory } from './redux-toolkit-observable';
export declare type InjectedCompPropsType<ConnectHOC> = (ConnectHOC extends InferableComponentEnhancerWithProps<infer TInjectedProps, any> ? TInjectedProps : {}) & (ConnectHOC extends InferableComponentEnhancerWithProps<any, infer TOwnProps> ? TOwnProps : {});
export declare function useStoreOfStateFactory(stateFactory: StateFactory): import("@reduxjs/toolkit").EnhancedStore<any, {
    payload: any;
    type: string;
}, readonly import("redux").Middleware<{}, any, import("redux").Dispatch<import("redux").AnyAction>>[]> | undefined;
