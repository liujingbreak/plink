type TypedArrayType = Float32Array | Float64Array | Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | BigInt64Array | BigUint64Array;

interface TypedArrayConstructor<T extends TypedArrayType> {
  new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
  BYTES_PER_ELEMENT: number;
}

export type StructureArrayEntryDef<T extends TypedArrayType> = {
  type: TypedArrayConstructor<T> | 'ref';
  len?: number;
};

const ALL_BYTES_OF_ARRAY = [1, 2, 4, 8];

type MetaOfBytes = {
  lenPerEntry: number;
  buf: SharedArrayBuffer | ArrayBuffer;
};

type FieldMeta = {
  /** index offset in underneath TypedArray */
  offset: number;
  /** <TypedArray>.BYTES_PER_ELEMENT */
  bitLength: number;
  view?: TypedArrayType;
  /** number of values (consider as array if `len` is bigger than 1 */
  len: number;
};

export type StructureTypeOfDef<R extends {[key: string]: StructureArrayEntryDef<TypedArrayType>}> = {
  [K in keyof R]: R[K]['len'] extends 1 ?
    number :
    R[K]['len'] extends number ?
      (R[K]['type'] extends TypedArrayConstructor<infer T> ? T : unknown) :
      number;
};

export class ArrayBufferMgr<R extends Record<string, StructureArrayEntryDef<TypedArrayType>>> {
  private metaByNumByte = new Map<number, MetaOfBytes>();
  private fieldMetas = new Map<string, FieldMeta>();
  private typedArrays = new Map<StructureArrayEntryDef<any>['type'], TypedArrayType>();

  constructor(protected definition: R) {
    for (const [field, def] of Object.entries(definition)) {
      let meta: MetaOfBytes | undefined;
      switch (def.type) {
        case 'ref':
        case Uint32Array:
        case Int32Array:
        case Float32Array:
          meta = this.metaByNumByte.get(Uint32Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenPerEntry: 0
            } as MetaOfBytes;
            this.metaByNumByte.set(Uint32Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenPerEntry, bitLength: Uint32Array.BYTES_PER_ELEMENT, len: def.len ?? 1});
          meta.lenPerEntry += def.len ?? 1;
          break;
        case Uint8Array:
        case Int8Array:
          meta = this.metaByNumByte.get(Uint8Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenPerEntry: 0
            } as MetaOfBytes;
            this.metaByNumByte.set(Uint8Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenPerEntry, bitLength: Uint8Array.BYTES_PER_ELEMENT, len: def.len ?? 1});
          meta.lenPerEntry += def.len ?? 1;
          break;
        case Uint16Array:
        case Int16Array:
          meta = this.metaByNumByte.get(Uint16Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenPerEntry: 0
            } as MetaOfBytes;
            this.metaByNumByte.set(Uint16Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenPerEntry, bitLength: Uint16Array.BYTES_PER_ELEMENT, len: def.len ?? 1});
          meta.lenPerEntry += def.len ?? 1;
          break;
        case Float64Array:
        case BigInt64Array:
        case BigUint64Array:
          meta = this.metaByNumByte.get(Float64Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenPerEntry: 0
            } as MetaOfBytes;
            this.metaByNumByte.set(Float64Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenPerEntry, bitLength: Float64Array.BYTES_PER_ELEMENT, len: def.len ?? 1});
          meta.lenPerEntry += def.len ?? 1;
          break;
      }
    }
  }

  /** Create ArrayBuffer or SharedArrayBuffer for current instantce */
  allocate(length: number, isSharedArrayBuffer: boolean) {
    // allocate ArrayBuffer
    const bufferCons = isSharedArrayBuffer ? SharedArrayBuffer : ArrayBuffer;
    const buffers = [undefined, undefined, undefined, undefined] as (ArrayBuffer | SharedArrayBuffer | undefined)[];
    for (const [numBytes, meta] of this.metaByNumByte.entries()) {
      buffers[Math.log2(numBytes)] = new bufferCons(meta.lenPerEntry * numBytes * length);
    }
    this.fromArrayBuffers(buffers);
  }

  /** load existing ArrayBuffer or SharedArrayBuffer to current instantce */
  fromArrayBuffers(buffers: Array<ArrayBuffer | SharedArrayBuffer | undefined>) {
    for (const [bytes, meta] of this.metaByNumByte.entries()) {
      // meta.lenPerEntry = this.bytesPerEntry[bytes - 1];
      meta.buf = buffers[Math.log2(bytes)] as (ArrayBuffer | SharedArrayBuffer);
    }

    // create buffer view: TypedArray
    for (const [field, def] of Object.entries(this.definition)) {
      const constructor = def.type === 'ref' ? Uint32Array : def.type;
      let view = this.typedArrays.get(constructor);
      if (!this.typedArrays.has(constructor)) {
        view = new constructor(this.metaByNumByte.get(constructor.BYTES_PER_ELEMENT)!.buf);
        this.typedArrays.set(def.type, view);
      }
      this.fieldMetas.get(field)!.view = view!;
    }
  }

  toArrayBuffers(): (ArrayBuffer | SharedArrayBuffer | undefined)[] {
    return ALL_BYTES_OF_ARRAY.map(bytes => {
      const meta = this.metaByNumByte.get(bytes);
      return meta ? meta.buf : undefined;
    });
  }

  getStructureAt(index: number): StructureTypeOfDef<R> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const outerSelf = this;
    const objectProxy = new Proxy<StructureTypeOfDef<R>>({} as StructureTypeOfDef<R>, {
      get(_target, prop) {
        return outerSelf.getFieldValue(index, prop as string);
      },
      set(_target, prop, value) {
        outerSelf.setFieldValue(index, prop as string, value);
        return true;
      }
    });
    return objectProxy;
  }

  getFieldValue<K extends keyof R>(index: number, field: K): StructureTypeOfDef<R>[K] {
    const fieldMeta = this.fieldMetas.get(field as string);
    if (fieldMeta == null)
      throw new Error(`Property ${field as string} is not defined, check definition: ${JSON.stringify(this.definition)}`);

    const {lenPerEntry} = this.metaByNumByte.get(fieldMeta.bitLength)!;
    if (fieldMeta.view == null) {
      throw new Error('The underneath ArrayBuffer or SharedArrayBuffer is not loaded or created');
    }

    const entryOffset = index * lenPerEntry + fieldMeta.offset;
    return (fieldMeta.len === 1 ?
      fieldMeta.view[entryOffset] :
      fieldMeta.view.subarray(entryOffset, entryOffset + fieldMeta.len)) as StructureTypeOfDef<R>[K];
  }

  setFieldValue(index: number, field: string, value: number | bigint | ArrayLike<number | bigint>) {
    const fieldMeta = this.fieldMetas.get(field);
    if (fieldMeta == null)
      throw new Error(`Property ${field} is not defined, check definition: ${JSON.stringify(this.definition)}`);
    const {lenPerEntry} = this.metaByNumByte.get(fieldMeta.bitLength)!;
    if (fieldMeta.view == null) {
      throw new Error('The underneath ArrayBuffer or SharedArrayBuffer is not loaded or created');
    }

    const entryOffset = index * lenPerEntry + fieldMeta.offset;
    if (fieldMeta.len === 1)
      fieldMeta.view[entryOffset] = value as number;
    else
      (fieldMeta.view as Uint8Array).set(value as number[], entryOffset);
  }
}

