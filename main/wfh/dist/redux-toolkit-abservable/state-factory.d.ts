import { StateFactory, ofPayloadAction } from './redux-toolkit-observable';
import { Injector } from '@angular/core';
export declare const stateFactory: StateFactory;
export declare let injector: Injector;
export { ofPayloadAction };
export declare function setModuleInject(_injector: Injector): void;
export declare function getModuleInjector(): any;
