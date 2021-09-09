/**
 * The place to store Redux-toolkit unfriendly objects
 *
 * 1. When we design state structure, remember immerJS (depended by Redux-toolkt) does not perform well on
 * complicated object,
 * ideally we only put "data" in Redux store, including string, number, boolean, Map, Set, and array/object of them,
 * ImmerJS does recursively freezing and proxying job on them.
 *
 * So things which are not unfriendly to Redux store are: Complex(huge) Object, DOM objects, browser window related objects,
 * framework's component object, Node.js object like Buffer, unknown 3rd-party library object...
 *
 * 2. Redux is framework agnostic, meaning it can be used cross different rendering system. If we want to reuse some pieces
 * of Redux logic, these pieces should not contain any framework or renderring system related object in state's structure.
 *
 * In these cases, this "resource-store" is designed to keep those Redux unfriendly things.
 *
 * The save() function returns a primary type "Ref", which can be safely saved in Redux-toolkit store as a key maps to
 * actual resource object.
 * Use the Ref to get or release/delete actual resource object.
 *
 * It is basically implemented with a Map, and with a Generic Type information for each item inside it.
 */
export declare type ResourceRef<T> = string;
export declare class ResourceStore {
    private static REF_SEED;
    dataMap: {
        [key: string]: any;
    };
    save<T>(object: T): ResourceRef<T>;
    get<T>(reference: ResourceRef<T>): any;
    delete<T>(reference: ResourceRef<T>): any;
}
