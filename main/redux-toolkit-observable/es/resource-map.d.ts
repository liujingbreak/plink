import { WritableDraft } from 'immer/dist/internal';
export interface ResourceKey<T> {
}
/**
 * The place to store Redux-toolkit unfriendly objects
 *
 * 1. When we design state structure, remember immerJS (depended by Redux-toolkt) does not perform well on
 * complicated object,
 * ideally we only put "data" in Redux store, including string, number, boolean, Map, Set, and array/object of them,
 * ImmerJS does recursively freezing and proxying job on them.
 *
 * So things which are not unfriendly to Redux store are: Complex(huge) Object, functions, DOM objects, browser window related objects,
 * framework's component object, Node.js object like Buffer, unknown 3rd-party library object...
 *
 * 2. Redux is framework agnostic, meaning it can be used cross different rendering system. If we want to reuse some pieces
 * of Redux logic, these pieces should not contain any framework or renderring system related object in state's structure.
 *
 * In these cases, this "resource-store" is designed to keep those Redux unfriendly things.
 *
 * The save() function returns a primary type "ResourceKey", which can be safely saved in Redux-toolkit store as a key maps to
 * actual resource object.
 * Use the Ref to get or release/delete actual resource object.
 *
 * It is basically implemented with a Map, and with a Generic Type information for each item inside it.
 */
export declare class ResourceMap {
    private static REF_SEED;
    dataMap: {
        [key: string]: any;
    };
    set<T>(reference: ResourceKey<T> | null | undefined, object: T): ResourceKey<T>;
    add<T>(object: T): ResourceKey<T>;
    get<T>(reference: ResourceKey<T> | WritableDraft<ResourceKey<T>>): T;
    delete<T>(reference: ResourceKey<T> | WritableDraft<ResourceKey<T>>): T;
}
