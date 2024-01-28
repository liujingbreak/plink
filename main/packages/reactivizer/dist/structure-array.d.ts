type TypedArrayType = Float32Array | Float64Array | Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | BigInt64Array | BigUint64Array;
interface TypedArrayConstructor<T extends TypedArrayType> {
    new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
    BYTES_PER_ELEMENT: number;
}
export type StructureArrayEntryDef<T extends TypedArrayType> = {
    type: TypedArrayConstructor<T> | 'ref';
    len?: number;
};
export type StructureTypeOfDef<R extends {
    [key: string]: StructureArrayEntryDef<TypedArrayType>;
}> = {
    [K in keyof R]: R[K]['len'] extends 1 ? number : R[K]['len'] extends number ? (R[K]['type'] extends TypedArrayConstructor<infer T> ? T : unknown) : number;
};
export declare class ArrayBufferMgr<R extends Record<string, StructureArrayEntryDef<TypedArrayType>>> {
    protected definition: R;
    private metaByNumByte;
    private fieldMetas;
    private typedArrays;
    constructor(definition: R);
    /** Create ArrayBuffer or SharedArrayBuffer for current instantce */
    allocate(length: number, isSharedArrayBuffer: boolean): void;
    /** load existing ArrayBuffer or SharedArrayBuffer to current instantce */
    fromArrayBuffers(buffers: Array<ArrayBuffer | SharedArrayBuffer | undefined>): void;
    toArrayBuffers(): (ArrayBuffer | SharedArrayBuffer | undefined)[];
    getStructureAt(index: number): StructureTypeOfDef<R>;
    getFieldValue<K extends keyof R>(index: number, field: K): StructureTypeOfDef<R>[K];
    setFieldValue(index: number, field: string, value: number | bigint | ArrayLike<number | bigint>): void;
}
export {};
