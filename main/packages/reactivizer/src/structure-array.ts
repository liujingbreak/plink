type TypedArrayType = Float32Array | Float64Array | Uint8Array | Uint16Array | Uint32Array | Int8Array | Int16Array | Int32Array | BigInt64Array | BigUint64Array;

interface TypedArrayConstructor<T extends TypedArrayType> {
  new (buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
  BYTES_PER_ELEMENT: number;
}

export type StructureArrayEntryDef<T extends TypedArrayType> = {
  type: TypedArrayConstructor<T> | 'ref';
  len: number;
};

type MetaOfBytes<S extends SharedArrayBuffer | ArrayBuffer> = {
  lenOfEntry: number;
  buf: S;
};

type FieldMeta = {
  offset: number;
  bitLength: number;
  view: TypedArrayType;
};

export class ArrayBufferMgr<S extends SharedArrayBuffer | ArrayBuffer> {
  private metaByNumByte = new Map<number, MetaOfBytes<S>>();
  private fieldMetas = new Map<string, FieldMeta>();
  private typedArrays = new Map<StructureArrayEntryDef<any>['type'], TypedArrayType>();

  constructor(protected definition: Record<string, StructureArrayEntryDef<TypedArrayType>>,
    public isSharedArrayBuffer: S extends SharedArrayBuffer ? true : false
  ) {
    for (const [field, def] of Object.entries(definition)) {
      let meta: MetaOfBytes<S> | undefined;
      switch (def.type) {
        case 'ref':
        case Uint32Array:
        case Int32Array:
        case Float32Array:
          meta = this.metaByNumByte.get(Uint32Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenOfEntry: 0
            } as MetaOfBytes<S>;
            this.metaByNumByte.set(Uint32Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenOfEntry, bitLength: Uint32Array.BYTES_PER_ELEMENT} as FieldMeta);
          meta.lenOfEntry += def.len;
          break;
        case Uint8Array:
        case Int8Array:
          meta = this.metaByNumByte.get(Uint8Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenOfEntry: 0
            } as MetaOfBytes<S>;
            this.metaByNumByte.set(Uint8Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenOfEntry, bitLength: Uint8Array.BYTES_PER_ELEMENT} as FieldMeta);
          meta.lenOfEntry += def.len;
          break;
        case Uint16Array:
        case Int16Array:
          meta = this.metaByNumByte.get(Uint16Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenOfEntry: 0
            } as MetaOfBytes<S>;
            this.metaByNumByte.set(Uint16Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenOfEntry, bitLength: Uint16Array.BYTES_PER_ELEMENT} as FieldMeta);
          meta.lenOfEntry += def.len;
          break;
        case Float64Array:
        case BigInt64Array:
        case BigUint64Array:
          meta = this.metaByNumByte.get(Float64Array.BYTES_PER_ELEMENT);
          if (meta == null) {
            meta = {
              lenOfEntry: 0
            } as MetaOfBytes<S>;
            this.metaByNumByte.set(Float64Array.BYTES_PER_ELEMENT, meta);
          }
          this.fieldMetas.set(field, {offset: meta.lenOfEntry, bitLength: Float64Array.BYTES_PER_ELEMENT} as FieldMeta);
          meta.lenOfEntry += def.len;
          break;
      }
    }
  }

  allocate(length: number, isSharedArrayBuffer: S extends SharedArrayBuffer ? true : false) {
    // allocate ArrayBuffer
    const bufferCons = isSharedArrayBuffer ? SharedArrayBuffer : ArrayBuffer;
    const buffers = [...this.metaByNumByte.entries()].map(([numBytes, meta]) =>
      new bufferCons(meta.lenOfEntry * numBytes * length));
    this.fromArrayBuffers(buffers);
  }

  fromArrayBuffers(buffers: Array<ArrayBuffer | SharedArrayBuffer>) {
    for (const [bytes, meta] of this.metaByNumByte.entries()) {
      // meta.lenOfEntry = this.bytesPerEntry[bytes - 1];
      meta.buf = buffers[bytes - 1] as S;
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

  toArrayBuffers(): S[] {
    return [1, 2, 4, 8].map(bytes => {
      const meta = this.metaByNumByte.get(bytes);
      return meta ? meta.buf : null;
    }).filter(a => a != null) as S[];
  }

  getStructureAt(index: number) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const outerSelf = this;
    const objectProxy = new Proxy({}, {
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

  getFieldValue(index: number, field: string) {
    const fieldMeta = this.fieldMetas.get(field);
    if (fieldMeta == null)
      throw new Error(`Property ${field} is not defined, check definition: ${JSON.stringify(this.definition)}`);

    const {lenOfEntry} = this.metaByNumByte.get(fieldMeta.bitLength)!;
    return fieldMeta.view[index * lenOfEntry + fieldMeta.offset];
  }

  setFieldValue(index: number, field: string, ...value: any[]) {
    const fieldMeta = this.fieldMetas.get(field);
    if (fieldMeta == null)
      throw new Error(`Property ${field} is not defined, check definition: ${JSON.stringify(this.definition)}`);
    const {lenOfEntry} = this.metaByNumByte.get(fieldMeta.bitLength)!;
    fieldMeta.view.set(value, index * lenOfEntry + fieldMeta.offset);
  }
}

