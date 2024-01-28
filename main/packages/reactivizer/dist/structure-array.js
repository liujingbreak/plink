"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayBufferMgr = void 0;
const ALL_BYTES_OF_ARRAY = [1, 2, 4, 8];
class ArrayBufferMgr {
    constructor(definition) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        this.definition = definition;
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
                            lenPerEntry: 0
                        };
                        this.metaByNumByte.set(Uint32Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenPerEntry, bitLength: Uint32Array.BYTES_PER_ELEMENT, len: (_a = def.len) !== null && _a !== void 0 ? _a : 1 });
                    meta.lenPerEntry += (_b = def.len) !== null && _b !== void 0 ? _b : 1;
                    break;
                case Uint8Array:
                case Int8Array:
                    meta = this.metaByNumByte.get(Uint8Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenPerEntry: 0
                        };
                        this.metaByNumByte.set(Uint8Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenPerEntry, bitLength: Uint8Array.BYTES_PER_ELEMENT, len: (_c = def.len) !== null && _c !== void 0 ? _c : 1 });
                    meta.lenPerEntry += (_d = def.len) !== null && _d !== void 0 ? _d : 1;
                    break;
                case Uint16Array:
                case Int16Array:
                    meta = this.metaByNumByte.get(Uint16Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenPerEntry: 0
                        };
                        this.metaByNumByte.set(Uint16Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenPerEntry, bitLength: Uint16Array.BYTES_PER_ELEMENT, len: (_e = def.len) !== null && _e !== void 0 ? _e : 1 });
                    meta.lenPerEntry += (_f = def.len) !== null && _f !== void 0 ? _f : 1;
                    break;
                case Float64Array:
                case BigInt64Array:
                case BigUint64Array:
                    meta = this.metaByNumByte.get(Float64Array.BYTES_PER_ELEMENT);
                    if (meta == null) {
                        meta = {
                            lenPerEntry: 0
                        };
                        this.metaByNumByte.set(Float64Array.BYTES_PER_ELEMENT, meta);
                    }
                    this.fieldMetas.set(field, { offset: meta.lenPerEntry, bitLength: Float64Array.BYTES_PER_ELEMENT, len: (_g = def.len) !== null && _g !== void 0 ? _g : 1 });
                    meta.lenPerEntry += (_h = def.len) !== null && _h !== void 0 ? _h : 1;
                    break;
            }
        }
    }
    /** Create ArrayBuffer or SharedArrayBuffer for current instantce */
    allocate(length, isSharedArrayBuffer) {
        // allocate ArrayBuffer
        const bufferCons = isSharedArrayBuffer ? SharedArrayBuffer : ArrayBuffer;
        const buffers = [undefined, undefined, undefined, undefined];
        for (const [numBytes, meta] of this.metaByNumByte.entries()) {
            buffers[Math.log2(numBytes)] = new bufferCons(meta.lenPerEntry * numBytes * length);
        }
        this.fromArrayBuffers(buffers);
    }
    /** load existing ArrayBuffer or SharedArrayBuffer to current instantce */
    fromArrayBuffers(buffers) {
        for (const [bytes, meta] of this.metaByNumByte.entries()) {
            // meta.lenPerEntry = this.bytesPerEntry[bytes - 1];
            meta.buf = buffers[Math.log2(bytes)];
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
        return ALL_BYTES_OF_ARRAY.map(bytes => {
            const meta = this.metaByNumByte.get(bytes);
            return meta ? meta.buf : undefined;
        });
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
        const { lenPerEntry } = this.metaByNumByte.get(fieldMeta.bitLength);
        if (fieldMeta.view == null) {
            throw new Error('The underneath ArrayBuffer or SharedArrayBuffer is not loaded or created');
        }
        const entryOffset = index * lenPerEntry + fieldMeta.offset;
        return (fieldMeta.len === 1 ?
            fieldMeta.view[entryOffset] :
            fieldMeta.view.subarray(entryOffset, entryOffset + fieldMeta.len));
    }
    setFieldValue(index, field, value) {
        const fieldMeta = this.fieldMetas.get(field);
        if (fieldMeta == null)
            throw new Error(`Property ${field} is not defined, check definition: ${JSON.stringify(this.definition)}`);
        const { lenPerEntry } = this.metaByNumByte.get(fieldMeta.bitLength);
        if (fieldMeta.view == null) {
            throw new Error('The underneath ArrayBuffer or SharedArrayBuffer is not loaded or created');
        }
        const entryOffset = index * lenPerEntry + fieldMeta.offset;
        if (fieldMeta.len === 1)
            fieldMeta.view[entryOffset] = value;
        else
            fieldMeta.view.set(value, entryOffset);
    }
}
exports.ArrayBufferMgr = ArrayBufferMgr;
//# sourceMappingURL=structure-array.js.map