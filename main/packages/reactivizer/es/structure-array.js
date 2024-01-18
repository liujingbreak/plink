export class ArrayBufferMgr {
    constructor(definition, isSharedArrayBuffer) {
        this.definition = definition;
        this.isSharedArrayBuffer = isSharedArrayBuffer;
        this.metaByNumByte = new Map();
        this.fieldMetas = new Map();
        this.typedArrays = new Map();
        for (const [field, def] of Object.entries(definition)) {
            let meta;
            switch (def.type) {
                case 'ref':
                case Uint32Array:
                case Int32Array:
                case Float32Array:
                    meta = this.metaByNumByte.get(Uint32Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenOfEntry: 0
                        };
                        this.metaByNumByte.set(Uint32Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenOfEntry, bitLength: Uint32Array.BYTES_PER_ELEMENT });
                    meta.lenOfEntry += def.len;
                    break;
                case Uint8Array:
                case Int8Array:
                    meta = this.metaByNumByte.get(Uint8Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenOfEntry: 0
                        };
                        this.metaByNumByte.set(Uint8Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenOfEntry, bitLength: Uint8Array.BYTES_PER_ELEMENT });
                    meta.lenOfEntry += def.len;
                    break;
                case Uint16Array:
                case Int16Array:
                    meta = this.metaByNumByte.get(Uint16Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenOfEntry: 0
                        };
                        this.metaByNumByte.set(Uint16Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenOfEntry, bitLength: Uint16Array.BYTES_PER_ELEMENT });
                    meta.lenOfEntry += def.len;
                    break;
                case Float64Array:
                case BigInt64Array:
                case BigUint64Array:
                    meta = this.metaByNumByte.get(Float64Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenOfEntry: 0
                        };
                        this.metaByNumByte.set(Float64Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenOfEntry, bitLength: Float64Array.BYTES_PER_ELEMENT });
                    meta.lenOfEntry += def.len;
                    break;
            }
        }
    }
    allocate(length, isSharedArrayBuffer) {
        // allocate ArrayBuffer
        const bufferCons = isSharedArrayBuffer ? SharedArrayBuffer : ArrayBuffer;
        const buffers = [...this.metaByNumByte.entries()].map(([numBytes, meta]) => new bufferCons(meta.lenOfEntry * numBytes * length));
        this.fromArrayBuffers(buffers);
    }
    fromArrayBuffers(buffers) {
        for (const [bytes, meta] of this.metaByNumByte.entries()) {
            // meta.lenOfEntry = this.bytesPerEntry[bytes - 1];
            meta.buf = buffers[bytes - 1];
        }
        // create buffer view: TypedArray
        for (const [field, def] of Object.entries(this.definition)) {
            const constructor = def.type === 'ref' ? Uint32Array : def.type;
            let view = this.typedArrays.get(constructor);
            if (!this.typedArrays.has(constructor)) {
                view = new constructor(this.metaByNumByte.get(constructor.BYTES_PER_ELEMENT).buf);
                this.typedArrays.set(def.type, view);
            }
            this.fieldMetas.get(field).view = view;
        }
    }
    toArrayBuffers() {
        return [1, 2, 4, 8].map(bytes => {
            const meta = this.metaByNumByte.get(bytes);
            return meta ? meta.buf : null;
        }).filter(a => a != null);
    }
    getStructureAt(index) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const outerSelf = this;
        const objectProxy = new Proxy({}, {
            get(_target, prop) {
                return outerSelf.getFieldValue(index, prop);
            },
            set(_target, prop, value) {
                outerSelf.setFieldValue(index, prop, value);
                return true;
            }
        });
        return objectProxy;
    }
    getFieldValue(index, field) {
        const fieldMeta = this.fieldMetas.get(field);
        if (fieldMeta == null)
            throw new Error(`Property ${field} is not defined, check definition: ${JSON.stringify(this.definition)}`);
        const { lenOfEntry } = this.metaByNumByte.get(fieldMeta.bitLength);
        return fieldMeta.view[index * lenOfEntry + fieldMeta.offset];
    }
    setFieldValue(index, field, ...value) {
        const fieldMeta = this.fieldMetas.get(field);
        if (fieldMeta == null)
            throw new Error(`Property ${field} is not defined, check definition: ${JSON.stringify(this.definition)}`);
        const { lenOfEntry } = this.metaByNumByte.get(fieldMeta.bitLength);
        fieldMeta.view.set(value, index * lenOfEntry + fieldMeta.offset);
    }
}
//# sourceMappingURL=structure-array.js.map