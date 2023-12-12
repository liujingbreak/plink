type TypedArrayType = Float32Array | Float64Array | Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | BigInt64Array | BigUint64Array;
interface TypedArrayConstructor<T extends TypedArrayType> {
    new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
    BYTES_PER_ELEMENT: number;
}
export type StructureArrayEntryDef<T extends TypedArrayType> = {
    type: TypedArrayConstructor<T> | 'ref';
    len: number;
};
export declare class ArrayBufferMgr<S extends SharedArrayBuffer | ArrayBuffer> {
    protected definition: Record<string, StructureArrayEntryDef<TypedArrayType>>;
    isSharedArrayBuffer: S extends SharedArrayBuffer ? true : false;
    private metaByNumByte;
    private fieldMetas;
    private typedArrays;
    constructor(definition: Record<string, StructureArrayEntryDef<TypedArrayType>>, isSharedArrayBuffer: S extends SharedArrayBuffer ? true : false);
    allocate(length: number, isSharedArrayBuffer: S extends SharedArrayBuffer ? true : false): void;
    fromArrayBuffers(buffers: Array<ArrayBuffer | SharedArrayBuffer>): void;
    toArrayBuffers(): S[];
    getStructureAt(index: number): {};
    getFieldValue(index: number, field: string): number | bigint;
    setFieldValue(index: number, field: string, ...value: any[]): void;
}
export {};
