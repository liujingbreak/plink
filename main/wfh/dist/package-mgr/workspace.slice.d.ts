import { PayloadAction, InferActionsType } from '../../../redux-toolkit-observable/dist/redux-toolkit-observable';
import { Observable } from 'rxjs';
/** We have to explicityly export Observable, for exporting getStore() function, otherwise Typescript will report
 * "This is likely not portable, a type annotation is necessary"
 * https://github.com/microsoft/TypeScript/issues/30858
 */
export { Observable };
export interface PakageVersionsState {
    foo: boolean;
}
declare const sliceOpt: {
    name: string;
    initialState: PakageVersionsState;
    reducers: {
        exampleAction(s: PakageVersionsState, { payload }: PayloadAction<boolean>): void;
    };
};
export declare const actionDispatcher: InferActionsType<typeof sliceOpt>;
export declare function getState(): PakageVersionsState;
export declare function getStore(): Observable<PakageVersionsState>;
