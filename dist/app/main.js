/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 7320:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.output = exports.exists = exports.hash = exports.bytes = exports.bool = exports.number = void 0;
function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
exports.number = number;
function bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`Expected boolean, not ${b}`);
}
exports.bool = bool;
function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new Error('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
exports.bytes = bytes;
function hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(hash.outputLen);
    number(hash.blockLen);
}
exports.hash = hash;
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
exports.exists = exists;
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
exports.output = output;
const assert = {
    number,
    bool,
    bytes,
    hash,
    exists,
    output,
};
exports["default"] = assert;
//# sourceMappingURL=_assert.js.map

/***/ }),

/***/ 7505:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SHA2 = void 0;
const _assert_js_1 = __webpack_require__(7320);
const utils_js_1 = __webpack_require__(8089);
// Polyfill for Safari 14
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class SHA2 extends utils_js_1.Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = (0, utils_js_1.createView)(this.buffer);
    }
    update(data) {
        _assert_js_1.default.exists(this);
        const { view, buffer, blockLen } = this;
        data = (0, utils_js_1.toBytes)(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = (0, utils_js_1.createView)(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        _assert_js_1.default.exists(this);
        _assert_js_1.default.output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = (0, utils_js_1.createView)(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
exports.SHA2 = SHA2;
//# sourceMappingURL=_sha2.js.map

/***/ }),

/***/ 6873:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.add = exports.toBig = exports.split = exports.fromBig = void 0;
const U32_MASK64 = BigInt(2 ** 32 - 1);
const _32n = BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
exports.fromBig = fromBig;
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
exports.split = split;
const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
exports.toBig = toBig;
// for Shift in [0, 32)
const shrSH = (h, l, s) => h >>> s;
const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in [1, 32)
const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (h, l) => l;
const rotr32L = (h, l) => h;
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
// Removing "export" has 5% perf penalty -_-
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
exports.add = add;
// Addition with more than 2 elements
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
// prettier-ignore
const u64 = {
    fromBig, split, toBig: exports.toBig,
    shrSH, shrSL,
    rotrSH, rotrSL, rotrBH, rotrBL,
    rotr32H, rotr32L,
    rotlSH, rotlSL, rotlBH, rotlBL,
    add, add3L, add3H, add4L, add4H, add5H, add5L,
};
exports["default"] = u64;
//# sourceMappingURL=_u64.js.map

/***/ }),

/***/ 1945:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.crypto = void 0;
exports.crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
//# sourceMappingURL=crypto.js.map

/***/ }),

/***/ 9569:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hmac = exports.HMAC = void 0;
const _assert_js_1 = __webpack_require__(7320);
const utils_js_1 = __webpack_require__(8089);
// HMAC (RFC 2104)
class HMAC extends utils_js_1.Hash {
    constructor(hash, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        _assert_js_1.default.hash(hash);
        const key = (0, utils_js_1.toBytes)(_key);
        this.iHash = hash.create();
        if (typeof this.iHash.update !== 'function')
            throw new Error('Expected instance of class which extends utils.Hash');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        _assert_js_1.default.exists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        _assert_js_1.default.exists(this);
        _assert_js_1.default.bytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
exports.HMAC = HMAC;
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
exports.hmac = hmac;
exports.hmac.create = (hash, key) => new HMAC(hash, key);
//# sourceMappingURL=hmac.js.map

/***/ }),

/***/ 9023:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.pbkdf2Async = exports.pbkdf2 = void 0;
const _assert_js_1 = __webpack_require__(7320);
const hmac_js_1 = __webpack_require__(9569);
const utils_js_1 = __webpack_require__(8089);
// Common prologue and epilogue for sync/async functions
function pbkdf2Init(hash, _password, _salt, _opts) {
    _assert_js_1.default.hash(hash);
    const opts = (0, utils_js_1.checkOpts)({ dkLen: 32, asyncTick: 10 }, _opts);
    const { c, dkLen, asyncTick } = opts;
    _assert_js_1.default.number(c);
    _assert_js_1.default.number(dkLen);
    _assert_js_1.default.number(asyncTick);
    if (c < 1)
        throw new Error('PBKDF2: iterations (c) should be >= 1');
    const password = (0, utils_js_1.toBytes)(_password);
    const salt = (0, utils_js_1.toBytes)(_salt);
    // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
    const DK = new Uint8Array(dkLen);
    // U1 = PRF(Password, Salt + INT_32_BE(i))
    const PRF = hmac_js_1.hmac.create(hash, password);
    const PRFSalt = PRF._cloneInto().update(salt);
    return { c, dkLen, asyncTick, DK, PRF, PRFSalt };
}
function pbkdf2Output(PRF, PRFSalt, DK, prfW, u) {
    PRF.destroy();
    PRFSalt.destroy();
    if (prfW)
        prfW.destroy();
    u.fill(0);
    return DK;
}
/**
 * PBKDF2-HMAC: RFC 2898 key derivation function
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated
 * @param salt - cryptographic salt
 * @param opts - {c, dkLen} where c is work factor and dkLen is output message size
 */
function pbkdf2(hash, password, salt, opts) {
    const { c, dkLen, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW; // Working copy
    const arr = new Uint8Array(4);
    const view = (0, utils_js_1.createView)(arr);
    const u = new Uint8Array(PRF.outputLen);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
        // Ti = F(Password, Salt, c, i)
        const Ti = DK.subarray(pos, pos + PRF.outputLen);
        view.setInt32(0, ti, false);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
        Ti.set(u.subarray(0, Ti.length));
        for (let ui = 1; ui < c; ui++) {
            // Uc = PRF(Password, Uc−1)
            PRF._cloneInto(prfW).update(u).digestInto(u);
            for (let i = 0; i < Ti.length; i++)
                Ti[i] ^= u[i];
        }
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
exports.pbkdf2 = pbkdf2;
async function pbkdf2Async(hash, password, salt, opts) {
    const { c, dkLen, asyncTick, DK, PRF, PRFSalt } = pbkdf2Init(hash, password, salt, opts);
    let prfW; // Working copy
    const arr = new Uint8Array(4);
    const view = (0, utils_js_1.createView)(arr);
    const u = new Uint8Array(PRF.outputLen);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += PRF.outputLen) {
        // Ti = F(Password, Salt, c, i)
        const Ti = DK.subarray(pos, pos + PRF.outputLen);
        view.setInt32(0, ti, false);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        (prfW = PRFSalt._cloneInto(prfW)).update(arr).digestInto(u);
        Ti.set(u.subarray(0, Ti.length));
        await (0, utils_js_1.asyncLoop)(c - 1, asyncTick, (i) => {
            // Uc = PRF(Password, Uc−1)
            PRF._cloneInto(prfW).update(u).digestInto(u);
            for (let i = 0; i < Ti.length; i++)
                Ti[i] ^= u[i];
        });
    }
    return pbkdf2Output(PRF, PRFSalt, DK, prfW, u);
}
exports.pbkdf2Async = pbkdf2Async;
//# sourceMappingURL=pbkdf2.js.map

/***/ }),

/***/ 3061:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sha224 = exports.sha256 = void 0;
const _sha2_js_1 = __webpack_require__(7505);
const utils_js_1 = __webpack_require__(8089);
// Choice: a ? b : c
const Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = new Uint32Array(64);
class SHA256 extends _sha2_js_1.SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, utils_js_1.rotr)(W15, 7) ^ (0, utils_js_1.rotr)(W15, 18) ^ (W15 >>> 3);
            const s1 = (0, utils_js_1.rotr)(W2, 17) ^ (0, utils_js_1.rotr)(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = (0, utils_js_1.rotr)(E, 6) ^ (0, utils_js_1.rotr)(E, 11) ^ (0, utils_js_1.rotr)(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = (0, utils_js_1.rotr)(A, 2) ^ (0, utils_js_1.rotr)(A, 13) ^ (0, utils_js_1.rotr)(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
// Constants from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
class SHA224 extends SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
exports.sha256 = (0, utils_js_1.wrapConstructor)(() => new SHA256());
exports.sha224 = (0, utils_js_1.wrapConstructor)(() => new SHA224());
//# sourceMappingURL=sha256.js.map

/***/ }),

/***/ 6262:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.sha384 = exports.sha512_256 = exports.sha512_224 = exports.sha512 = exports.SHA512 = void 0;
const _sha2_js_1 = __webpack_require__(7505);
const _u64_js_1 = __webpack_require__(6873);
const utils_js_1 = __webpack_require__(8089);
// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
// prettier-ignore
const [SHA512_Kh, SHA512_Kl] = _u64_js_1.default.split([
    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
].map(n => BigInt(n)));
// Temporary buffer, not used to store anything between runs
const SHA512_W_H = new Uint32Array(80);
const SHA512_W_L = new Uint32Array(80);
class SHA512 extends _sha2_js_1.SHA2 {
    constructor() {
        super(128, 64, 16, false);
        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
        // Also looks cleaner and easier to verify with spec.
        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x6a09e667 | 0;
        this.Al = 0xf3bcc908 | 0;
        this.Bh = 0xbb67ae85 | 0;
        this.Bl = 0x84caa73b | 0;
        this.Ch = 0x3c6ef372 | 0;
        this.Cl = 0xfe94f82b | 0;
        this.Dh = 0xa54ff53a | 0;
        this.Dl = 0x5f1d36f1 | 0;
        this.Eh = 0x510e527f | 0;
        this.El = 0xade682d1 | 0;
        this.Fh = 0x9b05688c | 0;
        this.Fl = 0x2b3e6c1f | 0;
        this.Gh = 0x1f83d9ab | 0;
        this.Gl = 0xfb41bd6b | 0;
        this.Hh = 0x5be0cd19 | 0;
        this.Hl = 0x137e2179 | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32((offset += 4));
        }
        for (let i = 16; i < 80; i++) {
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = _u64_js_1.default.rotrSH(W15h, W15l, 1) ^ _u64_js_1.default.rotrSH(W15h, W15l, 8) ^ _u64_js_1.default.shrSH(W15h, W15l, 7);
            const s0l = _u64_js_1.default.rotrSL(W15h, W15l, 1) ^ _u64_js_1.default.rotrSL(W15h, W15l, 8) ^ _u64_js_1.default.shrSL(W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = _u64_js_1.default.rotrSH(W2h, W2l, 19) ^ _u64_js_1.default.rotrBH(W2h, W2l, 61) ^ _u64_js_1.default.shrSH(W2h, W2l, 6);
            const s1l = _u64_js_1.default.rotrSL(W2h, W2l, 19) ^ _u64_js_1.default.rotrBL(W2h, W2l, 61) ^ _u64_js_1.default.shrSL(W2h, W2l, 6);
            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
            const SUMl = _u64_js_1.default.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = _u64_js_1.default.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for (let i = 0; i < 80; i++) {
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = _u64_js_1.default.rotrSH(Eh, El, 14) ^ _u64_js_1.default.rotrSH(Eh, El, 18) ^ _u64_js_1.default.rotrBH(Eh, El, 41);
            const sigma1l = _u64_js_1.default.rotrSL(Eh, El, 14) ^ _u64_js_1.default.rotrSL(Eh, El, 18) ^ _u64_js_1.default.rotrBL(Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
            const CHIl = (El & Fl) ^ (~El & Gl);
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = _u64_js_1.default.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = _u64_js_1.default.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = _u64_js_1.default.rotrSH(Ah, Al, 28) ^ _u64_js_1.default.rotrBH(Ah, Al, 34) ^ _u64_js_1.default.rotrBH(Ah, Al, 39);
            const sigma0l = _u64_js_1.default.rotrSL(Ah, Al, 28) ^ _u64_js_1.default.rotrBL(Ah, Al, 34) ^ _u64_js_1.default.rotrBL(Ah, Al, 39);
            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = _u64_js_1.default.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = _u64_js_1.default.add3L(T1l, sigma0l, MAJl);
            Ah = _u64_js_1.default.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = _u64_js_1.default.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = _u64_js_1.default.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = _u64_js_1.default.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = _u64_js_1.default.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = _u64_js_1.default.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = _u64_js_1.default.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = _u64_js_1.default.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = _u64_js_1.default.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        SHA512_W_H.fill(0);
        SHA512_W_L.fill(0);
    }
    destroy() {
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
exports.SHA512 = SHA512;
class SHA512_224 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x8c3d37c8 | 0;
        this.Al = 0x19544da2 | 0;
        this.Bh = 0x73e19966 | 0;
        this.Bl = 0x89dcd4d6 | 0;
        this.Ch = 0x1dfab7ae | 0;
        this.Cl = 0x32ff9c82 | 0;
        this.Dh = 0x679dd514 | 0;
        this.Dl = 0x582f9fcf | 0;
        this.Eh = 0x0f6d2b69 | 0;
        this.El = 0x7bd44da8 | 0;
        this.Fh = 0x77e36f73 | 0;
        this.Fl = 0x04c48942 | 0;
        this.Gh = 0x3f9d85a8 | 0;
        this.Gl = 0x6a1d36c8 | 0;
        this.Hh = 0x1112e6ad | 0;
        this.Hl = 0x91d692a1 | 0;
        this.outputLen = 28;
    }
}
class SHA512_256 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x22312194 | 0;
        this.Al = 0xfc2bf72c | 0;
        this.Bh = 0x9f555fa3 | 0;
        this.Bl = 0xc84c64c2 | 0;
        this.Ch = 0x2393b86b | 0;
        this.Cl = 0x6f53b151 | 0;
        this.Dh = 0x96387719 | 0;
        this.Dl = 0x5940eabd | 0;
        this.Eh = 0x96283ee2 | 0;
        this.El = 0xa88effe3 | 0;
        this.Fh = 0xbe5e1e25 | 0;
        this.Fl = 0x53863992 | 0;
        this.Gh = 0x2b0199fc | 0;
        this.Gl = 0x2c85b8aa | 0;
        this.Hh = 0x0eb72ddc | 0;
        this.Hl = 0x81c52ca2 | 0;
        this.outputLen = 32;
    }
}
class SHA384 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0xcbbb9d5d | 0;
        this.Al = 0xc1059ed8 | 0;
        this.Bh = 0x629a292a | 0;
        this.Bl = 0x367cd507 | 0;
        this.Ch = 0x9159015a | 0;
        this.Cl = 0x3070dd17 | 0;
        this.Dh = 0x152fecd8 | 0;
        this.Dl = 0xf70e5939 | 0;
        this.Eh = 0x67332667 | 0;
        this.El = 0xffc00b31 | 0;
        this.Fh = 0x8eb44a87 | 0;
        this.Fl = 0x68581511 | 0;
        this.Gh = 0xdb0c2e0d | 0;
        this.Gl = 0x64f98fa7 | 0;
        this.Hh = 0x47b5481d | 0;
        this.Hl = 0xbefa4fa4 | 0;
        this.outputLen = 48;
    }
}
exports.sha512 = (0, utils_js_1.wrapConstructor)(() => new SHA512());
exports.sha512_224 = (0, utils_js_1.wrapConstructor)(() => new SHA512_224());
exports.sha512_256 = (0, utils_js_1.wrapConstructor)(() => new SHA512_256());
exports.sha384 = (0, utils_js_1.wrapConstructor)(() => new SHA384());
//# sourceMappingURL=sha512.js.map

/***/ }),

/***/ 8089:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.randomBytes = exports.wrapXOFConstructorWithOpts = exports.wrapConstructorWithOpts = exports.wrapConstructor = exports.checkOpts = exports.Hash = exports.concatBytes = exports.toBytes = exports.utf8ToBytes = exports.asyncLoop = exports.nextTick = exports.hexToBytes = exports.bytesToHex = exports.isLE = exports.rotr = exports.createView = exports.u32 = exports.u8 = void 0;
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated, we can just drop the import.
const crypto_1 = __webpack_require__(1945);
const u8a = (a) => a instanceof Uint8Array;
// Cast array to different type
const u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
exports.u8 = u8;
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
exports.u32 = u32;
// Cast array to view
const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
exports.createView = createView;
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
exports.rotr = rotr;
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
exports.isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!exports.isLE)
    throw new Error('Non little-endian hardware is not supported');
const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
    if (!u8a(bytes))
        throw new Error('Uint8Array expected');
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hexes[bytes[i]];
    }
    return hex;
}
exports.bytesToHex = bytesToHex;
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const len = hex.length;
    if (len % 2)
        throw new Error('padded hex string expected, got unpadded hex of length ' + len);
    const array = new Uint8Array(len / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
exports.hexToBytes = hexToBytes;
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
const nextTick = async () => { };
exports.nextTick = nextTick;
// Returns control to thread each 'tick' ms to avoid blocking
async function asyncLoop(iters, tick, cb) {
    let ts = Date.now();
    for (let i = 0; i < iters; i++) {
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick)
            continue;
        await (0, exports.nextTick)();
        ts += diff;
    }
}
exports.asyncLoop = asyncLoop;
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
exports.utf8ToBytes = utf8ToBytes;
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
    if (typeof data === 'string')
        data = utf8ToBytes(data);
    if (!u8a(data))
        throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
}
exports.toBytes = toBytes;
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0; // walk through each item, ensure they have proper type
    arrays.forEach((a) => {
        if (!u8a(a))
            throw new Error('Uint8Array expected');
        r.set(a, pad);
        pad += a.length;
    });
    return r;
}
exports.concatBytes = concatBytes;
// For runtime check if class implements interface
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
exports.Hash = Hash;
// Check if object doens't have custom constructor (like Uint8Array/Array)
const isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
function checkOpts(defaults, opts) {
    if (opts !== undefined && (typeof opts !== 'object' || !isPlainObject(opts)))
        throw new Error('Options should be object or undefined');
    const merged = Object.assign(defaults, opts);
    return merged;
}
exports.checkOpts = checkOpts;
function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
}
exports.wrapConstructor = wrapConstructor;
function wrapConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
exports.wrapConstructorWithOpts = wrapConstructorWithOpts;
function wrapXOFConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
exports.wrapXOFConstructorWithOpts = wrapXOFConstructorWithOpts;
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
function randomBytes(bytesLength = 32) {
    if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === 'function') {
        return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
}
exports.randomBytes = randomBytes;
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 9187:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bytes = exports.stringToBytes = exports.str = exports.bytesToString = exports.hex = exports.utf8 = exports.bech32m = exports.bech32 = exports.base58check = exports.base58xmr = exports.base58xrp = exports.base58flickr = exports.base58 = exports.base64url = exports.base64 = exports.base32crockford = exports.base32hex = exports.base32 = exports.base16 = exports.utils = exports.assertNumber = void 0;
function assertNumber(n) {
    if (!Number.isSafeInteger(n))
        throw new Error(`Wrong integer: ${n}`);
}
exports.assertNumber = assertNumber;
function chain(...args) {
    const wrap = (a, b) => (c) => a(b(c));
    const encode = Array.from(args)
        .reverse()
        .reduce((acc, i) => (acc ? wrap(acc, i.encode) : i.encode), undefined);
    const decode = args.reduce((acc, i) => (acc ? wrap(acc, i.decode) : i.decode), undefined);
    return { encode, decode };
}
function alphabet(alphabet) {
    return {
        encode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('alphabet.encode input should be an array of numbers');
            return digits.map((i) => {
                assertNumber(i);
                if (i < 0 || i >= alphabet.length)
                    throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
                return alphabet[i];
            });
        },
        decode: (input) => {
            if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                throw new Error('alphabet.decode input should be array of strings');
            return input.map((letter) => {
                if (typeof letter !== 'string')
                    throw new Error(`alphabet.decode: not string element=${letter}`);
                const index = alphabet.indexOf(letter);
                if (index === -1)
                    throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
                return index;
            });
        },
    };
}
function join(separator = '') {
    if (typeof separator !== 'string')
        throw new Error('join separator should be string');
    return {
        encode: (from) => {
            if (!Array.isArray(from) || (from.length && typeof from[0] !== 'string'))
                throw new Error('join.encode input should be array of strings');
            for (let i of from)
                if (typeof i !== 'string')
                    throw new Error(`join.encode: non-string input=${i}`);
            return from.join(separator);
        },
        decode: (to) => {
            if (typeof to !== 'string')
                throw new Error('join.decode input should be string');
            return to.split(separator);
        },
    };
}
function padding(bits, chr = '=') {
    assertNumber(bits);
    if (typeof chr !== 'string')
        throw new Error('padding chr should be string');
    return {
        encode(data) {
            if (!Array.isArray(data) || (data.length && typeof data[0] !== 'string'))
                throw new Error('padding.encode input should be array of strings');
            for (let i of data)
                if (typeof i !== 'string')
                    throw new Error(`padding.encode: non-string input=${i}`);
            while ((data.length * bits) % 8)
                data.push(chr);
            return data;
        },
        decode(input) {
            if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                throw new Error('padding.encode input should be array of strings');
            for (let i of input)
                if (typeof i !== 'string')
                    throw new Error(`padding.decode: non-string input=${i}`);
            let end = input.length;
            if ((end * bits) % 8)
                throw new Error('Invalid padding: string should have whole number of bytes');
            for (; end > 0 && input[end - 1] === chr; end--) {
                if (!(((end - 1) * bits) % 8))
                    throw new Error('Invalid padding: string has too much padding');
            }
            return input.slice(0, end);
        },
    };
}
function normalize(fn) {
    if (typeof fn !== 'function')
        throw new Error('normalize fn should be function');
    return { encode: (from) => from, decode: (to) => fn(to) };
}
function convertRadix(data, from, to) {
    if (from < 2)
        throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
    if (to < 2)
        throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
    if (!Array.isArray(data))
        throw new Error('convertRadix: data should be array');
    if (!data.length)
        return [];
    let pos = 0;
    const res = [];
    const digits = Array.from(data);
    digits.forEach((d) => {
        assertNumber(d);
        if (d < 0 || d >= from)
            throw new Error(`Wrong integer: ${d}`);
    });
    while (true) {
        let carry = 0;
        let done = true;
        for (let i = pos; i < digits.length; i++) {
            const digit = digits[i];
            const digitBase = from * carry + digit;
            if (!Number.isSafeInteger(digitBase) ||
                (from * carry) / from !== carry ||
                digitBase - digit !== from * carry) {
                throw new Error('convertRadix: carry overflow');
            }
            carry = digitBase % to;
            digits[i] = Math.floor(digitBase / to);
            if (!Number.isSafeInteger(digits[i]) || digits[i] * to + carry !== digitBase)
                throw new Error('convertRadix: carry overflow');
            if (!done)
                continue;
            else if (!digits[i])
                pos = i;
            else
                done = false;
        }
        res.push(carry);
        if (done)
            break;
    }
    for (let i = 0; i < data.length - 1 && data[i] === 0; i++)
        res.push(0);
    return res.reverse();
}
const gcd = (a, b) => (!b ? a : gcd(b, a % b));
const radix2carry = (from, to) => from + (to - gcd(from, to));
function convertRadix2(data, from, to, padding) {
    if (!Array.isArray(data))
        throw new Error('convertRadix2: data should be array');
    if (from <= 0 || from > 32)
        throw new Error(`convertRadix2: wrong from=${from}`);
    if (to <= 0 || to > 32)
        throw new Error(`convertRadix2: wrong to=${to}`);
    if (radix2carry(from, to) > 32) {
        throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
    }
    let carry = 0;
    let pos = 0;
    const mask = 2 ** to - 1;
    const res = [];
    for (const n of data) {
        assertNumber(n);
        if (n >= 2 ** from)
            throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
        carry = (carry << from) | n;
        if (pos + from > 32)
            throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
        pos += from;
        for (; pos >= to; pos -= to)
            res.push(((carry >> (pos - to)) & mask) >>> 0);
        carry &= 2 ** pos - 1;
    }
    carry = (carry << (to - pos)) & mask;
    if (!padding && pos >= from)
        throw new Error('Excess padding');
    if (!padding && carry)
        throw new Error(`Non-zero padding: ${carry}`);
    if (padding && pos > 0)
        res.push(carry >>> 0);
    return res;
}
function radix(num) {
    assertNumber(num);
    return {
        encode: (bytes) => {
            if (!(bytes instanceof Uint8Array))
                throw new Error('radix.encode input should be Uint8Array');
            return convertRadix(Array.from(bytes), 2 ** 8, num);
        },
        decode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('radix.decode input should be array of strings');
            return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
        },
    };
}
function radix2(bits, revPadding = false) {
    assertNumber(bits);
    if (bits <= 0 || bits > 32)
        throw new Error('radix2: bits should be in (0..32]');
    if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
        throw new Error('radix2: carry overflow');
    return {
        encode: (bytes) => {
            if (!(bytes instanceof Uint8Array))
                throw new Error('radix2.encode input should be Uint8Array');
            return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
        },
        decode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('radix2.decode input should be array of strings');
            return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
        },
    };
}
function unsafeWrapper(fn) {
    if (typeof fn !== 'function')
        throw new Error('unsafeWrapper fn should be function');
    return function (...args) {
        try {
            return fn.apply(null, args);
        }
        catch (e) { }
    };
}
function checksum(len, fn) {
    assertNumber(len);
    if (typeof fn !== 'function')
        throw new Error('checksum fn should be function');
    return {
        encode(data) {
            if (!(data instanceof Uint8Array))
                throw new Error('checksum.encode: input should be Uint8Array');
            const checksum = fn(data).slice(0, len);
            const res = new Uint8Array(data.length + len);
            res.set(data);
            res.set(checksum, data.length);
            return res;
        },
        decode(data) {
            if (!(data instanceof Uint8Array))
                throw new Error('checksum.decode: input should be Uint8Array');
            const payload = data.slice(0, -len);
            const newChecksum = fn(payload).slice(0, len);
            const oldChecksum = data.slice(-len);
            for (let i = 0; i < len; i++)
                if (newChecksum[i] !== oldChecksum[i])
                    throw new Error('Invalid checksum');
            return payload;
        },
    };
}
exports.utils = { alphabet, chain, checksum, radix, radix2, join, padding };
exports.base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
exports.base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
exports.base32hex = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
exports.base32crockford = chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize((s) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
exports.base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
exports.base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
const genBase58 = (abc) => chain(radix(58), alphabet(abc), join(''));
exports.base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
exports.base58flickr = genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
exports.base58xrp = genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
exports.base58xmr = {
    encode(data) {
        let res = '';
        for (let i = 0; i < data.length; i += 8) {
            const block = data.subarray(i, i + 8);
            res += exports.base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
        }
        return res;
    },
    decode(str) {
        let res = [];
        for (let i = 0; i < str.length; i += 11) {
            const slice = str.slice(i, i + 11);
            const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
            const block = exports.base58.decode(slice);
            for (let j = 0; j < block.length - blockLen; j++) {
                if (block[j] !== 0)
                    throw new Error('base58xmr: wrong padding');
            }
            res = res.concat(Array.from(block.slice(block.length - blockLen)));
        }
        return Uint8Array.from(res);
    },
};
const base58check = (sha256) => chain(checksum(4, (data) => sha256(sha256(data))), exports.base58);
exports.base58check = base58check;
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre) {
    const b = pre >> 25;
    let chk = (pre & 0x1ffffff) << 5;
    for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
        if (((b >> i) & 1) === 1)
            chk ^= POLYMOD_GENERATORS[i];
    }
    return chk;
}
function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i = 0; i < len; i++) {
        const c = prefix.charCodeAt(i);
        if (c < 33 || c > 126)
            throw new Error(`Invalid prefix (${prefix})`);
        chk = bech32Polymod(chk) ^ (c >> 5);
    }
    chk = bech32Polymod(chk);
    for (let i = 0; i < len; i++)
        chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f);
    for (let v of words)
        chk = bech32Polymod(chk) ^ v;
    for (let i = 0; i < 6; i++)
        chk = bech32Polymod(chk);
    chk ^= encodingConst;
    return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}
function genBech32(encoding) {
    const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
    const _words = radix2(5);
    const fromWords = _words.decode;
    const toWords = _words.encode;
    const fromWordsUnsafe = unsafeWrapper(fromWords);
    function encode(prefix, words, limit = 90) {
        if (typeof prefix !== 'string')
            throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
        if (!Array.isArray(words) || (words.length && typeof words[0] !== 'number'))
            throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
        const actualLength = prefix.length + 7 + words.length;
        if (limit !== false && actualLength > limit)
            throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
        prefix = prefix.toLowerCase();
        return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
    }
    function decode(str, limit = 90) {
        if (typeof str !== 'string')
            throw new Error(`bech32.decode input should be string, not ${typeof str}`);
        if (str.length < 8 || (limit !== false && str.length > limit))
            throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
        const lowered = str.toLowerCase();
        if (str !== lowered && str !== str.toUpperCase())
            throw new Error(`String must be lowercase or uppercase`);
        str = lowered;
        const sepIndex = str.lastIndexOf('1');
        if (sepIndex === 0 || sepIndex === -1)
            throw new Error(`Letter "1" must be present between prefix and data only`);
        const prefix = str.slice(0, sepIndex);
        const _words = str.slice(sepIndex + 1);
        if (_words.length < 6)
            throw new Error('Data must be at least 6 characters long');
        const words = BECH_ALPHABET.decode(_words).slice(0, -6);
        const sum = bechChecksum(prefix, words, ENCODING_CONST);
        if (!_words.endsWith(sum))
            throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
        return { prefix, words };
    }
    const decodeUnsafe = unsafeWrapper(decode);
    function decodeToBytes(str) {
        const { prefix, words } = decode(str, false);
        return { prefix, words, bytes: fromWords(words) };
    }
    return { encode, decode, decodeToBytes, decodeUnsafe, fromWords, fromWordsUnsafe, toWords };
}
exports.bech32 = genBech32('bech32');
exports.bech32m = genBech32('bech32m');
exports.utf8 = {
    encode: (data) => new TextDecoder().decode(data),
    decode: (str) => new TextEncoder().encode(str),
};
exports.hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize((s) => {
    if (typeof s !== 'string' || s.length % 2)
        throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
}));
const CODERS = {
    utf8: exports.utf8, hex: exports.hex, base16: exports.base16, base32: exports.base32, base64: exports.base64, base64url: exports.base64url, base58: exports.base58, base58xmr: exports.base58xmr
};
const coderTypeError = `Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`;
const bytesToString = (type, bytes) => {
    if (typeof type !== 'string' || !CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (!(bytes instanceof Uint8Array))
        throw new TypeError('bytesToString() expects Uint8Array');
    return CODERS[type].encode(bytes);
};
exports.bytesToString = bytesToString;
exports.str = exports.bytesToString;
const stringToBytes = (type, str) => {
    if (!CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (typeof str !== 'string')
        throw new TypeError('stringToBytes() expects string');
    return CODERS[type].decode(str);
};
exports.stringToBytes = stringToBytes;
exports.bytes = exports.stringToBytes;


/***/ }),

/***/ 7286:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
exports.Z1 = __webpack_unused_export__ = exports._I = __webpack_unused_export__ = __webpack_unused_export__ = exports.OF = void 0;
/*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) */
const _assert_1 = __webpack_require__(7320);
const pbkdf2_1 = __webpack_require__(9023);
const sha256_1 = __webpack_require__(3061);
const sha512_1 = __webpack_require__(6262);
const utils_1 = __webpack_require__(8089);
const base_1 = __webpack_require__(9187);
// Japanese wordlist
const isJapanese = (wordlist) => wordlist[0] === '\u3042\u3044\u3053\u304f\u3057\u3093';
// Normalization replaces equivalent sequences of characters
// so that any two texts that are equivalent will be reduced
// to the same sequence of code points, called the normal form of the original text.
function nfkd(str) {
    if (typeof str !== 'string')
        throw new TypeError(`Invalid mnemonic type: ${typeof str}`);
    return str.normalize('NFKD');
}
function normalize(str) {
    const norm = nfkd(str);
    const words = norm.split(' ');
    if (![12, 15, 18, 21, 24].includes(words.length))
        throw new Error('Invalid mnemonic');
    return { nfkd: norm, words };
}
function assertEntropy(entropy) {
    _assert_1.default.bytes(entropy, 16, 20, 24, 28, 32);
}
/**
 * Generate x random words. Uses Cryptographically-Secure Random Number Generator.
 * @param wordlist imported wordlist for specific language
 * @param strength mnemonic strength 128-256 bits
 * @example
 * generateMnemonic(wordlist, 128)
 * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
 */
function generateMnemonic(wordlist, strength = 128) {
    _assert_1.default.number(strength);
    if (strength % 32 !== 0 || strength > 256)
        throw new TypeError('Invalid entropy');
    return entropyToMnemonic((0, utils_1.randomBytes)(strength / 8), wordlist);
}
exports.OF = generateMnemonic;
const calcChecksum = (entropy) => {
    // Checksum is ent.length/4 bits long
    const bitsLeft = 8 - entropy.length / 4;
    // Zero rightmost "bitsLeft" bits in byte
    // For example: bitsLeft=4 val=10111101 -> 10110000
    return new Uint8Array([((0, sha256_1.sha256)(entropy)[0] >> bitsLeft) << bitsLeft]);
};
function getCoder(wordlist) {
    if (!Array.isArray(wordlist) || wordlist.length !== 2048 || typeof wordlist[0] !== 'string')
        throw new Error('Worlist: expected array of 2048 strings');
    wordlist.forEach((i) => {
        if (typeof i !== 'string')
            throw new Error(`Wordlist: non-string element: ${i}`);
    });
    return base_1.utils.chain(base_1.utils.checksum(1, calcChecksum), base_1.utils.radix2(11, true), base_1.utils.alphabet(wordlist));
}
/**
 * Reversible: Converts mnemonic string to raw entropy in form of byte array.
 * @param mnemonic 12-24 words
 * @param wordlist imported wordlist for specific language
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * mnemonicToEntropy(mnem, wordlist)
 * // Produces
 * new Uint8Array([
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
 * ])
 */
function mnemonicToEntropy(mnemonic, wordlist) {
    const { words } = normalize(mnemonic);
    const entropy = getCoder(wordlist).decode(words);
    assertEntropy(entropy);
    return entropy;
}
__webpack_unused_export__ = mnemonicToEntropy;
/**
 * Reversible: Converts raw entropy in form of byte array to mnemonic string.
 * @param entropy byte array
 * @param wordlist imported wordlist for specific language
 * @returns 12-24 words
 * @example
 * const ent = new Uint8Array([
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f,
 *   0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f, 0x7f
 * ]);
 * entropyToMnemonic(ent, wordlist);
 * // 'legal winner thank year wave sausage worth useful legal winner thank yellow'
 */
function entropyToMnemonic(entropy, wordlist) {
    assertEntropy(entropy);
    const words = getCoder(wordlist).encode(entropy);
    return words.join(isJapanese(wordlist) ? '\u3000' : ' ');
}
__webpack_unused_export__ = entropyToMnemonic;
/**
 * Validates mnemonic for being 12-24 words contained in `wordlist`.
 */
function validateMnemonic(mnemonic, wordlist) {
    try {
        mnemonicToEntropy(mnemonic, wordlist);
    }
    catch (e) {
        return false;
    }
    return true;
}
exports._I = validateMnemonic;
const salt = (passphrase) => nfkd(`mnemonic${passphrase}`);
/**
 * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
 * @param mnemonic 12-24 words
 * @param passphrase string that will additionally protect the key
 * @returns 64 bytes of key data
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * await mnemonicToSeed(mnem, 'password');
 * // new Uint8Array([...64 bytes])
 */
function mnemonicToSeed(mnemonic, passphrase = '') {
    return (0, pbkdf2_1.pbkdf2Async)(sha512_1.sha512, normalize(mnemonic).nfkd, salt(passphrase), { c: 2048, dkLen: 64 });
}
__webpack_unused_export__ = mnemonicToSeed;
/**
 * Irreversible: Uses KDF to derive 64 bytes of key data from mnemonic + optional password.
 * @param mnemonic 12-24 words
 * @param passphrase string that will additionally protect the key
 * @returns 64 bytes of key data
 * @example
 * const mnem = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
 * mnemonicToSeedSync(mnem, 'password');
 * // new Uint8Array([...64 bytes])
 */
function mnemonicToSeedSync(mnemonic, passphrase = '') {
    return (0, pbkdf2_1.pbkdf2)(sha512_1.sha512, normalize(mnemonic).nfkd, salt(passphrase), { c: 2048, dkLen: 64 });
}
exports.Z1 = mnemonicToSeedSync;


/***/ }),

/***/ 1083:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
exports.U = void 0;
exports.U = `abandon
ability
able
about
above
absent
absorb
abstract
absurd
abuse
access
accident
account
accuse
achieve
acid
acoustic
acquire
across
act
action
actor
actress
actual
adapt
add
addict
address
adjust
admit
adult
advance
advice
aerobic
affair
afford
afraid
again
age
agent
agree
ahead
aim
air
airport
aisle
alarm
album
alcohol
alert
alien
all
alley
allow
almost
alone
alpha
already
also
alter
always
amateur
amazing
among
amount
amused
analyst
anchor
ancient
anger
angle
angry
animal
ankle
announce
annual
another
answer
antenna
antique
anxiety
any
apart
apology
appear
apple
approve
april
arch
arctic
area
arena
argue
arm
armed
armor
army
around
arrange
arrest
arrive
arrow
art
artefact
artist
artwork
ask
aspect
assault
asset
assist
assume
asthma
athlete
atom
attack
attend
attitude
attract
auction
audit
august
aunt
author
auto
autumn
average
avocado
avoid
awake
aware
away
awesome
awful
awkward
axis
baby
bachelor
bacon
badge
bag
balance
balcony
ball
bamboo
banana
banner
bar
barely
bargain
barrel
base
basic
basket
battle
beach
bean
beauty
because
become
beef
before
begin
behave
behind
believe
below
belt
bench
benefit
best
betray
better
between
beyond
bicycle
bid
bike
bind
biology
bird
birth
bitter
black
blade
blame
blanket
blast
bleak
bless
blind
blood
blossom
blouse
blue
blur
blush
board
boat
body
boil
bomb
bone
bonus
book
boost
border
boring
borrow
boss
bottom
bounce
box
boy
bracket
brain
brand
brass
brave
bread
breeze
brick
bridge
brief
bright
bring
brisk
broccoli
broken
bronze
broom
brother
brown
brush
bubble
buddy
budget
buffalo
build
bulb
bulk
bullet
bundle
bunker
burden
burger
burst
bus
business
busy
butter
buyer
buzz
cabbage
cabin
cable
cactus
cage
cake
call
calm
camera
camp
can
canal
cancel
candy
cannon
canoe
canvas
canyon
capable
capital
captain
car
carbon
card
cargo
carpet
carry
cart
case
cash
casino
castle
casual
cat
catalog
catch
category
cattle
caught
cause
caution
cave
ceiling
celery
cement
census
century
cereal
certain
chair
chalk
champion
change
chaos
chapter
charge
chase
chat
cheap
check
cheese
chef
cherry
chest
chicken
chief
child
chimney
choice
choose
chronic
chuckle
chunk
churn
cigar
cinnamon
circle
citizen
city
civil
claim
clap
clarify
claw
clay
clean
clerk
clever
click
client
cliff
climb
clinic
clip
clock
clog
close
cloth
cloud
clown
club
clump
cluster
clutch
coach
coast
coconut
code
coffee
coil
coin
collect
color
column
combine
come
comfort
comic
common
company
concert
conduct
confirm
congress
connect
consider
control
convince
cook
cool
copper
copy
coral
core
corn
correct
cost
cotton
couch
country
couple
course
cousin
cover
coyote
crack
cradle
craft
cram
crane
crash
crater
crawl
crazy
cream
credit
creek
crew
cricket
crime
crisp
critic
crop
cross
crouch
crowd
crucial
cruel
cruise
crumble
crunch
crush
cry
crystal
cube
culture
cup
cupboard
curious
current
curtain
curve
cushion
custom
cute
cycle
dad
damage
damp
dance
danger
daring
dash
daughter
dawn
day
deal
debate
debris
decade
december
decide
decline
decorate
decrease
deer
defense
define
defy
degree
delay
deliver
demand
demise
denial
dentist
deny
depart
depend
deposit
depth
deputy
derive
describe
desert
design
desk
despair
destroy
detail
detect
develop
device
devote
diagram
dial
diamond
diary
dice
diesel
diet
differ
digital
dignity
dilemma
dinner
dinosaur
direct
dirt
disagree
discover
disease
dish
dismiss
disorder
display
distance
divert
divide
divorce
dizzy
doctor
document
dog
doll
dolphin
domain
donate
donkey
donor
door
dose
double
dove
draft
dragon
drama
drastic
draw
dream
dress
drift
drill
drink
drip
drive
drop
drum
dry
duck
dumb
dune
during
dust
dutch
duty
dwarf
dynamic
eager
eagle
early
earn
earth
easily
east
easy
echo
ecology
economy
edge
edit
educate
effort
egg
eight
either
elbow
elder
electric
elegant
element
elephant
elevator
elite
else
embark
embody
embrace
emerge
emotion
employ
empower
empty
enable
enact
end
endless
endorse
enemy
energy
enforce
engage
engine
enhance
enjoy
enlist
enough
enrich
enroll
ensure
enter
entire
entry
envelope
episode
equal
equip
era
erase
erode
erosion
error
erupt
escape
essay
essence
estate
eternal
ethics
evidence
evil
evoke
evolve
exact
example
excess
exchange
excite
exclude
excuse
execute
exercise
exhaust
exhibit
exile
exist
exit
exotic
expand
expect
expire
explain
expose
express
extend
extra
eye
eyebrow
fabric
face
faculty
fade
faint
faith
fall
false
fame
family
famous
fan
fancy
fantasy
farm
fashion
fat
fatal
father
fatigue
fault
favorite
feature
february
federal
fee
feed
feel
female
fence
festival
fetch
fever
few
fiber
fiction
field
figure
file
film
filter
final
find
fine
finger
finish
fire
firm
first
fiscal
fish
fit
fitness
fix
flag
flame
flash
flat
flavor
flee
flight
flip
float
flock
floor
flower
fluid
flush
fly
foam
focus
fog
foil
fold
follow
food
foot
force
forest
forget
fork
fortune
forum
forward
fossil
foster
found
fox
fragile
frame
frequent
fresh
friend
fringe
frog
front
frost
frown
frozen
fruit
fuel
fun
funny
furnace
fury
future
gadget
gain
galaxy
gallery
game
gap
garage
garbage
garden
garlic
garment
gas
gasp
gate
gather
gauge
gaze
general
genius
genre
gentle
genuine
gesture
ghost
giant
gift
giggle
ginger
giraffe
girl
give
glad
glance
glare
glass
glide
glimpse
globe
gloom
glory
glove
glow
glue
goat
goddess
gold
good
goose
gorilla
gospel
gossip
govern
gown
grab
grace
grain
grant
grape
grass
gravity
great
green
grid
grief
grit
grocery
group
grow
grunt
guard
guess
guide
guilt
guitar
gun
gym
habit
hair
half
hammer
hamster
hand
happy
harbor
hard
harsh
harvest
hat
have
hawk
hazard
head
health
heart
heavy
hedgehog
height
hello
helmet
help
hen
hero
hidden
high
hill
hint
hip
hire
history
hobby
hockey
hold
hole
holiday
hollow
home
honey
hood
hope
horn
horror
horse
hospital
host
hotel
hour
hover
hub
huge
human
humble
humor
hundred
hungry
hunt
hurdle
hurry
hurt
husband
hybrid
ice
icon
idea
identify
idle
ignore
ill
illegal
illness
image
imitate
immense
immune
impact
impose
improve
impulse
inch
include
income
increase
index
indicate
indoor
industry
infant
inflict
inform
inhale
inherit
initial
inject
injury
inmate
inner
innocent
input
inquiry
insane
insect
inside
inspire
install
intact
interest
into
invest
invite
involve
iron
island
isolate
issue
item
ivory
jacket
jaguar
jar
jazz
jealous
jeans
jelly
jewel
job
join
joke
journey
joy
judge
juice
jump
jungle
junior
junk
just
kangaroo
keen
keep
ketchup
key
kick
kid
kidney
kind
kingdom
kiss
kit
kitchen
kite
kitten
kiwi
knee
knife
knock
know
lab
label
labor
ladder
lady
lake
lamp
language
laptop
large
later
latin
laugh
laundry
lava
law
lawn
lawsuit
layer
lazy
leader
leaf
learn
leave
lecture
left
leg
legal
legend
leisure
lemon
lend
length
lens
leopard
lesson
letter
level
liar
liberty
library
license
life
lift
light
like
limb
limit
link
lion
liquid
list
little
live
lizard
load
loan
lobster
local
lock
logic
lonely
long
loop
lottery
loud
lounge
love
loyal
lucky
luggage
lumber
lunar
lunch
luxury
lyrics
machine
mad
magic
magnet
maid
mail
main
major
make
mammal
man
manage
mandate
mango
mansion
manual
maple
marble
march
margin
marine
market
marriage
mask
mass
master
match
material
math
matrix
matter
maximum
maze
meadow
mean
measure
meat
mechanic
medal
media
melody
melt
member
memory
mention
menu
mercy
merge
merit
merry
mesh
message
metal
method
middle
midnight
milk
million
mimic
mind
minimum
minor
minute
miracle
mirror
misery
miss
mistake
mix
mixed
mixture
mobile
model
modify
mom
moment
monitor
monkey
monster
month
moon
moral
more
morning
mosquito
mother
motion
motor
mountain
mouse
move
movie
much
muffin
mule
multiply
muscle
museum
mushroom
music
must
mutual
myself
mystery
myth
naive
name
napkin
narrow
nasty
nation
nature
near
neck
need
negative
neglect
neither
nephew
nerve
nest
net
network
neutral
never
news
next
nice
night
noble
noise
nominee
noodle
normal
north
nose
notable
note
nothing
notice
novel
now
nuclear
number
nurse
nut
oak
obey
object
oblige
obscure
observe
obtain
obvious
occur
ocean
october
odor
off
offer
office
often
oil
okay
old
olive
olympic
omit
once
one
onion
online
only
open
opera
opinion
oppose
option
orange
orbit
orchard
order
ordinary
organ
orient
original
orphan
ostrich
other
outdoor
outer
output
outside
oval
oven
over
own
owner
oxygen
oyster
ozone
pact
paddle
page
pair
palace
palm
panda
panel
panic
panther
paper
parade
parent
park
parrot
party
pass
patch
path
patient
patrol
pattern
pause
pave
payment
peace
peanut
pear
peasant
pelican
pen
penalty
pencil
people
pepper
perfect
permit
person
pet
phone
photo
phrase
physical
piano
picnic
picture
piece
pig
pigeon
pill
pilot
pink
pioneer
pipe
pistol
pitch
pizza
place
planet
plastic
plate
play
please
pledge
pluck
plug
plunge
poem
poet
point
polar
pole
police
pond
pony
pool
popular
portion
position
possible
post
potato
pottery
poverty
powder
power
practice
praise
predict
prefer
prepare
present
pretty
prevent
price
pride
primary
print
priority
prison
private
prize
problem
process
produce
profit
program
project
promote
proof
property
prosper
protect
proud
provide
public
pudding
pull
pulp
pulse
pumpkin
punch
pupil
puppy
purchase
purity
purpose
purse
push
put
puzzle
pyramid
quality
quantum
quarter
question
quick
quit
quiz
quote
rabbit
raccoon
race
rack
radar
radio
rail
rain
raise
rally
ramp
ranch
random
range
rapid
rare
rate
rather
raven
raw
razor
ready
real
reason
rebel
rebuild
recall
receive
recipe
record
recycle
reduce
reflect
reform
refuse
region
regret
regular
reject
relax
release
relief
rely
remain
remember
remind
remove
render
renew
rent
reopen
repair
repeat
replace
report
require
rescue
resemble
resist
resource
response
result
retire
retreat
return
reunion
reveal
review
reward
rhythm
rib
ribbon
rice
rich
ride
ridge
rifle
right
rigid
ring
riot
ripple
risk
ritual
rival
river
road
roast
robot
robust
rocket
romance
roof
rookie
room
rose
rotate
rough
round
route
royal
rubber
rude
rug
rule
run
runway
rural
sad
saddle
sadness
safe
sail
salad
salmon
salon
salt
salute
same
sample
sand
satisfy
satoshi
sauce
sausage
save
say
scale
scan
scare
scatter
scene
scheme
school
science
scissors
scorpion
scout
scrap
screen
script
scrub
sea
search
season
seat
second
secret
section
security
seed
seek
segment
select
sell
seminar
senior
sense
sentence
series
service
session
settle
setup
seven
shadow
shaft
shallow
share
shed
shell
sheriff
shield
shift
shine
ship
shiver
shock
shoe
shoot
shop
short
shoulder
shove
shrimp
shrug
shuffle
shy
sibling
sick
side
siege
sight
sign
silent
silk
silly
silver
similar
simple
since
sing
siren
sister
situate
six
size
skate
sketch
ski
skill
skin
skirt
skull
slab
slam
sleep
slender
slice
slide
slight
slim
slogan
slot
slow
slush
small
smart
smile
smoke
smooth
snack
snake
snap
sniff
snow
soap
soccer
social
sock
soda
soft
solar
soldier
solid
solution
solve
someone
song
soon
sorry
sort
soul
sound
soup
source
south
space
spare
spatial
spawn
speak
special
speed
spell
spend
sphere
spice
spider
spike
spin
spirit
split
spoil
sponsor
spoon
sport
spot
spray
spread
spring
spy
square
squeeze
squirrel
stable
stadium
staff
stage
stairs
stamp
stand
start
state
stay
steak
steel
stem
step
stereo
stick
still
sting
stock
stomach
stone
stool
story
stove
strategy
street
strike
strong
struggle
student
stuff
stumble
style
subject
submit
subway
success
such
sudden
suffer
sugar
suggest
suit
summer
sun
sunny
sunset
super
supply
supreme
sure
surface
surge
surprise
surround
survey
suspect
sustain
swallow
swamp
swap
swarm
swear
sweet
swift
swim
swing
switch
sword
symbol
symptom
syrup
system
table
tackle
tag
tail
talent
talk
tank
tape
target
task
taste
tattoo
taxi
teach
team
tell
ten
tenant
tennis
tent
term
test
text
thank
that
theme
then
theory
there
they
thing
this
thought
three
thrive
throw
thumb
thunder
ticket
tide
tiger
tilt
timber
time
tiny
tip
tired
tissue
title
toast
tobacco
today
toddler
toe
together
toilet
token
tomato
tomorrow
tone
tongue
tonight
tool
tooth
top
topic
topple
torch
tornado
tortoise
toss
total
tourist
toward
tower
town
toy
track
trade
traffic
tragic
train
transfer
trap
trash
travel
tray
treat
tree
trend
trial
tribe
trick
trigger
trim
trip
trophy
trouble
truck
true
truly
trumpet
trust
truth
try
tube
tuition
tumble
tuna
tunnel
turkey
turn
turtle
twelve
twenty
twice
twin
twist
two
type
typical
ugly
umbrella
unable
unaware
uncle
uncover
under
undo
unfair
unfold
unhappy
uniform
unique
unit
universe
unknown
unlock
until
unusual
unveil
update
upgrade
uphold
upon
upper
upset
urban
urge
usage
use
used
useful
useless
usual
utility
vacant
vacuum
vague
valid
valley
valve
van
vanish
vapor
various
vast
vault
vehicle
velvet
vendor
venture
venue
verb
verify
version
very
vessel
veteran
viable
vibrant
vicious
victory
video
view
village
vintage
violin
virtual
virus
visa
visit
visual
vital
vivid
vocal
voice
void
volcano
volume
vote
voyage
wage
wagon
wait
walk
wall
walnut
want
warfare
warm
warrior
wash
wasp
waste
water
wave
way
wealth
weapon
wear
weasel
weather
web
wedding
weekend
weird
welcome
west
wet
whale
what
wheat
wheel
when
where
whip
whisper
wide
width
wife
wild
will
win
window
wine
wing
wink
winner
winter
wire
wisdom
wise
wish
witness
wolf
woman
wonder
wood
wool
word
work
world
worry
worth
wrap
wreck
wrestle
wrist
write
wrong
yard
year
yellow
you
young
youth
zebra
zero
zone
zoo`.split('\n');


/***/ }),

/***/ 9742:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}


/***/ }),

/***/ 8764:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
var __webpack_unused_export__;
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



const base64 = __webpack_require__(9742)
const ieee754 = __webpack_require__(645)
const customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
    : null

exports.lW = Buffer
__webpack_unused_export__ = SlowBuffer
exports.h2 = 50

const K_MAX_LENGTH = 0x7fffffff
__webpack_unused_export__ = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    const arr = new Uint8Array(1)
    const proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  const buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayView(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  const valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  const b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpreted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  const length = byteLength(string, encoding) | 0
  let buf = createBuffer(length)

  const actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  const length = array.length < 0 ? 0 : checked(array.length) | 0
  const buf = createBuffer(length)
  for (let i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayView (arrayView) {
  if (isInstance(arrayView, Uint8Array)) {
    const copy = new Uint8Array(arrayView)
    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
  }
  return fromArrayLike(arrayView)
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  let buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    const len = checked(obj.length) | 0
    const buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  let x = a.length
  let y = b.length

  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  let i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  const buffer = Buffer.allocUnsafe(length)
  let pos = 0
  for (i = 0; i < list.length; ++i) {
    let buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      if (pos + buf.length > buffer.length) {
        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf)
        buf.copy(buffer, pos)
      } else {
        Uint8Array.prototype.set.call(
          buffer,
          buf,
          pos
        )
      }
    } else if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    } else {
      buf.copy(buffer, pos)
    }
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  const len = string.length
  const mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  let loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  const i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  const len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (let i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  const len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (let i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  const len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (let i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  const length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  let str = ''
  const max = exports.h2
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  let x = thisEnd - thisStart
  let y = end - start
  const len = Math.min(x, y)

  const thisCopy = this.slice(thisStart, thisEnd)
  const targetCopy = target.slice(start, end)

  for (let i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  let indexSize = 1
  let arrLength = arr.length
  let valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  let i
  if (dir) {
    let foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      let found = true
      for (let j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  const remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  const strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  let i
  for (i = 0; i < length; ++i) {
    const parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  const remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  let loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
      case 'latin1':
      case 'binary':
        return asciiWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  const res = []

  let i = start
  while (i < end) {
    const firstByte = buf[i]
    let codePoint = null
    let bytesPerSequence = (firstByte > 0xEF)
      ? 4
      : (firstByte > 0xDF)
          ? 3
          : (firstByte > 0xBF)
              ? 2
              : 1

    if (i + bytesPerSequence <= end) {
      let secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
const MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  const len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  let res = ''
  let i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  let ret = ''
  end = Math.min(buf.length, end)

  for (let i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  const len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  let out = ''
  for (let i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  const bytes = buf.slice(start, end)
  let res = ''
  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
  for (let i = 0; i < bytes.length - 1; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  const len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  const newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUintLE =
Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUintBE =
Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  let val = this[offset + --byteLength]
  let mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUint8 =
Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUint16LE =
Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUint16BE =
Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUint32LE =
Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUint32BE =
Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const lo = first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24

  const hi = this[++offset] +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    last * 2 ** 24

  return BigInt(lo) + (BigInt(hi) << BigInt(32))
})

Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const hi = first * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  const lo = this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last

  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
})

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let val = this[offset]
  let mul = 1
  let i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  let i = byteLength
  let mul = 1
  let val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  const val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = this[offset + 4] +
    this[offset + 5] * 2 ** 8 +
    this[offset + 6] * 2 ** 16 +
    (last << 24) // Overflow

  return (BigInt(val) << BigInt(32)) +
    BigInt(first +
    this[++offset] * 2 ** 8 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 24)
})

Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
  offset = offset >>> 0
  validateNumber(offset, 'offset')
  const first = this[offset]
  const last = this[offset + 7]
  if (first === undefined || last === undefined) {
    boundsError(offset, this.length - 8)
  }

  const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    this[++offset]

  return (BigInt(val) << BigInt(32)) +
    BigInt(this[++offset] * 2 ** 24 +
    this[++offset] * 2 ** 16 +
    this[++offset] * 2 ** 8 +
    last)
})

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUintLE =
Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let mul = 1
  let i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUintBE =
Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    const maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  let i = byteLength - 1
  let mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUint8 =
Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUint16LE =
Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUint16BE =
Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUint32LE =
Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUint32BE =
Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function wrtBigUInt64LE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  lo = lo >> 8
  buf[offset++] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  hi = hi >> 8
  buf[offset++] = hi
  return offset
}

function wrtBigUInt64BE (buf, value, offset, min, max) {
  checkIntBI(value, min, max, buf, offset, 7)

  let lo = Number(value & BigInt(0xffffffff))
  buf[offset + 7] = lo
  lo = lo >> 8
  buf[offset + 6] = lo
  lo = lo >> 8
  buf[offset + 5] = lo
  lo = lo >> 8
  buf[offset + 4] = lo
  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
  buf[offset + 3] = hi
  hi = hi >> 8
  buf[offset + 2] = hi
  hi = hi >> 8
  buf[offset + 1] = hi
  hi = hi >> 8
  buf[offset] = hi
  return offset + 8
}

Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
})

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = 0
  let mul = 1
  let sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    const limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  let i = byteLength - 1
  let mul = 1
  let sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
})

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  const len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      const code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  let i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    const bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    const len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// CUSTOM ERRORS
// =============

// Simplified versions from Node, changed for Buffer-only usage
const errors = {}
function E (sym, getMessage, Base) {
  errors[sym] = class NodeError extends Base {
    constructor () {
      super()

      Object.defineProperty(this, 'message', {
        value: getMessage.apply(this, arguments),
        writable: true,
        configurable: true
      })

      // Add the error code to the name to include it in the stack trace.
      this.name = `${this.name} [${sym}]`
      // Access the stack to generate the error message including the error code
      // from the name.
      this.stack // eslint-disable-line no-unused-expressions
      // Reset the name to the actual name.
      delete this.name
    }

    get code () {
      return sym
    }

    set code (value) {
      Object.defineProperty(this, 'code', {
        configurable: true,
        enumerable: true,
        value,
        writable: true
      })
    }

    toString () {
      return `${this.name} [${sym}]: ${this.message}`
    }
  }
}

E('ERR_BUFFER_OUT_OF_BOUNDS',
  function (name) {
    if (name) {
      return `${name} is outside of buffer bounds`
    }

    return 'Attempt to access memory outside buffer bounds'
  }, RangeError)
E('ERR_INVALID_ARG_TYPE',
  function (name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
  }, TypeError)
E('ERR_OUT_OF_RANGE',
  function (str, range, input) {
    let msg = `The value of "${str}" is out of range.`
    let received = input
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input))
    } else if (typeof input === 'bigint') {
      received = String(input)
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received)
      }
      received += 'n'
    }
    msg += ` It must be ${range}. Received ${received}`
    return msg
  }, RangeError)

function addNumericalSeparator (val) {
  let res = ''
  let i = val.length
  const start = val[0] === '-' ? 1 : 0
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`
  }
  return `${val.slice(0, i)}${res}`
}

// CHECK FUNCTIONS
// ===============

function checkBounds (buf, offset, byteLength) {
  validateNumber(offset, 'offset')
  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
    boundsError(offset, buf.length - (byteLength + 1))
  }
}

function checkIntBI (value, min, max, buf, offset, byteLength) {
  if (value > max || value < min) {
    const n = typeof min === 'bigint' ? 'n' : ''
    let range
    if (byteLength > 3) {
      if (min === 0 || min === BigInt(0)) {
        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`
      } else {
        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
                `${(byteLength + 1) * 8 - 1}${n}`
      }
    } else {
      range = `>= ${min}${n} and <= ${max}${n}`
    }
    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
  }
  checkBounds(buf, offset, byteLength)
}

function validateNumber (value, name) {
  if (typeof value !== 'number') {
    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
  }
}

function boundsError (value, length, type) {
  if (Math.floor(value) !== value) {
    validateNumber(value, type)
    throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
  }

  if (length < 0) {
    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
  }

  throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
                                    `>= ${type ? 1 : 0} and <= ${length}`,
                                    value)
}

// HELPER FUNCTIONS
// ================

const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  let codePoint
  const length = string.length
  let leadSurrogate = null
  const bytes = []

  for (let i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  let c, hi, lo
  const byteArray = []
  for (let i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  let i
  for (i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
const hexSliceLookupTable = (function () {
  const alphabet = '0123456789abcdef'
  const table = new Array(256)
  for (let i = 0; i < 16; ++i) {
    const i16 = i * 16
    for (let j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

// Return not function with Error if BigInt not supported
function defineBigIntMethod (fn) {
  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
}

function BufferBigIntNotDefined () {
  throw new Error('BigInt not supported')
}


/***/ }),

/***/ 452:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(8269), __webpack_require__(8214), __webpack_require__(888), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    // Lookup tables
	    var SBOX = [];
	    var INV_SBOX = [];
	    var SUB_MIX_0 = [];
	    var SUB_MIX_1 = [];
	    var SUB_MIX_2 = [];
	    var SUB_MIX_3 = [];
	    var INV_SUB_MIX_0 = [];
	    var INV_SUB_MIX_1 = [];
	    var INV_SUB_MIX_2 = [];
	    var INV_SUB_MIX_3 = [];

	    // Compute lookup tables
	    (function () {
	        // Compute double table
	        var d = [];
	        for (var i = 0; i < 256; i++) {
	            if (i < 128) {
	                d[i] = i << 1;
	            } else {
	                d[i] = (i << 1) ^ 0x11b;
	            }
	        }

	        // Walk GF(2^8)
	        var x = 0;
	        var xi = 0;
	        for (var i = 0; i < 256; i++) {
	            // Compute sbox
	            var sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
	            sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
	            SBOX[x] = sx;
	            INV_SBOX[sx] = x;

	            // Compute multiplication
	            var x2 = d[x];
	            var x4 = d[x2];
	            var x8 = d[x4];

	            // Compute sub bytes, mix columns tables
	            var t = (d[sx] * 0x101) ^ (sx * 0x1010100);
	            SUB_MIX_0[x] = (t << 24) | (t >>> 8);
	            SUB_MIX_1[x] = (t << 16) | (t >>> 16);
	            SUB_MIX_2[x] = (t << 8)  | (t >>> 24);
	            SUB_MIX_3[x] = t;

	            // Compute inv sub bytes, inv mix columns tables
	            var t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
	            INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
	            INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
	            INV_SUB_MIX_2[sx] = (t << 8)  | (t >>> 24);
	            INV_SUB_MIX_3[sx] = t;

	            // Compute next counter
	            if (!x) {
	                x = xi = 1;
	            } else {
	                x = x2 ^ d[d[d[x8 ^ x2]]];
	                xi ^= d[d[xi]];
	            }
	        }
	    }());

	    // Precomputed Rcon lookup
	    var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

	    /**
	     * AES block cipher algorithm.
	     */
	    var AES = C_algo.AES = BlockCipher.extend({
	        _doReset: function () {
	            var t;

	            // Skip reset of nRounds has been set before and key did not change
	            if (this._nRounds && this._keyPriorReset === this._key) {
	                return;
	            }

	            // Shortcuts
	            var key = this._keyPriorReset = this._key;
	            var keyWords = key.words;
	            var keySize = key.sigBytes / 4;

	            // Compute number of rounds
	            var nRounds = this._nRounds = keySize + 6;

	            // Compute number of key schedule rows
	            var ksRows = (nRounds + 1) * 4;

	            // Compute key schedule
	            var keySchedule = this._keySchedule = [];
	            for (var ksRow = 0; ksRow < ksRows; ksRow++) {
	                if (ksRow < keySize) {
	                    keySchedule[ksRow] = keyWords[ksRow];
	                } else {
	                    t = keySchedule[ksRow - 1];

	                    if (!(ksRow % keySize)) {
	                        // Rot word
	                        t = (t << 8) | (t >>> 24);

	                        // Sub word
	                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];

	                        // Mix Rcon
	                        t ^= RCON[(ksRow / keySize) | 0] << 24;
	                    } else if (keySize > 6 && ksRow % keySize == 4) {
	                        // Sub word
	                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];
	                    }

	                    keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
	                }
	            }

	            // Compute inv key schedule
	            var invKeySchedule = this._invKeySchedule = [];
	            for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
	                var ksRow = ksRows - invKsRow;

	                if (invKsRow % 4) {
	                    var t = keySchedule[ksRow];
	                } else {
	                    var t = keySchedule[ksRow - 4];
	                }

	                if (invKsRow < 4 || ksRow <= 4) {
	                    invKeySchedule[invKsRow] = t;
	                } else {
	                    invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
	                                               INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
	                }
	            }
	        },

	        encryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
	        },

	        decryptBlock: function (M, offset) {
	            // Swap 2nd and 4th rows
	            var t = M[offset + 1];
	            M[offset + 1] = M[offset + 3];
	            M[offset + 3] = t;

	            this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

	            // Inv swap 2nd and 4th rows
	            var t = M[offset + 1];
	            M[offset + 1] = M[offset + 3];
	            M[offset + 3] = t;
	        },

	        _doCryptBlock: function (M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
	            // Shortcut
	            var nRounds = this._nRounds;

	            // Get input, add round key
	            var s0 = M[offset]     ^ keySchedule[0];
	            var s1 = M[offset + 1] ^ keySchedule[1];
	            var s2 = M[offset + 2] ^ keySchedule[2];
	            var s3 = M[offset + 3] ^ keySchedule[3];

	            // Key schedule row counter
	            var ksRow = 4;

	            // Rounds
	            for (var round = 1; round < nRounds; round++) {
	                // Shift rows, sub bytes, mix columns, add round key
	                var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[(s1 >>> 16) & 0xff] ^ SUB_MIX_2[(s2 >>> 8) & 0xff] ^ SUB_MIX_3[s3 & 0xff] ^ keySchedule[ksRow++];
	                var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[(s2 >>> 16) & 0xff] ^ SUB_MIX_2[(s3 >>> 8) & 0xff] ^ SUB_MIX_3[s0 & 0xff] ^ keySchedule[ksRow++];
	                var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[(s3 >>> 16) & 0xff] ^ SUB_MIX_2[(s0 >>> 8) & 0xff] ^ SUB_MIX_3[s1 & 0xff] ^ keySchedule[ksRow++];
	                var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[(s0 >>> 16) & 0xff] ^ SUB_MIX_2[(s1 >>> 8) & 0xff] ^ SUB_MIX_3[s2 & 0xff] ^ keySchedule[ksRow++];

	                // Update state
	                s0 = t0;
	                s1 = t1;
	                s2 = t2;
	                s3 = t3;
	            }

	            // Shift rows, sub bytes, add round key
	            var t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
	            var t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
	            var t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
	            var t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];

	            // Set output
	            M[offset]     = t0;
	            M[offset + 1] = t1;
	            M[offset + 2] = t2;
	            M[offset + 3] = t3;
	        },

	        keySize: 256/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.AES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.AES.decrypt(ciphertext, key, cfg);
	     */
	    C.AES = BlockCipher._createHelper(AES);
	}());


	return CryptoJS.AES;

}));

/***/ }),

/***/ 5109:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(888));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * Cipher core components.
	 */
	CryptoJS.lib.Cipher || (function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var Base64 = C_enc.Base64;
	    var C_algo = C.algo;
	    var EvpKDF = C_algo.EvpKDF;

	    /**
	     * Abstract base cipher template.
	     *
	     * @property {number} keySize This cipher's key size. Default: 4 (128 bits)
	     * @property {number} ivSize This cipher's IV size. Default: 4 (128 bits)
	     * @property {number} _ENC_XFORM_MODE A constant representing encryption mode.
	     * @property {number} _DEC_XFORM_MODE A constant representing decryption mode.
	     */
	    var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {WordArray} iv The IV to use for this operation.
	         */
	        cfg: Base.extend(),

	        /**
	         * Creates this cipher in encryption mode.
	         *
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {Cipher} A cipher instance.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
	         */
	        createEncryptor: function (key, cfg) {
	            return this.create(this._ENC_XFORM_MODE, key, cfg);
	        },

	        /**
	         * Creates this cipher in decryption mode.
	         *
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {Cipher} A cipher instance.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
	         */
	        createDecryptor: function (key, cfg) {
	            return this.create(this._DEC_XFORM_MODE, key, cfg);
	        },

	        /**
	         * Initializes a newly created cipher.
	         *
	         * @param {number} xformMode Either the encryption or decryption transormation mode constant.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @example
	         *
	         *     var cipher = CryptoJS.algo.AES.create(CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray });
	         */
	        init: function (xformMode, key, cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Store transform mode and key
	            this._xformMode = xformMode;
	            this._key = key;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this cipher to its initial state.
	         *
	         * @example
	         *
	         *     cipher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-cipher logic
	            this._doReset();
	        },

	        /**
	         * Adds data to be encrypted or decrypted.
	         *
	         * @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
	         *
	         * @return {WordArray} The data after processing.
	         *
	         * @example
	         *
	         *     var encrypted = cipher.process('data');
	         *     var encrypted = cipher.process(wordArray);
	         */
	        process: function (dataUpdate) {
	            // Append
	            this._append(dataUpdate);

	            // Process available blocks
	            return this._process();
	        },

	        /**
	         * Finalizes the encryption or decryption process.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
	         *
	         * @return {WordArray} The data after final processing.
	         *
	         * @example
	         *
	         *     var encrypted = cipher.finalize();
	         *     var encrypted = cipher.finalize('data');
	         *     var encrypted = cipher.finalize(wordArray);
	         */
	        finalize: function (dataUpdate) {
	            // Final data update
	            if (dataUpdate) {
	                this._append(dataUpdate);
	            }

	            // Perform concrete-cipher logic
	            var finalProcessedData = this._doFinalize();

	            return finalProcessedData;
	        },

	        keySize: 128/32,

	        ivSize: 128/32,

	        _ENC_XFORM_MODE: 1,

	        _DEC_XFORM_MODE: 2,

	        /**
	         * Creates shortcut functions to a cipher's object interface.
	         *
	         * @param {Cipher} cipher The cipher to create a helper for.
	         *
	         * @return {Object} An object with encrypt and decrypt shortcut functions.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
	         */
	        _createHelper: (function () {
	            function selectCipherStrategy(key) {
	                if (typeof key == 'string') {
	                    return PasswordBasedCipher;
	                } else {
	                    return SerializableCipher;
	                }
	            }

	            return function (cipher) {
	                return {
	                    encrypt: function (message, key, cfg) {
	                        return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
	                    },

	                    decrypt: function (ciphertext, key, cfg) {
	                        return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
	                    }
	                };
	            };
	        }())
	    });

	    /**
	     * Abstract base stream cipher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 1 (32 bits)
	     */
	    var StreamCipher = C_lib.StreamCipher = Cipher.extend({
	        _doFinalize: function () {
	            // Process partial blocks
	            var finalProcessedBlocks = this._process(!!'flush');

	            return finalProcessedBlocks;
	        },

	        blockSize: 1
	    });

	    /**
	     * Mode namespace.
	     */
	    var C_mode = C.mode = {};

	    /**
	     * Abstract base block cipher mode template.
	     */
	    var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
	        /**
	         * Creates this mode for encryption.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
	         */
	        createEncryptor: function (cipher, iv) {
	            return this.Encryptor.create(cipher, iv);
	        },

	        /**
	         * Creates this mode for decryption.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
	         */
	        createDecryptor: function (cipher, iv) {
	            return this.Decryptor.create(cipher, iv);
	        },

	        /**
	         * Initializes a newly created mode.
	         *
	         * @param {Cipher} cipher A block cipher instance.
	         * @param {Array} iv The IV words.
	         *
	         * @example
	         *
	         *     var mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
	         */
	        init: function (cipher, iv) {
	            this._cipher = cipher;
	            this._iv = iv;
	        }
	    });

	    /**
	     * Cipher Block Chaining mode.
	     */
	    var CBC = C_mode.CBC = (function () {
	        /**
	         * Abstract base CBC mode.
	         */
	        var CBC = BlockCipherMode.extend();

	        /**
	         * CBC encryptor.
	         */
	        CBC.Encryptor = CBC.extend({
	            /**
	             * Processes the data block at offset.
	             *
	             * @param {Array} words The data words to operate on.
	             * @param {number} offset The offset where the block starts.
	             *
	             * @example
	             *
	             *     mode.processBlock(data.words, offset);
	             */
	            processBlock: function (words, offset) {
	                // Shortcuts
	                var cipher = this._cipher;
	                var blockSize = cipher.blockSize;

	                // XOR and encrypt
	                xorBlock.call(this, words, offset, blockSize);
	                cipher.encryptBlock(words, offset);

	                // Remember this block to use with next block
	                this._prevBlock = words.slice(offset, offset + blockSize);
	            }
	        });

	        /**
	         * CBC decryptor.
	         */
	        CBC.Decryptor = CBC.extend({
	            /**
	             * Processes the data block at offset.
	             *
	             * @param {Array} words The data words to operate on.
	             * @param {number} offset The offset where the block starts.
	             *
	             * @example
	             *
	             *     mode.processBlock(data.words, offset);
	             */
	            processBlock: function (words, offset) {
	                // Shortcuts
	                var cipher = this._cipher;
	                var blockSize = cipher.blockSize;

	                // Remember this block to use with next block
	                var thisBlock = words.slice(offset, offset + blockSize);

	                // Decrypt and XOR
	                cipher.decryptBlock(words, offset);
	                xorBlock.call(this, words, offset, blockSize);

	                // This block becomes the previous block
	                this._prevBlock = thisBlock;
	            }
	        });

	        function xorBlock(words, offset, blockSize) {
	            var block;

	            // Shortcut
	            var iv = this._iv;

	            // Choose mixing block
	            if (iv) {
	                block = iv;

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            } else {
	                block = this._prevBlock;
	            }

	            // XOR blocks
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= block[i];
	            }
	        }

	        return CBC;
	    }());

	    /**
	     * Padding namespace.
	     */
	    var C_pad = C.pad = {};

	    /**
	     * PKCS #5/7 padding strategy.
	     */
	    var Pkcs7 = C_pad.Pkcs7 = {
	        /**
	         * Pads data using the algorithm defined in PKCS #5/7.
	         *
	         * @param {WordArray} data The data to pad.
	         * @param {number} blockSize The multiple that the data should be padded to.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
	         */
	        pad: function (data, blockSize) {
	            // Shortcut
	            var blockSizeBytes = blockSize * 4;

	            // Count padding bytes
	            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

	            // Create padding word
	            var paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;

	            // Create padding
	            var paddingWords = [];
	            for (var i = 0; i < nPaddingBytes; i += 4) {
	                paddingWords.push(paddingWord);
	            }
	            var padding = WordArray.create(paddingWords, nPaddingBytes);

	            // Add padding
	            data.concat(padding);
	        },

	        /**
	         * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
	         *
	         * @param {WordArray} data The data to unpad.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     CryptoJS.pad.Pkcs7.unpad(wordArray);
	         */
	        unpad: function (data) {
	            // Get number of padding bytes from last byte
	            var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	            // Remove padding
	            data.sigBytes -= nPaddingBytes;
	        }
	    };

	    /**
	     * Abstract base block cipher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 4 (128 bits)
	     */
	    var BlockCipher = C_lib.BlockCipher = Cipher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {Mode} mode The block mode to use. Default: CBC
	         * @property {Padding} padding The padding strategy to use. Default: Pkcs7
	         */
	        cfg: Cipher.cfg.extend({
	            mode: CBC,
	            padding: Pkcs7
	        }),

	        reset: function () {
	            var modeCreator;

	            // Reset cipher
	            Cipher.reset.call(this);

	            // Shortcuts
	            var cfg = this.cfg;
	            var iv = cfg.iv;
	            var mode = cfg.mode;

	            // Reset block mode
	            if (this._xformMode == this._ENC_XFORM_MODE) {
	                modeCreator = mode.createEncryptor;
	            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
	                modeCreator = mode.createDecryptor;
	                // Keep at least one block in the buffer for unpadding
	                this._minBufferSize = 1;
	            }

	            if (this._mode && this._mode.__creator == modeCreator) {
	                this._mode.init(this, iv && iv.words);
	            } else {
	                this._mode = modeCreator.call(mode, this, iv && iv.words);
	                this._mode.__creator = modeCreator;
	            }
	        },

	        _doProcessBlock: function (words, offset) {
	            this._mode.processBlock(words, offset);
	        },

	        _doFinalize: function () {
	            var finalProcessedBlocks;

	            // Shortcut
	            var padding = this.cfg.padding;

	            // Finalize
	            if (this._xformMode == this._ENC_XFORM_MODE) {
	                // Pad data
	                padding.pad(this._data, this.blockSize);

	                // Process final blocks
	                finalProcessedBlocks = this._process(!!'flush');
	            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
	                // Process final blocks
	                finalProcessedBlocks = this._process(!!'flush');

	                // Unpad data
	                padding.unpad(finalProcessedBlocks);
	            }

	            return finalProcessedBlocks;
	        },

	        blockSize: 128/32
	    });

	    /**
	     * A collection of cipher parameters.
	     *
	     * @property {WordArray} ciphertext The raw ciphertext.
	     * @property {WordArray} key The key to this ciphertext.
	     * @property {WordArray} iv The IV used in the ciphering operation.
	     * @property {WordArray} salt The salt used with a key derivation function.
	     * @property {Cipher} algorithm The cipher algorithm.
	     * @property {Mode} mode The block mode used in the ciphering operation.
	     * @property {Padding} padding The padding scheme used in the ciphering operation.
	     * @property {number} blockSize The block size of the cipher.
	     * @property {Format} formatter The default formatting strategy to convert this cipher params object to a string.
	     */
	    var CipherParams = C_lib.CipherParams = Base.extend({
	        /**
	         * Initializes a newly created cipher params object.
	         *
	         * @param {Object} cipherParams An object with any of the possible cipher parameters.
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.lib.CipherParams.create({
	         *         ciphertext: ciphertextWordArray,
	         *         key: keyWordArray,
	         *         iv: ivWordArray,
	         *         salt: saltWordArray,
	         *         algorithm: CryptoJS.algo.AES,
	         *         mode: CryptoJS.mode.CBC,
	         *         padding: CryptoJS.pad.PKCS7,
	         *         blockSize: 4,
	         *         formatter: CryptoJS.format.OpenSSL
	         *     });
	         */
	        init: function (cipherParams) {
	            this.mixIn(cipherParams);
	        },

	        /**
	         * Converts this cipher params object to a string.
	         *
	         * @param {Format} formatter (Optional) The formatting strategy to use.
	         *
	         * @return {string} The stringified cipher params.
	         *
	         * @throws Error If neither the formatter nor the default formatter is set.
	         *
	         * @example
	         *
	         *     var string = cipherParams + '';
	         *     var string = cipherParams.toString();
	         *     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
	         */
	        toString: function (formatter) {
	            return (formatter || this.formatter).stringify(this);
	        }
	    });

	    /**
	     * Format namespace.
	     */
	    var C_format = C.format = {};

	    /**
	     * OpenSSL formatting strategy.
	     */
	    var OpenSSLFormatter = C_format.OpenSSL = {
	        /**
	         * Converts a cipher params object to an OpenSSL-compatible string.
	         *
	         * @param {CipherParams} cipherParams The cipher params object.
	         *
	         * @return {string} The OpenSSL-compatible string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
	         */
	        stringify: function (cipherParams) {
	            var wordArray;

	            // Shortcuts
	            var ciphertext = cipherParams.ciphertext;
	            var salt = cipherParams.salt;

	            // Format
	            if (salt) {
	                wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
	            } else {
	                wordArray = ciphertext;
	            }

	            return wordArray.toString(Base64);
	        },

	        /**
	         * Converts an OpenSSL-compatible string to a cipher params object.
	         *
	         * @param {string} openSSLStr The OpenSSL-compatible string.
	         *
	         * @return {CipherParams} The cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
	         */
	        parse: function (openSSLStr) {
	            var salt;

	            // Parse base64
	            var ciphertext = Base64.parse(openSSLStr);

	            // Shortcut
	            var ciphertextWords = ciphertext.words;

	            // Test for salt
	            if (ciphertextWords[0] == 0x53616c74 && ciphertextWords[1] == 0x65645f5f) {
	                // Extract salt
	                salt = WordArray.create(ciphertextWords.slice(2, 4));

	                // Remove salt from ciphertext
	                ciphertextWords.splice(0, 4);
	                ciphertext.sigBytes -= 16;
	            }

	            return CipherParams.create({ ciphertext: ciphertext, salt: salt });
	        }
	    };

	    /**
	     * A cipher wrapper that returns ciphertext as a serializable cipher params object.
	     */
	    var SerializableCipher = C_lib.SerializableCipher = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {Formatter} format The formatting strategy to convert cipher param objects to and from a string. Default: OpenSSL
	         */
	        cfg: Base.extend({
	            format: OpenSSLFormatter
	        }),

	        /**
	         * Encrypts a message.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {WordArray|string} message The message to encrypt.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {CipherParams} A cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         */
	        encrypt: function (cipher, message, key, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Encrypt
	            var encryptor = cipher.createEncryptor(key, cfg);
	            var ciphertext = encryptor.finalize(message);

	            // Shortcut
	            var cipherCfg = encryptor.cfg;

	            // Create and return serializable cipher params
	            return CipherParams.create({
	                ciphertext: ciphertext,
	                key: key,
	                iv: cipherCfg.iv,
	                algorithm: cipher,
	                mode: cipherCfg.mode,
	                padding: cipherCfg.padding,
	                blockSize: cipher.blockSize,
	                formatter: cfg.format
	            });
	        },

	        /**
	         * Decrypts serialized ciphertext.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
	         * @param {WordArray} key The key.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {WordArray} The plaintext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, key, { iv: iv, format: CryptoJS.format.OpenSSL });
	         */
	        decrypt: function (cipher, ciphertext, key, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Convert string to CipherParams
	            ciphertext = this._parse(ciphertext, cfg.format);

	            // Decrypt
	            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);

	            return plaintext;
	        },

	        /**
	         * Converts serialized ciphertext to CipherParams,
	         * else assumed CipherParams already and returns ciphertext unchanged.
	         *
	         * @param {CipherParams|string} ciphertext The ciphertext.
	         * @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
	         *
	         * @return {CipherParams} The unserialized ciphertext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
	         */
	        _parse: function (ciphertext, format) {
	            if (typeof ciphertext == 'string') {
	                return format.parse(ciphertext, this);
	            } else {
	                return ciphertext;
	            }
	        }
	    });

	    /**
	     * Key derivation function namespace.
	     */
	    var C_kdf = C.kdf = {};

	    /**
	     * OpenSSL key derivation function.
	     */
	    var OpenSSLKdf = C_kdf.OpenSSL = {
	        /**
	         * Derives a key and IV from a password.
	         *
	         * @param {string} password The password to derive from.
	         * @param {number} keySize The size in words of the key to generate.
	         * @param {number} ivSize The size in words of the IV to generate.
	         * @param {WordArray|string} salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
	         *
	         * @return {CipherParams} A cipher params object with the key, IV, and salt.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
	         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
	         */
	        execute: function (password, keySize, ivSize, salt) {
	            // Generate random salt
	            if (!salt) {
	                salt = WordArray.random(64/8);
	            }

	            // Derive key and IV
	            var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);

	            // Separate key and IV
	            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
	            key.sigBytes = keySize * 4;

	            // Return params
	            return CipherParams.create({ key: key, iv: iv, salt: salt });
	        }
	    };

	    /**
	     * A serializable cipher wrapper that derives the key from a password,
	     * and returns ciphertext as a serializable cipher params object.
	     */
	    var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {KDF} kdf The key derivation function to use to generate a key and IV from a password. Default: OpenSSL
	         */
	        cfg: SerializableCipher.cfg.extend({
	            kdf: OpenSSLKdf
	        }),

	        /**
	         * Encrypts a message using a password.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {WordArray|string} message The message to encrypt.
	         * @param {string} password The password.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {CipherParams} A cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password');
	         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
	         */
	        encrypt: function (cipher, message, password, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Derive key and other params
	            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize);

	            // Add IV to config
	            cfg.iv = derivedParams.iv;

	            // Encrypt
	            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);

	            // Mix in derived params
	            ciphertext.mixIn(derivedParams);

	            return ciphertext;
	        },

	        /**
	         * Decrypts serialized ciphertext using a password.
	         *
	         * @param {Cipher} cipher The cipher algorithm to use.
	         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
	         * @param {string} password The password.
	         * @param {Object} cfg (Optional) The configuration options to use for this operation.
	         *
	         * @return {WordArray} The plaintext.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password', { format: CryptoJS.format.OpenSSL });
	         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, 'password', { format: CryptoJS.format.OpenSSL });
	         */
	        decrypt: function (cipher, ciphertext, password, cfg) {
	            // Apply config defaults
	            cfg = this.cfg.extend(cfg);

	            // Convert string to CipherParams
	            ciphertext = this._parse(ciphertext, cfg.format);

	            // Derive key and other params
	            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt);

	            // Add IV to config
	            cfg.iv = derivedParams.iv;

	            // Decrypt
	            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);

	            return plaintext;
	        }
	    });
	}());


}));

/***/ }),

/***/ 8249:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory();
	}
	else {}
}(this, function () {

	/*globals window, global, require*/

	/**
	 * CryptoJS core components.
	 */
	var CryptoJS = CryptoJS || (function (Math, undefined) {

	    var crypto;

	    // Native crypto from window (Browser)
	    if (typeof window !== 'undefined' && window.crypto) {
	        crypto = window.crypto;
	    }

	    // Native crypto in web worker (Browser)
	    if (typeof self !== 'undefined' && self.crypto) {
	        crypto = self.crypto;
	    }

	    // Native crypto from worker
	    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
	        crypto = globalThis.crypto;
	    }

	    // Native (experimental IE 11) crypto from window (Browser)
	    if (!crypto && typeof window !== 'undefined' && window.msCrypto) {
	        crypto = window.msCrypto;
	    }

	    // Native crypto from global (NodeJS)
	    if (!crypto && typeof __webpack_require__.g !== 'undefined' && __webpack_require__.g.crypto) {
	        crypto = __webpack_require__.g.crypto;
	    }

	    // Native crypto import via require (NodeJS)
	    if (!crypto && "function" === 'function') {
	        try {
	            crypto = __webpack_require__(2480);
	        } catch (err) {}
	    }

	    /*
	     * Cryptographically secure pseudorandom number generator
	     *
	     * As Math.random() is cryptographically not safe to use
	     */
	    var cryptoSecureRandomInt = function () {
	        if (crypto) {
	            // Use getRandomValues method (Browser)
	            if (typeof crypto.getRandomValues === 'function') {
	                try {
	                    return crypto.getRandomValues(new Uint32Array(1))[0];
	                } catch (err) {}
	            }

	            // Use randomBytes method (NodeJS)
	            if (typeof crypto.randomBytes === 'function') {
	                try {
	                    return crypto.randomBytes(4).readInt32LE();
	                } catch (err) {}
	            }
	        }

	        throw new Error('Native crypto module could not be used to get secure random number.');
	    };

	    /*
	     * Local polyfill of Object.create

	     */
	    var create = Object.create || (function () {
	        function F() {}

	        return function (obj) {
	            var subtype;

	            F.prototype = obj;

	            subtype = new F();

	            F.prototype = null;

	            return subtype;
	        };
	    }());

	    /**
	     * CryptoJS namespace.
	     */
	    var C = {};

	    /**
	     * Library namespace.
	     */
	    var C_lib = C.lib = {};

	    /**
	     * Base object for prototypal inheritance.
	     */
	    var Base = C_lib.Base = (function () {


	        return {
	            /**
	             * Creates a new object that inherits from this object.
	             *
	             * @param {Object} overrides Properties to copy into the new object.
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         field: 'value',
	             *
	             *         method: function () {
	             *         }
	             *     });
	             */
	            extend: function (overrides) {
	                // Spawn
	                var subtype = create(this);

	                // Augment
	                if (overrides) {
	                    subtype.mixIn(overrides);
	                }

	                // Create default initializer
	                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
	                    subtype.init = function () {
	                        subtype.$super.init.apply(this, arguments);
	                    };
	                }

	                // Initializer's prototype is the subtype object
	                subtype.init.prototype = subtype;

	                // Reference supertype
	                subtype.$super = this;

	                return subtype;
	            },

	            /**
	             * Extends this object and runs the init method.
	             * Arguments to create() will be passed to init().
	             *
	             * @return {Object} The new object.
	             *
	             * @static
	             *
	             * @example
	             *
	             *     var instance = MyType.create();
	             */
	            create: function () {
	                var instance = this.extend();
	                instance.init.apply(instance, arguments);

	                return instance;
	            },

	            /**
	             * Initializes a newly created object.
	             * Override this method to add some logic when your objects are created.
	             *
	             * @example
	             *
	             *     var MyType = CryptoJS.lib.Base.extend({
	             *         init: function () {
	             *             // ...
	             *         }
	             *     });
	             */
	            init: function () {
	            },

	            /**
	             * Copies properties into this object.
	             *
	             * @param {Object} properties The properties to mix in.
	             *
	             * @example
	             *
	             *     MyType.mixIn({
	             *         field: 'value'
	             *     });
	             */
	            mixIn: function (properties) {
	                for (var propertyName in properties) {
	                    if (properties.hasOwnProperty(propertyName)) {
	                        this[propertyName] = properties[propertyName];
	                    }
	                }

	                // IE won't copy toString using the loop above
	                if (properties.hasOwnProperty('toString')) {
	                    this.toString = properties.toString;
	                }
	            },

	            /**
	             * Creates a copy of this object.
	             *
	             * @return {Object} The clone.
	             *
	             * @example
	             *
	             *     var clone = instance.clone();
	             */
	            clone: function () {
	                return this.init.prototype.extend(this);
	            }
	        };
	    }());

	    /**
	     * An array of 32-bit words.
	     *
	     * @property {Array} words The array of 32-bit words.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var WordArray = C_lib.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of 32-bit words.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.create();
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
	         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 4;
	            }
	        },

	        /**
	         * Converts this word array to a string.
	         *
	         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
	         *
	         * @return {string} The stringified word array.
	         *
	         * @example
	         *
	         *     var string = wordArray + '';
	         *     var string = wordArray.toString();
	         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
	         */
	        toString: function (encoder) {
	            return (encoder || Hex).stringify(this);
	        },

	        /**
	         * Concatenates a word array to this word array.
	         *
	         * @param {WordArray} wordArray The word array to append.
	         *
	         * @return {WordArray} This word array.
	         *
	         * @example
	         *
	         *     wordArray1.concat(wordArray2);
	         */
	        concat: function (wordArray) {
	            // Shortcuts
	            var thisWords = this.words;
	            var thatWords = wordArray.words;
	            var thisSigBytes = this.sigBytes;
	            var thatSigBytes = wordArray.sigBytes;

	            // Clamp excess bits
	            this.clamp();

	            // Concat
	            if (thisSigBytes % 4) {
	                // Copy one byte at a time
	                for (var i = 0; i < thatSigBytes; i++) {
	                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
	                }
	            } else {
	                // Copy one word at a time
	                for (var j = 0; j < thatSigBytes; j += 4) {
	                    thisWords[(thisSigBytes + j) >>> 2] = thatWords[j >>> 2];
	                }
	            }
	            this.sigBytes += thatSigBytes;

	            // Chainable
	            return this;
	        },

	        /**
	         * Removes insignificant bits.
	         *
	         * @example
	         *
	         *     wordArray.clamp();
	         */
	        clamp: function () {
	            // Shortcuts
	            var words = this.words;
	            var sigBytes = this.sigBytes;

	            // Clamp
	            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
	            words.length = Math.ceil(sigBytes / 4);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = wordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone.words = this.words.slice(0);

	            return clone;
	        },

	        /**
	         * Creates a word array filled with random bytes.
	         *
	         * @param {number} nBytes The number of random bytes to generate.
	         *
	         * @return {WordArray} The random word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.lib.WordArray.random(16);
	         */
	        random: function (nBytes) {
	            var words = [];

	            for (var i = 0; i < nBytes; i += 4) {
	                words.push(cryptoSecureRandomInt());
	            }

	            return new WordArray.init(words, nBytes);
	        }
	    });

	    /**
	     * Encoder namespace.
	     */
	    var C_enc = C.enc = {};

	    /**
	     * Hex encoding strategy.
	     */
	    var Hex = C_enc.Hex = {
	        /**
	         * Converts a word array to a hex string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The hex string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var hexChars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                hexChars.push((bite >>> 4).toString(16));
	                hexChars.push((bite & 0x0f).toString(16));
	            }

	            return hexChars.join('');
	        },

	        /**
	         * Converts a hex string to a word array.
	         *
	         * @param {string} hexStr The hex string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
	         */
	        parse: function (hexStr) {
	            // Shortcut
	            var hexStrLength = hexStr.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < hexStrLength; i += 2) {
	                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
	            }

	            return new WordArray.init(words, hexStrLength / 2);
	        }
	    };

	    /**
	     * Latin1 encoding strategy.
	     */
	    var Latin1 = C_enc.Latin1 = {
	        /**
	         * Converts a word array to a Latin1 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Latin1 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var latin1Chars = [];
	            for (var i = 0; i < sigBytes; i++) {
	                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
	                latin1Chars.push(String.fromCharCode(bite));
	            }

	            return latin1Chars.join('');
	        },

	        /**
	         * Converts a Latin1 string to a word array.
	         *
	         * @param {string} latin1Str The Latin1 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
	         */
	        parse: function (latin1Str) {
	            // Shortcut
	            var latin1StrLength = latin1Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < latin1StrLength; i++) {
	                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
	            }

	            return new WordArray.init(words, latin1StrLength);
	        }
	    };

	    /**
	     * UTF-8 encoding strategy.
	     */
	    var Utf8 = C_enc.Utf8 = {
	        /**
	         * Converts a word array to a UTF-8 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-8 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            try {
	                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
	            } catch (e) {
	                throw new Error('Malformed UTF-8 data');
	            }
	        },

	        /**
	         * Converts a UTF-8 string to a word array.
	         *
	         * @param {string} utf8Str The UTF-8 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
	         */
	        parse: function (utf8Str) {
	            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
	        }
	    };

	    /**
	     * Abstract buffered block algorithm template.
	     *
	     * The property blockSize must be implemented in a concrete subtype.
	     *
	     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
	     */
	    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
	        /**
	         * Resets this block algorithm's data buffer to its initial state.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm.reset();
	         */
	        reset: function () {
	            // Initial values
	            this._data = new WordArray.init();
	            this._nDataBytes = 0;
	        },

	        /**
	         * Adds new data to this block algorithm's buffer.
	         *
	         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
	         *
	         * @example
	         *
	         *     bufferedBlockAlgorithm._append('data');
	         *     bufferedBlockAlgorithm._append(wordArray);
	         */
	        _append: function (data) {
	            // Convert string to WordArray, else assume WordArray already
	            if (typeof data == 'string') {
	                data = Utf8.parse(data);
	            }

	            // Append
	            this._data.concat(data);
	            this._nDataBytes += data.sigBytes;
	        },

	        /**
	         * Processes available data blocks.
	         *
	         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
	         *
	         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
	         *
	         * @return {WordArray} The processed data.
	         *
	         * @example
	         *
	         *     var processedData = bufferedBlockAlgorithm._process();
	         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
	         */
	        _process: function (doFlush) {
	            var processedWords;

	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var dataSigBytes = data.sigBytes;
	            var blockSize = this.blockSize;
	            var blockSizeBytes = blockSize * 4;

	            // Count blocks ready
	            var nBlocksReady = dataSigBytes / blockSizeBytes;
	            if (doFlush) {
	                // Round up to include partial blocks
	                nBlocksReady = Math.ceil(nBlocksReady);
	            } else {
	                // Round down to include only full blocks,
	                // less the number of blocks that must remain in the buffer
	                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
	            }

	            // Count words ready
	            var nWordsReady = nBlocksReady * blockSize;

	            // Count bytes ready
	            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

	            // Process blocks
	            if (nWordsReady) {
	                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
	                    // Perform concrete-algorithm logic
	                    this._doProcessBlock(dataWords, offset);
	                }

	                // Remove processed words
	                processedWords = dataWords.splice(0, nWordsReady);
	                data.sigBytes -= nBytesReady;
	            }

	            // Return processed words
	            return new WordArray.init(processedWords, nBytesReady);
	        },

	        /**
	         * Creates a copy of this object.
	         *
	         * @return {Object} The clone.
	         *
	         * @example
	         *
	         *     var clone = bufferedBlockAlgorithm.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);
	            clone._data = this._data.clone();

	            return clone;
	        },

	        _minBufferSize: 0
	    });

	    /**
	     * Abstract hasher template.
	     *
	     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
	     */
	    var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
	        /**
	         * Configuration options.
	         */
	        cfg: Base.extend(),

	        /**
	         * Initializes a newly created hasher.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
	         *
	         * @example
	         *
	         *     var hasher = CryptoJS.algo.SHA256.create();
	         */
	        init: function (cfg) {
	            // Apply config defaults
	            this.cfg = this.cfg.extend(cfg);

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this hasher to its initial state.
	         *
	         * @example
	         *
	         *     hasher.reset();
	         */
	        reset: function () {
	            // Reset data buffer
	            BufferedBlockAlgorithm.reset.call(this);

	            // Perform concrete-hasher logic
	            this._doReset();
	        },

	        /**
	         * Updates this hasher with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {Hasher} This hasher.
	         *
	         * @example
	         *
	         *     hasher.update('message');
	         *     hasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            // Append
	            this._append(messageUpdate);

	            // Update the hash
	            this._process();

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the hash computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The hash.
	         *
	         * @example
	         *
	         *     var hash = hasher.finalize();
	         *     var hash = hasher.finalize('message');
	         *     var hash = hasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Final message update
	            if (messageUpdate) {
	                this._append(messageUpdate);
	            }

	            // Perform concrete-hasher logic
	            var hash = this._doFinalize();

	            return hash;
	        },

	        blockSize: 512/32,

	        /**
	         * Creates a shortcut function to a hasher's object interface.
	         *
	         * @param {Hasher} hasher The hasher to create a helper for.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
	         */
	        _createHelper: function (hasher) {
	            return function (message, cfg) {
	                return new hasher.init(cfg).finalize(message);
	            };
	        },

	        /**
	         * Creates a shortcut function to the HMAC's object interface.
	         *
	         * @param {Hasher} hasher The hasher to use in this HMAC helper.
	         *
	         * @return {Function} The shortcut function.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
	         */
	        _createHmacHelper: function (hasher) {
	            return function (message, key) {
	                return new C_algo.HMAC.init(hasher, key).finalize(message);
	            };
	        }
	    });

	    /**
	     * Algorithm namespace.
	     */
	    var C_algo = C.algo = {};

	    return C;
	}(Math));


	return CryptoJS;

}));

/***/ }),

/***/ 8269:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * Base64 encoding strategy.
	     */
	    var Base64 = C_enc.Base64 = {
	        /**
	         * Converts a word array to a Base64 string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The Base64 string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;
	            var map = this._map;

	            // Clamp excess bits
	            wordArray.clamp();

	            // Convert
	            var base64Chars = [];
	            for (var i = 0; i < sigBytes; i += 3) {
	                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
	                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
	                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

	                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

	                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
	                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
	                }
	            }

	            // Add padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                while (base64Chars.length % 4) {
	                    base64Chars.push(paddingChar);
	                }
	            }

	            return base64Chars.join('');
	        },

	        /**
	         * Converts a Base64 string to a word array.
	         *
	         * @param {string} base64Str The Base64 string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
	         */
	        parse: function (base64Str) {
	            // Shortcuts
	            var base64StrLength = base64Str.length;
	            var map = this._map;
	            var reverseMap = this._reverseMap;

	            if (!reverseMap) {
	                    reverseMap = this._reverseMap = [];
	                    for (var j = 0; j < map.length; j++) {
	                        reverseMap[map.charCodeAt(j)] = j;
	                    }
	            }

	            // Ignore padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                var paddingIndex = base64Str.indexOf(paddingChar);
	                if (paddingIndex !== -1) {
	                    base64StrLength = paddingIndex;
	                }
	            }

	            // Convert
	            return parseLoop(base64Str, base64StrLength, reverseMap);

	        },

	        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
	    };

	    function parseLoop(base64Str, base64StrLength, reverseMap) {
	      var words = [];
	      var nBytes = 0;
	      for (var i = 0; i < base64StrLength; i++) {
	          if (i % 4) {
	              var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
	              var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
	              var bitsCombined = bits1 | bits2;
	              words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
	              nBytes++;
	          }
	      }
	      return WordArray.create(words, nBytes);
	    }
	}());


	return CryptoJS.enc.Base64;

}));

/***/ }),

/***/ 3786:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * Base64url encoding strategy.
	     */
	    var Base64url = C_enc.Base64url = {
	        /**
	         * Converts a word array to a Base64url string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @param {boolean} urlSafe Whether to use url safe
	         *
	         * @return {string} The Base64url string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var base64String = CryptoJS.enc.Base64url.stringify(wordArray);
	         */
	        stringify: function (wordArray, urlSafe=true) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;
	            var map = urlSafe ? this._safe_map : this._map;

	            // Clamp excess bits
	            wordArray.clamp();

	            // Convert
	            var base64Chars = [];
	            for (var i = 0; i < sigBytes; i += 3) {
	                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
	                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
	                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

	                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

	                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
	                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
	                }
	            }

	            // Add padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                while (base64Chars.length % 4) {
	                    base64Chars.push(paddingChar);
	                }
	            }

	            return base64Chars.join('');
	        },

	        /**
	         * Converts a Base64url string to a word array.
	         *
	         * @param {string} base64Str The Base64url string.
	         *
	         * @param {boolean} urlSafe Whether to use url safe
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Base64url.parse(base64String);
	         */
	        parse: function (base64Str, urlSafe=true) {
	            // Shortcuts
	            var base64StrLength = base64Str.length;
	            var map = urlSafe ? this._safe_map : this._map;
	            var reverseMap = this._reverseMap;

	            if (!reverseMap) {
	                reverseMap = this._reverseMap = [];
	                for (var j = 0; j < map.length; j++) {
	                    reverseMap[map.charCodeAt(j)] = j;
	                }
	            }

	            // Ignore padding
	            var paddingChar = map.charAt(64);
	            if (paddingChar) {
	                var paddingIndex = base64Str.indexOf(paddingChar);
	                if (paddingIndex !== -1) {
	                    base64StrLength = paddingIndex;
	                }
	            }

	            // Convert
	            return parseLoop(base64Str, base64StrLength, reverseMap);

	        },

	        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
	        _safe_map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
	    };

	    function parseLoop(base64Str, base64StrLength, reverseMap) {
	        var words = [];
	        var nBytes = 0;
	        for (var i = 0; i < base64StrLength; i++) {
	            if (i % 4) {
	                var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
	                var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
	                var bitsCombined = bits1 | bits2;
	                words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
	                nBytes++;
	            }
	        }
	        return WordArray.create(words, nBytes);
	    }
	}());

	return CryptoJS.enc.Base64url;

}));

/***/ }),

/***/ 298:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_enc = C.enc;

	    /**
	     * UTF-16 BE encoding strategy.
	     */
	    var Utf16BE = C_enc.Utf16 = C_enc.Utf16BE = {
	        /**
	         * Converts a word array to a UTF-16 BE string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-16 BE string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf16String = CryptoJS.enc.Utf16.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var utf16Chars = [];
	            for (var i = 0; i < sigBytes; i += 2) {
	                var codePoint = (words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff;
	                utf16Chars.push(String.fromCharCode(codePoint));
	            }

	            return utf16Chars.join('');
	        },

	        /**
	         * Converts a UTF-16 BE string to a word array.
	         *
	         * @param {string} utf16Str The UTF-16 BE string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf16.parse(utf16String);
	         */
	        parse: function (utf16Str) {
	            // Shortcut
	            var utf16StrLength = utf16Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < utf16StrLength; i++) {
	                words[i >>> 1] |= utf16Str.charCodeAt(i) << (16 - (i % 2) * 16);
	            }

	            return WordArray.create(words, utf16StrLength * 2);
	        }
	    };

	    /**
	     * UTF-16 LE encoding strategy.
	     */
	    C_enc.Utf16LE = {
	        /**
	         * Converts a word array to a UTF-16 LE string.
	         *
	         * @param {WordArray} wordArray The word array.
	         *
	         * @return {string} The UTF-16 LE string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var utf16Str = CryptoJS.enc.Utf16LE.stringify(wordArray);
	         */
	        stringify: function (wordArray) {
	            // Shortcuts
	            var words = wordArray.words;
	            var sigBytes = wordArray.sigBytes;

	            // Convert
	            var utf16Chars = [];
	            for (var i = 0; i < sigBytes; i += 2) {
	                var codePoint = swapEndian((words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff);
	                utf16Chars.push(String.fromCharCode(codePoint));
	            }

	            return utf16Chars.join('');
	        },

	        /**
	         * Converts a UTF-16 LE string to a word array.
	         *
	         * @param {string} utf16Str The UTF-16 LE string.
	         *
	         * @return {WordArray} The word array.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.enc.Utf16LE.parse(utf16Str);
	         */
	        parse: function (utf16Str) {
	            // Shortcut
	            var utf16StrLength = utf16Str.length;

	            // Convert
	            var words = [];
	            for (var i = 0; i < utf16StrLength; i++) {
	                words[i >>> 1] |= swapEndian(utf16Str.charCodeAt(i) << (16 - (i % 2) * 16));
	            }

	            return WordArray.create(words, utf16StrLength * 2);
	        }
	    };

	    function swapEndian(word) {
	        return ((word << 8) & 0xff00ff00) | ((word >>> 8) & 0x00ff00ff);
	    }
	}());


	return CryptoJS.enc.Utf16;

}));

/***/ }),

/***/ 888:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(2783), __webpack_require__(9824));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var MD5 = C_algo.MD5;

	    /**
	     * This key derivation function is meant to conform with EVP_BytesToKey.
	     * www.openssl.org/docs/crypto/EVP_BytesToKey.html
	     */
	    var EvpKDF = C_algo.EvpKDF = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
	         * @property {Hasher} hasher The hash algorithm to use. Default: MD5
	         * @property {number} iterations The number of iterations to perform. Default: 1
	         */
	        cfg: Base.extend({
	            keySize: 128/32,
	            hasher: MD5,
	            iterations: 1
	        }),

	        /**
	         * Initializes a newly created key derivation function.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
	         *
	         * @example
	         *
	         *     var kdf = CryptoJS.algo.EvpKDF.create();
	         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8 });
	         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8, iterations: 1000 });
	         */
	        init: function (cfg) {
	            this.cfg = this.cfg.extend(cfg);
	        },

	        /**
	         * Derives a key from a password.
	         *
	         * @param {WordArray|string} password The password.
	         * @param {WordArray|string} salt A salt.
	         *
	         * @return {WordArray} The derived key.
	         *
	         * @example
	         *
	         *     var key = kdf.compute(password, salt);
	         */
	        compute: function (password, salt) {
	            var block;

	            // Shortcut
	            var cfg = this.cfg;

	            // Init hasher
	            var hasher = cfg.hasher.create();

	            // Initial values
	            var derivedKey = WordArray.create();

	            // Shortcuts
	            var derivedKeyWords = derivedKey.words;
	            var keySize = cfg.keySize;
	            var iterations = cfg.iterations;

	            // Generate key
	            while (derivedKeyWords.length < keySize) {
	                if (block) {
	                    hasher.update(block);
	                }
	                block = hasher.update(password).finalize(salt);
	                hasher.reset();

	                // Iterations
	                for (var i = 1; i < iterations; i++) {
	                    block = hasher.finalize(block);
	                    hasher.reset();
	                }

	                derivedKey.concat(block);
	            }
	            derivedKey.sigBytes = keySize * 4;

	            return derivedKey;
	        }
	    });

	    /**
	     * Derives a key from a password.
	     *
	     * @param {WordArray|string} password The password.
	     * @param {WordArray|string} salt A salt.
	     * @param {Object} cfg (Optional) The configuration options to use for this computation.
	     *
	     * @return {WordArray} The derived key.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var key = CryptoJS.EvpKDF(password, salt);
	     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8 });
	     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8, iterations: 1000 });
	     */
	    C.EvpKDF = function (password, salt, cfg) {
	        return EvpKDF.create(cfg).compute(password, salt);
	    };
	}());


	return CryptoJS.EvpKDF;

}));

/***/ }),

/***/ 2209:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	(function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var CipherParams = C_lib.CipherParams;
	    var C_enc = C.enc;
	    var Hex = C_enc.Hex;
	    var C_format = C.format;

	    var HexFormatter = C_format.Hex = {
	        /**
	         * Converts the ciphertext of a cipher params object to a hexadecimally encoded string.
	         *
	         * @param {CipherParams} cipherParams The cipher params object.
	         *
	         * @return {string} The hexadecimally encoded string.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var hexString = CryptoJS.format.Hex.stringify(cipherParams);
	         */
	        stringify: function (cipherParams) {
	            return cipherParams.ciphertext.toString(Hex);
	        },

	        /**
	         * Converts a hexadecimally encoded ciphertext string to a cipher params object.
	         *
	         * @param {string} input The hexadecimally encoded string.
	         *
	         * @return {CipherParams} The cipher params object.
	         *
	         * @static
	         *
	         * @example
	         *
	         *     var cipherParams = CryptoJS.format.Hex.parse(hexString);
	         */
	        parse: function (input) {
	            var ciphertext = Hex.parse(input);
	            return CipherParams.create({ ciphertext: ciphertext });
	        }
	    };
	}());


	return CryptoJS.format.Hex;

}));

/***/ }),

/***/ 9824:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var C_enc = C.enc;
	    var Utf8 = C_enc.Utf8;
	    var C_algo = C.algo;

	    /**
	     * HMAC algorithm.
	     */
	    var HMAC = C_algo.HMAC = Base.extend({
	        /**
	         * Initializes a newly created HMAC.
	         *
	         * @param {Hasher} hasher The hash algorithm to use.
	         * @param {WordArray|string} key The secret key.
	         *
	         * @example
	         *
	         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
	         */
	        init: function (hasher, key) {
	            // Init hasher
	            hasher = this._hasher = new hasher.init();

	            // Convert string to WordArray, else assume WordArray already
	            if (typeof key == 'string') {
	                key = Utf8.parse(key);
	            }

	            // Shortcuts
	            var hasherBlockSize = hasher.blockSize;
	            var hasherBlockSizeBytes = hasherBlockSize * 4;

	            // Allow arbitrary length keys
	            if (key.sigBytes > hasherBlockSizeBytes) {
	                key = hasher.finalize(key);
	            }

	            // Clamp excess bits
	            key.clamp();

	            // Clone key for inner and outer pads
	            var oKey = this._oKey = key.clone();
	            var iKey = this._iKey = key.clone();

	            // Shortcuts
	            var oKeyWords = oKey.words;
	            var iKeyWords = iKey.words;

	            // XOR keys with pad constants
	            for (var i = 0; i < hasherBlockSize; i++) {
	                oKeyWords[i] ^= 0x5c5c5c5c;
	                iKeyWords[i] ^= 0x36363636;
	            }
	            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

	            // Set initial values
	            this.reset();
	        },

	        /**
	         * Resets this HMAC to its initial state.
	         *
	         * @example
	         *
	         *     hmacHasher.reset();
	         */
	        reset: function () {
	            // Shortcut
	            var hasher = this._hasher;

	            // Reset
	            hasher.reset();
	            hasher.update(this._iKey);
	        },

	        /**
	         * Updates this HMAC with a message.
	         *
	         * @param {WordArray|string} messageUpdate The message to append.
	         *
	         * @return {HMAC} This HMAC instance.
	         *
	         * @example
	         *
	         *     hmacHasher.update('message');
	         *     hmacHasher.update(wordArray);
	         */
	        update: function (messageUpdate) {
	            this._hasher.update(messageUpdate);

	            // Chainable
	            return this;
	        },

	        /**
	         * Finalizes the HMAC computation.
	         * Note that the finalize operation is effectively a destructive, read-once operation.
	         *
	         * @param {WordArray|string} messageUpdate (Optional) A final message update.
	         *
	         * @return {WordArray} The HMAC.
	         *
	         * @example
	         *
	         *     var hmac = hmacHasher.finalize();
	         *     var hmac = hmacHasher.finalize('message');
	         *     var hmac = hmacHasher.finalize(wordArray);
	         */
	        finalize: function (messageUpdate) {
	            // Shortcut
	            var hasher = this._hasher;

	            // Compute HMAC
	            var innerHash = hasher.finalize(messageUpdate);
	            hasher.reset();
	            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

	            return hmac;
	        }
	    });
	}());


}));

/***/ }),

/***/ 1354:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(4938), __webpack_require__(4433), __webpack_require__(298), __webpack_require__(8269), __webpack_require__(3786), __webpack_require__(8214), __webpack_require__(2783), __webpack_require__(2153), __webpack_require__(7792), __webpack_require__(34), __webpack_require__(7460), __webpack_require__(3327), __webpack_require__(706), __webpack_require__(9824), __webpack_require__(2112), __webpack_require__(888), __webpack_require__(5109), __webpack_require__(8568), __webpack_require__(4242), __webpack_require__(9968), __webpack_require__(7660), __webpack_require__(1148), __webpack_require__(3615), __webpack_require__(2807), __webpack_require__(1077), __webpack_require__(6475), __webpack_require__(6991), __webpack_require__(2209), __webpack_require__(452), __webpack_require__(4253), __webpack_require__(1857), __webpack_require__(4454), __webpack_require__(3974));
	}
	else {}
}(this, function (CryptoJS) {

	return CryptoJS;

}));

/***/ }),

/***/ 4433:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Check if typed arrays are supported
	    if (typeof ArrayBuffer != 'function') {
	        return;
	    }

	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;

	    // Reference original init
	    var superInit = WordArray.init;

	    // Augment WordArray.init to handle typed arrays
	    var subInit = WordArray.init = function (typedArray) {
	        // Convert buffers to uint8
	        if (typedArray instanceof ArrayBuffer) {
	            typedArray = new Uint8Array(typedArray);
	        }

	        // Convert other array views to uint8
	        if (
	            typedArray instanceof Int8Array ||
	            (typeof Uint8ClampedArray !== "undefined" && typedArray instanceof Uint8ClampedArray) ||
	            typedArray instanceof Int16Array ||
	            typedArray instanceof Uint16Array ||
	            typedArray instanceof Int32Array ||
	            typedArray instanceof Uint32Array ||
	            typedArray instanceof Float32Array ||
	            typedArray instanceof Float64Array
	        ) {
	            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
	        }

	        // Handle Uint8Array
	        if (typedArray instanceof Uint8Array) {
	            // Shortcut
	            var typedArrayByteLength = typedArray.byteLength;

	            // Extract bytes
	            var words = [];
	            for (var i = 0; i < typedArrayByteLength; i++) {
	                words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
	            }

	            // Initialize this word array
	            superInit.call(this, words, typedArrayByteLength);
	        } else {
	            // Else call normal init
	            superInit.apply(this, arguments);
	        }
	    };

	    subInit.prototype = WordArray;
	}());


	return CryptoJS.lib.WordArray;

}));

/***/ }),

/***/ 8214:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Constants table
	    var T = [];

	    // Compute constants
	    (function () {
	        for (var i = 0; i < 64; i++) {
	            T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
	        }
	    }());

	    /**
	     * MD5 hash algorithm.
	     */
	    var MD5 = C_algo.MD5 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0x67452301, 0xefcdab89,
	                0x98badcfe, 0x10325476
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Swap endian
	            for (var i = 0; i < 16; i++) {
	                // Shortcuts
	                var offset_i = offset + i;
	                var M_offset_i = M[offset_i];

	                M[offset_i] = (
	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	                );
	            }

	            // Shortcuts
	            var H = this._hash.words;

	            var M_offset_0  = M[offset + 0];
	            var M_offset_1  = M[offset + 1];
	            var M_offset_2  = M[offset + 2];
	            var M_offset_3  = M[offset + 3];
	            var M_offset_4  = M[offset + 4];
	            var M_offset_5  = M[offset + 5];
	            var M_offset_6  = M[offset + 6];
	            var M_offset_7  = M[offset + 7];
	            var M_offset_8  = M[offset + 8];
	            var M_offset_9  = M[offset + 9];
	            var M_offset_10 = M[offset + 10];
	            var M_offset_11 = M[offset + 11];
	            var M_offset_12 = M[offset + 12];
	            var M_offset_13 = M[offset + 13];
	            var M_offset_14 = M[offset + 14];
	            var M_offset_15 = M[offset + 15];

	            // Working varialbes
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];

	            // Computation
	            a = FF(a, b, c, d, M_offset_0,  7,  T[0]);
	            d = FF(d, a, b, c, M_offset_1,  12, T[1]);
	            c = FF(c, d, a, b, M_offset_2,  17, T[2]);
	            b = FF(b, c, d, a, M_offset_3,  22, T[3]);
	            a = FF(a, b, c, d, M_offset_4,  7,  T[4]);
	            d = FF(d, a, b, c, M_offset_5,  12, T[5]);
	            c = FF(c, d, a, b, M_offset_6,  17, T[6]);
	            b = FF(b, c, d, a, M_offset_7,  22, T[7]);
	            a = FF(a, b, c, d, M_offset_8,  7,  T[8]);
	            d = FF(d, a, b, c, M_offset_9,  12, T[9]);
	            c = FF(c, d, a, b, M_offset_10, 17, T[10]);
	            b = FF(b, c, d, a, M_offset_11, 22, T[11]);
	            a = FF(a, b, c, d, M_offset_12, 7,  T[12]);
	            d = FF(d, a, b, c, M_offset_13, 12, T[13]);
	            c = FF(c, d, a, b, M_offset_14, 17, T[14]);
	            b = FF(b, c, d, a, M_offset_15, 22, T[15]);

	            a = GG(a, b, c, d, M_offset_1,  5,  T[16]);
	            d = GG(d, a, b, c, M_offset_6,  9,  T[17]);
	            c = GG(c, d, a, b, M_offset_11, 14, T[18]);
	            b = GG(b, c, d, a, M_offset_0,  20, T[19]);
	            a = GG(a, b, c, d, M_offset_5,  5,  T[20]);
	            d = GG(d, a, b, c, M_offset_10, 9,  T[21]);
	            c = GG(c, d, a, b, M_offset_15, 14, T[22]);
	            b = GG(b, c, d, a, M_offset_4,  20, T[23]);
	            a = GG(a, b, c, d, M_offset_9,  5,  T[24]);
	            d = GG(d, a, b, c, M_offset_14, 9,  T[25]);
	            c = GG(c, d, a, b, M_offset_3,  14, T[26]);
	            b = GG(b, c, d, a, M_offset_8,  20, T[27]);
	            a = GG(a, b, c, d, M_offset_13, 5,  T[28]);
	            d = GG(d, a, b, c, M_offset_2,  9,  T[29]);
	            c = GG(c, d, a, b, M_offset_7,  14, T[30]);
	            b = GG(b, c, d, a, M_offset_12, 20, T[31]);

	            a = HH(a, b, c, d, M_offset_5,  4,  T[32]);
	            d = HH(d, a, b, c, M_offset_8,  11, T[33]);
	            c = HH(c, d, a, b, M_offset_11, 16, T[34]);
	            b = HH(b, c, d, a, M_offset_14, 23, T[35]);
	            a = HH(a, b, c, d, M_offset_1,  4,  T[36]);
	            d = HH(d, a, b, c, M_offset_4,  11, T[37]);
	            c = HH(c, d, a, b, M_offset_7,  16, T[38]);
	            b = HH(b, c, d, a, M_offset_10, 23, T[39]);
	            a = HH(a, b, c, d, M_offset_13, 4,  T[40]);
	            d = HH(d, a, b, c, M_offset_0,  11, T[41]);
	            c = HH(c, d, a, b, M_offset_3,  16, T[42]);
	            b = HH(b, c, d, a, M_offset_6,  23, T[43]);
	            a = HH(a, b, c, d, M_offset_9,  4,  T[44]);
	            d = HH(d, a, b, c, M_offset_12, 11, T[45]);
	            c = HH(c, d, a, b, M_offset_15, 16, T[46]);
	            b = HH(b, c, d, a, M_offset_2,  23, T[47]);

	            a = II(a, b, c, d, M_offset_0,  6,  T[48]);
	            d = II(d, a, b, c, M_offset_7,  10, T[49]);
	            c = II(c, d, a, b, M_offset_14, 15, T[50]);
	            b = II(b, c, d, a, M_offset_5,  21, T[51]);
	            a = II(a, b, c, d, M_offset_12, 6,  T[52]);
	            d = II(d, a, b, c, M_offset_3,  10, T[53]);
	            c = II(c, d, a, b, M_offset_10, 15, T[54]);
	            b = II(b, c, d, a, M_offset_1,  21, T[55]);
	            a = II(a, b, c, d, M_offset_8,  6,  T[56]);
	            d = II(d, a, b, c, M_offset_15, 10, T[57]);
	            c = II(c, d, a, b, M_offset_6,  15, T[58]);
	            b = II(b, c, d, a, M_offset_13, 21, T[59]);
	            a = II(a, b, c, d, M_offset_4,  6,  T[60]);
	            d = II(d, a, b, c, M_offset_11, 10, T[61]);
	            c = II(c, d, a, b, M_offset_2,  15, T[62]);
	            b = II(b, c, d, a, M_offset_9,  21, T[63]);

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);

	            var nBitsTotalH = Math.floor(nBitsTotal / 0x100000000);
	            var nBitsTotalL = nBitsTotal;
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = (
	                (((nBitsTotalH << 8)  | (nBitsTotalH >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotalH << 24) | (nBitsTotalH >>> 8))  & 0xff00ff00)
	            );
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	                (((nBitsTotalL << 8)  | (nBitsTotalL >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotalL << 24) | (nBitsTotalL >>> 8))  & 0xff00ff00)
	            );

	            data.sigBytes = (dataWords.length + 1) * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var hash = this._hash;
	            var H = hash.words;

	            // Swap endian
	            for (var i = 0; i < 4; i++) {
	                // Shortcut
	                var H_i = H[i];

	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	            }

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    function FF(a, b, c, d, x, s, t) {
	        var n = a + ((b & c) | (~b & d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function GG(a, b, c, d, x, s, t) {
	        var n = a + ((b & d) | (c & ~d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function HH(a, b, c, d, x, s, t) {
	        var n = a + (b ^ c ^ d) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    function II(a, b, c, d, x, s, t) {
	        var n = a + (c ^ (b | ~d)) + x + t;
	        return ((n << s) | (n >>> (32 - s))) + b;
	    }

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.MD5('message');
	     *     var hash = CryptoJS.MD5(wordArray);
	     */
	    C.MD5 = Hasher._createHelper(MD5);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacMD5(message, key);
	     */
	    C.HmacMD5 = Hasher._createHmacHelper(MD5);
	}(Math));


	return CryptoJS.MD5;

}));

/***/ }),

/***/ 8568:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * Cipher Feedback block mode.
	 */
	CryptoJS.mode.CFB = (function () {
	    var CFB = CryptoJS.lib.BlockCipherMode.extend();

	    CFB.Encryptor = CFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher;
	            var blockSize = cipher.blockSize;

	            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

	            // Remember this block to use with next block
	            this._prevBlock = words.slice(offset, offset + blockSize);
	        }
	    });

	    CFB.Decryptor = CFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher;
	            var blockSize = cipher.blockSize;

	            // Remember this block to use with next block
	            var thisBlock = words.slice(offset, offset + blockSize);

	            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

	            // This block becomes the previous block
	            this._prevBlock = thisBlock;
	        }
	    });

	    function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
	        var keystream;

	        // Shortcut
	        var iv = this._iv;

	        // Generate keystream
	        if (iv) {
	            keystream = iv.slice(0);

	            // Remove IV for subsequent blocks
	            this._iv = undefined;
	        } else {
	            keystream = this._prevBlock;
	        }
	        cipher.encryptBlock(keystream, 0);

	        // Encrypt
	        for (var i = 0; i < blockSize; i++) {
	            words[offset + i] ^= keystream[i];
	        }
	    }

	    return CFB;
	}());


	return CryptoJS.mode.CFB;

}));

/***/ }),

/***/ 9968:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/** @preserve
	 * Counter block mode compatible with  Dr Brian Gladman fileenc.c
	 * derived from CryptoJS.mode.CTR
	 * Jan Hruby jhruby.web@gmail.com
	 */
	CryptoJS.mode.CTRGladman = (function () {
	    var CTRGladman = CryptoJS.lib.BlockCipherMode.extend();

		function incWord(word)
		{
			if (((word >> 24) & 0xff) === 0xff) { //overflow
			var b1 = (word >> 16)&0xff;
			var b2 = (word >> 8)&0xff;
			var b3 = word & 0xff;

			if (b1 === 0xff) // overflow b1
			{
			b1 = 0;
			if (b2 === 0xff)
			{
				b2 = 0;
				if (b3 === 0xff)
				{
					b3 = 0;
				}
				else
				{
					++b3;
				}
			}
			else
			{
				++b2;
			}
			}
			else
			{
			++b1;
			}

			word = 0;
			word += (b1 << 16);
			word += (b2 << 8);
			word += b3;
			}
			else
			{
			word += (0x01 << 24);
			}
			return word;
		}

		function incCounter(counter)
		{
			if ((counter[0] = incWord(counter[0])) === 0)
			{
				// encr_data in fileenc.c from  Dr Brian Gladman's counts only with DWORD j < 8
				counter[1] = incWord(counter[1]);
			}
			return counter;
		}

	    var Encryptor = CTRGladman.Encryptor = CTRGladman.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var counter = this._counter;

	            // Generate keystream
	            if (iv) {
	                counter = this._counter = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }

				incCounter(counter);

				var keystream = counter.slice(0);
	            cipher.encryptBlock(keystream, 0);

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    CTRGladman.Decryptor = Encryptor;

	    return CTRGladman;
	}());




	return CryptoJS.mode.CTRGladman;

}));

/***/ }),

/***/ 4242:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * Counter block mode.
	 */
	CryptoJS.mode.CTR = (function () {
	    var CTR = CryptoJS.lib.BlockCipherMode.extend();

	    var Encryptor = CTR.Encryptor = CTR.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var counter = this._counter;

	            // Generate keystream
	            if (iv) {
	                counter = this._counter = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }
	            var keystream = counter.slice(0);
	            cipher.encryptBlock(keystream, 0);

	            // Increment counter
	            counter[blockSize - 1] = (counter[blockSize - 1] + 1) | 0

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    CTR.Decryptor = Encryptor;

	    return CTR;
	}());


	return CryptoJS.mode.CTR;

}));

/***/ }),

/***/ 1148:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * Electronic Codebook block mode.
	 */
	CryptoJS.mode.ECB = (function () {
	    var ECB = CryptoJS.lib.BlockCipherMode.extend();

	    ECB.Encryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.encryptBlock(words, offset);
	        }
	    });

	    ECB.Decryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.decryptBlock(words, offset);
	        }
	    });

	    return ECB;
	}());


	return CryptoJS.mode.ECB;

}));

/***/ }),

/***/ 7660:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * Output Feedback block mode.
	 */
	CryptoJS.mode.OFB = (function () {
	    var OFB = CryptoJS.lib.BlockCipherMode.extend();

	    var Encryptor = OFB.Encryptor = OFB.extend({
	        processBlock: function (words, offset) {
	            // Shortcuts
	            var cipher = this._cipher
	            var blockSize = cipher.blockSize;
	            var iv = this._iv;
	            var keystream = this._keystream;

	            // Generate keystream
	            if (iv) {
	                keystream = this._keystream = iv.slice(0);

	                // Remove IV for subsequent blocks
	                this._iv = undefined;
	            }
	            cipher.encryptBlock(keystream, 0);

	            // Encrypt
	            for (var i = 0; i < blockSize; i++) {
	                words[offset + i] ^= keystream[i];
	            }
	        }
	    });

	    OFB.Decryptor = Encryptor;

	    return OFB;
	}());


	return CryptoJS.mode.OFB;

}));

/***/ }),

/***/ 3615:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * ANSI X.923 padding strategy.
	 */
	CryptoJS.pad.AnsiX923 = {
	    pad: function (data, blockSize) {
	        // Shortcuts
	        var dataSigBytes = data.sigBytes;
	        var blockSizeBytes = blockSize * 4;

	        // Count padding bytes
	        var nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;

	        // Compute last byte position
	        var lastBytePos = dataSigBytes + nPaddingBytes - 1;

	        // Pad
	        data.clamp();
	        data.words[lastBytePos >>> 2] |= nPaddingBytes << (24 - (lastBytePos % 4) * 8);
	        data.sigBytes += nPaddingBytes;
	    },

	    unpad: function (data) {
	        // Get number of padding bytes from last byte
	        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	        // Remove padding
	        data.sigBytes -= nPaddingBytes;
	    }
	};


	return CryptoJS.pad.Ansix923;

}));

/***/ }),

/***/ 2807:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * ISO 10126 padding strategy.
	 */
	CryptoJS.pad.Iso10126 = {
	    pad: function (data, blockSize) {
	        // Shortcut
	        var blockSizeBytes = blockSize * 4;

	        // Count padding bytes
	        var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

	        // Pad
	        data.concat(CryptoJS.lib.WordArray.random(nPaddingBytes - 1)).
	             concat(CryptoJS.lib.WordArray.create([nPaddingBytes << 24], 1));
	    },

	    unpad: function (data) {
	        // Get number of padding bytes from last byte
	        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

	        // Remove padding
	        data.sigBytes -= nPaddingBytes;
	    }
	};


	return CryptoJS.pad.Iso10126;

}));

/***/ }),

/***/ 1077:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * ISO/IEC 9797-1 Padding Method 2.
	 */
	CryptoJS.pad.Iso97971 = {
	    pad: function (data, blockSize) {
	        // Add 0x80 byte
	        data.concat(CryptoJS.lib.WordArray.create([0x80000000], 1));

	        // Zero pad the rest
	        CryptoJS.pad.ZeroPadding.pad(data, blockSize);
	    },

	    unpad: function (data) {
	        // Remove zero padding
	        CryptoJS.pad.ZeroPadding.unpad(data);

	        // Remove one more byte -- the 0x80 byte
	        data.sigBytes--;
	    }
	};


	return CryptoJS.pad.Iso97971;

}));

/***/ }),

/***/ 6991:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * A noop padding strategy.
	 */
	CryptoJS.pad.NoPadding = {
	    pad: function () {
	    },

	    unpad: function () {
	    }
	};


	return CryptoJS.pad.NoPadding;

}));

/***/ }),

/***/ 6475:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	/**
	 * Zero padding strategy.
	 */
	CryptoJS.pad.ZeroPadding = {
	    pad: function (data, blockSize) {
	        // Shortcut
	        var blockSizeBytes = blockSize * 4;

	        // Pad
	        data.clamp();
	        data.sigBytes += blockSizeBytes - ((data.sigBytes % blockSizeBytes) || blockSizeBytes);
	    },

	    unpad: function (data) {
	        // Shortcut
	        var dataWords = data.words;

	        // Unpad
	        var i = data.sigBytes - 1;
	        for (var i = data.sigBytes - 1; i >= 0; i--) {
	            if (((dataWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff)) {
	                data.sigBytes = i + 1;
	                break;
	            }
	        }
	    }
	};


	return CryptoJS.pad.ZeroPadding;

}));

/***/ }),

/***/ 2112:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(2783), __webpack_require__(9824));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var SHA1 = C_algo.SHA1;
	    var HMAC = C_algo.HMAC;

	    /**
	     * Password-Based Key Derivation Function 2 algorithm.
	     */
	    var PBKDF2 = C_algo.PBKDF2 = Base.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
	         * @property {Hasher} hasher The hasher to use. Default: SHA1
	         * @property {number} iterations The number of iterations to perform. Default: 1
	         */
	        cfg: Base.extend({
	            keySize: 128/32,
	            hasher: SHA1,
	            iterations: 1
	        }),

	        /**
	         * Initializes a newly created key derivation function.
	         *
	         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
	         *
	         * @example
	         *
	         *     var kdf = CryptoJS.algo.PBKDF2.create();
	         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
	         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
	         */
	        init: function (cfg) {
	            this.cfg = this.cfg.extend(cfg);
	        },

	        /**
	         * Computes the Password-Based Key Derivation Function 2.
	         *
	         * @param {WordArray|string} password The password.
	         * @param {WordArray|string} salt A salt.
	         *
	         * @return {WordArray} The derived key.
	         *
	         * @example
	         *
	         *     var key = kdf.compute(password, salt);
	         */
	        compute: function (password, salt) {
	            // Shortcut
	            var cfg = this.cfg;

	            // Init HMAC
	            var hmac = HMAC.create(cfg.hasher, password);

	            // Initial values
	            var derivedKey = WordArray.create();
	            var blockIndex = WordArray.create([0x00000001]);

	            // Shortcuts
	            var derivedKeyWords = derivedKey.words;
	            var blockIndexWords = blockIndex.words;
	            var keySize = cfg.keySize;
	            var iterations = cfg.iterations;

	            // Generate key
	            while (derivedKeyWords.length < keySize) {
	                var block = hmac.update(salt).finalize(blockIndex);
	                hmac.reset();

	                // Shortcuts
	                var blockWords = block.words;
	                var blockWordsLength = blockWords.length;

	                // Iterations
	                var intermediate = block;
	                for (var i = 1; i < iterations; i++) {
	                    intermediate = hmac.finalize(intermediate);
	                    hmac.reset();

	                    // Shortcut
	                    var intermediateWords = intermediate.words;

	                    // XOR intermediate with block
	                    for (var j = 0; j < blockWordsLength; j++) {
	                        blockWords[j] ^= intermediateWords[j];
	                    }
	                }

	                derivedKey.concat(block);
	                blockIndexWords[0]++;
	            }
	            derivedKey.sigBytes = keySize * 4;

	            return derivedKey;
	        }
	    });

	    /**
	     * Computes the Password-Based Key Derivation Function 2.
	     *
	     * @param {WordArray|string} password The password.
	     * @param {WordArray|string} salt A salt.
	     * @param {Object} cfg (Optional) The configuration options to use for this computation.
	     *
	     * @return {WordArray} The derived key.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var key = CryptoJS.PBKDF2(password, salt);
	     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
	     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
	     */
	    C.PBKDF2 = function (password, salt, cfg) {
	        return PBKDF2.create(cfg).compute(password, salt);
	    };
	}());


	return CryptoJS.PBKDF2;

}));

/***/ }),

/***/ 3974:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(8269), __webpack_require__(8214), __webpack_require__(888), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    // Reusable objects
	    var S  = [];
	    var C_ = [];
	    var G  = [];

	    /**
	     * Rabbit stream cipher algorithm.
	     *
	     * This is a legacy version that neglected to convert the key to little-endian.
	     * This error doesn't affect the cipher's security,
	     * but it does affect its compatibility with other implementations.
	     */
	    var RabbitLegacy = C_algo.RabbitLegacy = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var K = this._key.words;
	            var iv = this.cfg.iv;

	            // Generate initial state values
	            var X = this._X = [
	                K[0], (K[3] << 16) | (K[2] >>> 16),
	                K[1], (K[0] << 16) | (K[3] >>> 16),
	                K[2], (K[1] << 16) | (K[0] >>> 16),
	                K[3], (K[2] << 16) | (K[1] >>> 16)
	            ];

	            // Generate initial counter values
	            var C = this._C = [
	                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
	                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
	                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
	                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
	            ];

	            // Carry bit
	            this._b = 0;

	            // Iterate the system four times
	            for (var i = 0; i < 4; i++) {
	                nextState.call(this);
	            }

	            // Modify the counters
	            for (var i = 0; i < 8; i++) {
	                C[i] ^= X[(i + 4) & 7];
	            }

	            // IV setup
	            if (iv) {
	                // Shortcuts
	                var IV = iv.words;
	                var IV_0 = IV[0];
	                var IV_1 = IV[1];

	                // Generate four subvectors
	                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
	                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
	                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
	                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

	                // Modify counter values
	                C[0] ^= i0;
	                C[1] ^= i1;
	                C[2] ^= i2;
	                C[3] ^= i3;
	                C[4] ^= i0;
	                C[5] ^= i1;
	                C[6] ^= i2;
	                C[7] ^= i3;

	                // Iterate the system four times
	                for (var i = 0; i < 4; i++) {
	                    nextState.call(this);
	                }
	            }
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var X = this._X;

	            // Iterate the system
	            nextState.call(this);

	            // Generate four keystream words
	            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
	            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
	            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
	            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

	            for (var i = 0; i < 4; i++) {
	                // Swap endian
	                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
	                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

	                // Encrypt
	                M[offset + i] ^= S[i];
	            }
	        },

	        blockSize: 128/32,

	        ivSize: 64/32
	    });

	    function nextState() {
	        // Shortcuts
	        var X = this._X;
	        var C = this._C;

	        // Save old counter values
	        for (var i = 0; i < 8; i++) {
	            C_[i] = C[i];
	        }

	        // Calculate new counter values
	        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
	        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
	        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
	        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
	        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
	        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
	        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
	        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
	        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

	        // Calculate the g-values
	        for (var i = 0; i < 8; i++) {
	            var gx = X[i] + C[i];

	            // Construct high and low argument for squaring
	            var ga = gx & 0xffff;
	            var gb = gx >>> 16;

	            // Calculate high and low result of squaring
	            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
	            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

	            // High XOR low
	            G[i] = gh ^ gl;
	        }

	        // Calculate new state values
	        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
	        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
	        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
	        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
	        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
	        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
	        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
	        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RabbitLegacy.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RabbitLegacy.decrypt(ciphertext, key, cfg);
	     */
	    C.RabbitLegacy = StreamCipher._createHelper(RabbitLegacy);
	}());


	return CryptoJS.RabbitLegacy;

}));

/***/ }),

/***/ 4454:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(8269), __webpack_require__(8214), __webpack_require__(888), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    // Reusable objects
	    var S  = [];
	    var C_ = [];
	    var G  = [];

	    /**
	     * Rabbit stream cipher algorithm
	     */
	    var Rabbit = C_algo.Rabbit = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var K = this._key.words;
	            var iv = this.cfg.iv;

	            // Swap endian
	            for (var i = 0; i < 4; i++) {
	                K[i] = (((K[i] << 8)  | (K[i] >>> 24)) & 0x00ff00ff) |
	                       (((K[i] << 24) | (K[i] >>> 8))  & 0xff00ff00);
	            }

	            // Generate initial state values
	            var X = this._X = [
	                K[0], (K[3] << 16) | (K[2] >>> 16),
	                K[1], (K[0] << 16) | (K[3] >>> 16),
	                K[2], (K[1] << 16) | (K[0] >>> 16),
	                K[3], (K[2] << 16) | (K[1] >>> 16)
	            ];

	            // Generate initial counter values
	            var C = this._C = [
	                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
	                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
	                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
	                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
	            ];

	            // Carry bit
	            this._b = 0;

	            // Iterate the system four times
	            for (var i = 0; i < 4; i++) {
	                nextState.call(this);
	            }

	            // Modify the counters
	            for (var i = 0; i < 8; i++) {
	                C[i] ^= X[(i + 4) & 7];
	            }

	            // IV setup
	            if (iv) {
	                // Shortcuts
	                var IV = iv.words;
	                var IV_0 = IV[0];
	                var IV_1 = IV[1];

	                // Generate four subvectors
	                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
	                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
	                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
	                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

	                // Modify counter values
	                C[0] ^= i0;
	                C[1] ^= i1;
	                C[2] ^= i2;
	                C[3] ^= i3;
	                C[4] ^= i0;
	                C[5] ^= i1;
	                C[6] ^= i2;
	                C[7] ^= i3;

	                // Iterate the system four times
	                for (var i = 0; i < 4; i++) {
	                    nextState.call(this);
	                }
	            }
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var X = this._X;

	            // Iterate the system
	            nextState.call(this);

	            // Generate four keystream words
	            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
	            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
	            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
	            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

	            for (var i = 0; i < 4; i++) {
	                // Swap endian
	                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
	                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

	                // Encrypt
	                M[offset + i] ^= S[i];
	            }
	        },

	        blockSize: 128/32,

	        ivSize: 64/32
	    });

	    function nextState() {
	        // Shortcuts
	        var X = this._X;
	        var C = this._C;

	        // Save old counter values
	        for (var i = 0; i < 8; i++) {
	            C_[i] = C[i];
	        }

	        // Calculate new counter values
	        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
	        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
	        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
	        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
	        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
	        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
	        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
	        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
	        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

	        // Calculate the g-values
	        for (var i = 0; i < 8; i++) {
	            var gx = X[i] + C[i];

	            // Construct high and low argument for squaring
	            var ga = gx & 0xffff;
	            var gb = gx >>> 16;

	            // Calculate high and low result of squaring
	            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
	            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

	            // High XOR low
	            G[i] = gh ^ gl;
	        }

	        // Calculate new state values
	        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
	        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
	        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
	        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
	        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
	        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
	        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
	        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.Rabbit.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.Rabbit.decrypt(ciphertext, key, cfg);
	     */
	    C.Rabbit = StreamCipher._createHelper(Rabbit);
	}());


	return CryptoJS.Rabbit;

}));

/***/ }),

/***/ 1857:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(8269), __webpack_require__(8214), __webpack_require__(888), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var StreamCipher = C_lib.StreamCipher;
	    var C_algo = C.algo;

	    /**
	     * RC4 stream cipher algorithm.
	     */
	    var RC4 = C_algo.RC4 = StreamCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;
	            var keySigBytes = key.sigBytes;

	            // Init sbox
	            var S = this._S = [];
	            for (var i = 0; i < 256; i++) {
	                S[i] = i;
	            }

	            // Key setup
	            for (var i = 0, j = 0; i < 256; i++) {
	                var keyByteIndex = i % keySigBytes;
	                var keyByte = (keyWords[keyByteIndex >>> 2] >>> (24 - (keyByteIndex % 4) * 8)) & 0xff;

	                j = (j + S[i] + keyByte) % 256;

	                // Swap
	                var t = S[i];
	                S[i] = S[j];
	                S[j] = t;
	            }

	            // Counters
	            this._i = this._j = 0;
	        },

	        _doProcessBlock: function (M, offset) {
	            M[offset] ^= generateKeystreamWord.call(this);
	        },

	        keySize: 256/32,

	        ivSize: 0
	    });

	    function generateKeystreamWord() {
	        // Shortcuts
	        var S = this._S;
	        var i = this._i;
	        var j = this._j;

	        // Generate keystream word
	        var keystreamWord = 0;
	        for (var n = 0; n < 4; n++) {
	            i = (i + 1) % 256;
	            j = (j + S[i]) % 256;

	            // Swap
	            var t = S[i];
	            S[i] = S[j];
	            S[j] = t;

	            keystreamWord |= S[(S[i] + S[j]) % 256] << (24 - n * 8);
	        }

	        // Update counters
	        this._i = i;
	        this._j = j;

	        return keystreamWord;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RC4.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RC4.decrypt(ciphertext, key, cfg);
	     */
	    C.RC4 = StreamCipher._createHelper(RC4);

	    /**
	     * Modified RC4 stream cipher algorithm.
	     */
	    var RC4Drop = C_algo.RC4Drop = RC4.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} drop The number of keystream words to drop. Default 192
	         */
	        cfg: RC4.cfg.extend({
	            drop: 192
	        }),

	        _doReset: function () {
	            RC4._doReset.call(this);

	            // Drop
	            for (var i = this.cfg.drop; i > 0; i--) {
	                generateKeystreamWord.call(this);
	            }
	        }
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.RC4Drop.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.RC4Drop.decrypt(ciphertext, key, cfg);
	     */
	    C.RC4Drop = StreamCipher._createHelper(RC4Drop);
	}());


	return CryptoJS.RC4;

}));

/***/ }),

/***/ 706:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Constants table
	    var _zl = WordArray.create([
	        0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
	        7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
	        3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
	        1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
	        4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13]);
	    var _zr = WordArray.create([
	        5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
	        6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
	        15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
	        8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
	        12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11]);
	    var _sl = WordArray.create([
	         11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
	        7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
	        11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
	          11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
	        9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ]);
	    var _sr = WordArray.create([
	        8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
	        9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
	        9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
	        15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
	        8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ]);

	    var _hl =  WordArray.create([ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E]);
	    var _hr =  WordArray.create([ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000]);

	    /**
	     * RIPEMD160 hash algorithm.
	     */
	    var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
	        _doReset: function () {
	            this._hash  = WordArray.create([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]);
	        },

	        _doProcessBlock: function (M, offset) {

	            // Swap endian
	            for (var i = 0; i < 16; i++) {
	                // Shortcuts
	                var offset_i = offset + i;
	                var M_offset_i = M[offset_i];

	                // Swap
	                M[offset_i] = (
	                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	                );
	            }
	            // Shortcut
	            var H  = this._hash.words;
	            var hl = _hl.words;
	            var hr = _hr.words;
	            var zl = _zl.words;
	            var zr = _zr.words;
	            var sl = _sl.words;
	            var sr = _sr.words;

	            // Working variables
	            var al, bl, cl, dl, el;
	            var ar, br, cr, dr, er;

	            ar = al = H[0];
	            br = bl = H[1];
	            cr = cl = H[2];
	            dr = dl = H[3];
	            er = el = H[4];
	            // Computation
	            var t;
	            for (var i = 0; i < 80; i += 1) {
	                t = (al +  M[offset+zl[i]])|0;
	                if (i<16){
		            t +=  f1(bl,cl,dl) + hl[0];
	                } else if (i<32) {
		            t +=  f2(bl,cl,dl) + hl[1];
	                } else if (i<48) {
		            t +=  f3(bl,cl,dl) + hl[2];
	                } else if (i<64) {
		            t +=  f4(bl,cl,dl) + hl[3];
	                } else {// if (i<80) {
		            t +=  f5(bl,cl,dl) + hl[4];
	                }
	                t = t|0;
	                t =  rotl(t,sl[i]);
	                t = (t+el)|0;
	                al = el;
	                el = dl;
	                dl = rotl(cl, 10);
	                cl = bl;
	                bl = t;

	                t = (ar + M[offset+zr[i]])|0;
	                if (i<16){
		            t +=  f5(br,cr,dr) + hr[0];
	                } else if (i<32) {
		            t +=  f4(br,cr,dr) + hr[1];
	                } else if (i<48) {
		            t +=  f3(br,cr,dr) + hr[2];
	                } else if (i<64) {
		            t +=  f2(br,cr,dr) + hr[3];
	                } else {// if (i<80) {
		            t +=  f1(br,cr,dr) + hr[4];
	                }
	                t = t|0;
	                t =  rotl(t,sr[i]) ;
	                t = (t+er)|0;
	                ar = er;
	                er = dr;
	                dr = rotl(cr, 10);
	                cr = br;
	                br = t;
	            }
	            // Intermediate hash value
	            t    = (H[1] + cl + dr)|0;
	            H[1] = (H[2] + dl + er)|0;
	            H[2] = (H[3] + el + ar)|0;
	            H[3] = (H[4] + al + br)|0;
	            H[4] = (H[0] + bl + cr)|0;
	            H[0] =  t;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	                (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
	                (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
	            );
	            data.sigBytes = (dataWords.length + 1) * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var hash = this._hash;
	            var H = hash.words;

	            // Swap endian
	            for (var i = 0; i < 5; i++) {
	                // Shortcut
	                var H_i = H[i];

	                // Swap
	                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	            }

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });


	    function f1(x, y, z) {
	        return ((x) ^ (y) ^ (z));

	    }

	    function f2(x, y, z) {
	        return (((x)&(y)) | ((~x)&(z)));
	    }

	    function f3(x, y, z) {
	        return (((x) | (~(y))) ^ (z));
	    }

	    function f4(x, y, z) {
	        return (((x) & (z)) | ((y)&(~(z))));
	    }

	    function f5(x, y, z) {
	        return ((x) ^ ((y) |(~(z))));

	    }

	    function rotl(x,n) {
	        return (x<<n) | (x>>>(32-n));
	    }


	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.RIPEMD160('message');
	     *     var hash = CryptoJS.RIPEMD160(wordArray);
	     */
	    C.RIPEMD160 = Hasher._createHelper(RIPEMD160);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacRIPEMD160(message, key);
	     */
	    C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
	}(Math));


	return CryptoJS.RIPEMD160;

}));

/***/ }),

/***/ 2783:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-1 hash algorithm.
	     */
	    var SHA1 = C_algo.SHA1 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0x67452301, 0xefcdab89,
	                0x98badcfe, 0x10325476,
	                0xc3d2e1f0
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];

	            // Computation
	            for (var i = 0; i < 80; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
	                    W[i] = (n << 1) | (n >>> 31);
	                }

	                var t = ((a << 5) | (a >>> 27)) + e + W[i];
	                if (i < 20) {
	                    t += ((b & c) | (~b & d)) + 0x5a827999;
	                } else if (i < 40) {
	                    t += (b ^ c ^ d) + 0x6ed9eba1;
	                } else if (i < 60) {
	                    t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
	                } else /* if (i < 80) */ {
	                    t += (b ^ c ^ d) - 0x359d3e2a;
	                }

	                e = d;
	                d = c;
	                c = (b << 30) | (b >>> 2);
	                b = a;
	                a = t;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA1('message');
	     *     var hash = CryptoJS.SHA1(wordArray);
	     */
	    C.SHA1 = Hasher._createHelper(SHA1);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA1(message, key);
	     */
	    C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
	}());


	return CryptoJS.SHA1;

}));

/***/ }),

/***/ 7792:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(2153));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var C_algo = C.algo;
	    var SHA256 = C_algo.SHA256;

	    /**
	     * SHA-224 hash algorithm.
	     */
	    var SHA224 = C_algo.SHA224 = SHA256.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init([
	                0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
	                0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
	            ]);
	        },

	        _doFinalize: function () {
	            var hash = SHA256._doFinalize.call(this);

	            hash.sigBytes -= 4;

	            return hash;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA224('message');
	     *     var hash = CryptoJS.SHA224(wordArray);
	     */
	    C.SHA224 = SHA256._createHelper(SHA224);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA224(message, key);
	     */
	    C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
	}());


	return CryptoJS.SHA224;

}));

/***/ }),

/***/ 2153:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_algo = C.algo;

	    // Initialization and round constants tables
	    var H = [];
	    var K = [];

	    // Compute constants
	    (function () {
	        function isPrime(n) {
	            var sqrtN = Math.sqrt(n);
	            for (var factor = 2; factor <= sqrtN; factor++) {
	                if (!(n % factor)) {
	                    return false;
	                }
	            }

	            return true;
	        }

	        function getFractionalBits(n) {
	            return ((n - (n | 0)) * 0x100000000) | 0;
	        }

	        var n = 2;
	        var nPrime = 0;
	        while (nPrime < 64) {
	            if (isPrime(n)) {
	                if (nPrime < 8) {
	                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
	                }
	                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

	                nPrime++;
	            }

	            n++;
	        }
	    }());

	    // Reusable object
	    var W = [];

	    /**
	     * SHA-256 hash algorithm.
	     */
	    var SHA256 = C_algo.SHA256 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new WordArray.init(H.slice(0));
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcut
	            var H = this._hash.words;

	            // Working variables
	            var a = H[0];
	            var b = H[1];
	            var c = H[2];
	            var d = H[3];
	            var e = H[4];
	            var f = H[5];
	            var g = H[6];
	            var h = H[7];

	            // Computation
	            for (var i = 0; i < 64; i++) {
	                if (i < 16) {
	                    W[i] = M[offset + i] | 0;
	                } else {
	                    var gamma0x = W[i - 15];
	                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
	                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
	                                   (gamma0x >>> 3);

	                    var gamma1x = W[i - 2];
	                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
	                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
	                                   (gamma1x >>> 10);

	                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
	                }

	                var ch  = (e & f) ^ (~e & g);
	                var maj = (a & b) ^ (a & c) ^ (b & c);

	                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
	                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

	                var t1 = h + sigma1 + ch + K[i] + W[i];
	                var t2 = sigma0 + maj;

	                h = g;
	                g = f;
	                f = e;
	                e = (d + t1) | 0;
	                d = c;
	                c = b;
	                b = a;
	                a = (t1 + t2) | 0;
	            }

	            // Intermediate hash value
	            H[0] = (H[0] + a) | 0;
	            H[1] = (H[1] + b) | 0;
	            H[2] = (H[2] + c) | 0;
	            H[3] = (H[3] + d) | 0;
	            H[4] = (H[4] + e) | 0;
	            H[5] = (H[5] + f) | 0;
	            H[6] = (H[6] + g) | 0;
	            H[7] = (H[7] + h) | 0;
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Return final computed hash
	            return this._hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA256('message');
	     *     var hash = CryptoJS.SHA256(wordArray);
	     */
	    C.SHA256 = Hasher._createHelper(SHA256);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA256(message, key);
	     */
	    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
	}(Math));


	return CryptoJS.SHA256;

}));

/***/ }),

/***/ 3327:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(4938));
	}
	else {}
}(this, function (CryptoJS) {

	(function (Math) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var Hasher = C_lib.Hasher;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var C_algo = C.algo;

	    // Constants tables
	    var RHO_OFFSETS = [];
	    var PI_INDEXES  = [];
	    var ROUND_CONSTANTS = [];

	    // Compute Constants
	    (function () {
	        // Compute rho offset constants
	        var x = 1, y = 0;
	        for (var t = 0; t < 24; t++) {
	            RHO_OFFSETS[x + 5 * y] = ((t + 1) * (t + 2) / 2) % 64;

	            var newX = y % 5;
	            var newY = (2 * x + 3 * y) % 5;
	            x = newX;
	            y = newY;
	        }

	        // Compute pi index constants
	        for (var x = 0; x < 5; x++) {
	            for (var y = 0; y < 5; y++) {
	                PI_INDEXES[x + 5 * y] = y + ((2 * x + 3 * y) % 5) * 5;
	            }
	        }

	        // Compute round constants
	        var LFSR = 0x01;
	        for (var i = 0; i < 24; i++) {
	            var roundConstantMsw = 0;
	            var roundConstantLsw = 0;

	            for (var j = 0; j < 7; j++) {
	                if (LFSR & 0x01) {
	                    var bitPosition = (1 << j) - 1;
	                    if (bitPosition < 32) {
	                        roundConstantLsw ^= 1 << bitPosition;
	                    } else /* if (bitPosition >= 32) */ {
	                        roundConstantMsw ^= 1 << (bitPosition - 32);
	                    }
	                }

	                // Compute next LFSR
	                if (LFSR & 0x80) {
	                    // Primitive polynomial over GF(2): x^8 + x^6 + x^5 + x^4 + 1
	                    LFSR = (LFSR << 1) ^ 0x71;
	                } else {
	                    LFSR <<= 1;
	                }
	            }

	            ROUND_CONSTANTS[i] = X64Word.create(roundConstantMsw, roundConstantLsw);
	        }
	    }());

	    // Reusable objects for temporary values
	    var T = [];
	    (function () {
	        for (var i = 0; i < 25; i++) {
	            T[i] = X64Word.create();
	        }
	    }());

	    /**
	     * SHA-3 hash algorithm.
	     */
	    var SHA3 = C_algo.SHA3 = Hasher.extend({
	        /**
	         * Configuration options.
	         *
	         * @property {number} outputLength
	         *   The desired number of bits in the output hash.
	         *   Only values permitted are: 224, 256, 384, 512.
	         *   Default: 512
	         */
	        cfg: Hasher.cfg.extend({
	            outputLength: 512
	        }),

	        _doReset: function () {
	            var state = this._state = []
	            for (var i = 0; i < 25; i++) {
	                state[i] = new X64Word.init();
	            }

	            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcuts
	            var state = this._state;
	            var nBlockSizeLanes = this.blockSize / 2;

	            // Absorb
	            for (var i = 0; i < nBlockSizeLanes; i++) {
	                // Shortcuts
	                var M2i  = M[offset + 2 * i];
	                var M2i1 = M[offset + 2 * i + 1];

	                // Swap endian
	                M2i = (
	                    (((M2i << 8)  | (M2i >>> 24)) & 0x00ff00ff) |
	                    (((M2i << 24) | (M2i >>> 8))  & 0xff00ff00)
	                );
	                M2i1 = (
	                    (((M2i1 << 8)  | (M2i1 >>> 24)) & 0x00ff00ff) |
	                    (((M2i1 << 24) | (M2i1 >>> 8))  & 0xff00ff00)
	                );

	                // Absorb message into state
	                var lane = state[i];
	                lane.high ^= M2i1;
	                lane.low  ^= M2i;
	            }

	            // Rounds
	            for (var round = 0; round < 24; round++) {
	                // Theta
	                for (var x = 0; x < 5; x++) {
	                    // Mix column lanes
	                    var tMsw = 0, tLsw = 0;
	                    for (var y = 0; y < 5; y++) {
	                        var lane = state[x + 5 * y];
	                        tMsw ^= lane.high;
	                        tLsw ^= lane.low;
	                    }

	                    // Temporary values
	                    var Tx = T[x];
	                    Tx.high = tMsw;
	                    Tx.low  = tLsw;
	                }
	                for (var x = 0; x < 5; x++) {
	                    // Shortcuts
	                    var Tx4 = T[(x + 4) % 5];
	                    var Tx1 = T[(x + 1) % 5];
	                    var Tx1Msw = Tx1.high;
	                    var Tx1Lsw = Tx1.low;

	                    // Mix surrounding columns
	                    var tMsw = Tx4.high ^ ((Tx1Msw << 1) | (Tx1Lsw >>> 31));
	                    var tLsw = Tx4.low  ^ ((Tx1Lsw << 1) | (Tx1Msw >>> 31));
	                    for (var y = 0; y < 5; y++) {
	                        var lane = state[x + 5 * y];
	                        lane.high ^= tMsw;
	                        lane.low  ^= tLsw;
	                    }
	                }

	                // Rho Pi
	                for (var laneIndex = 1; laneIndex < 25; laneIndex++) {
	                    var tMsw;
	                    var tLsw;

	                    // Shortcuts
	                    var lane = state[laneIndex];
	                    var laneMsw = lane.high;
	                    var laneLsw = lane.low;
	                    var rhoOffset = RHO_OFFSETS[laneIndex];

	                    // Rotate lanes
	                    if (rhoOffset < 32) {
	                        tMsw = (laneMsw << rhoOffset) | (laneLsw >>> (32 - rhoOffset));
	                        tLsw = (laneLsw << rhoOffset) | (laneMsw >>> (32 - rhoOffset));
	                    } else /* if (rhoOffset >= 32) */ {
	                        tMsw = (laneLsw << (rhoOffset - 32)) | (laneMsw >>> (64 - rhoOffset));
	                        tLsw = (laneMsw << (rhoOffset - 32)) | (laneLsw >>> (64 - rhoOffset));
	                    }

	                    // Transpose lanes
	                    var TPiLane = T[PI_INDEXES[laneIndex]];
	                    TPiLane.high = tMsw;
	                    TPiLane.low  = tLsw;
	                }

	                // Rho pi at x = y = 0
	                var T0 = T[0];
	                var state0 = state[0];
	                T0.high = state0.high;
	                T0.low  = state0.low;

	                // Chi
	                for (var x = 0; x < 5; x++) {
	                    for (var y = 0; y < 5; y++) {
	                        // Shortcuts
	                        var laneIndex = x + 5 * y;
	                        var lane = state[laneIndex];
	                        var TLane = T[laneIndex];
	                        var Tx1Lane = T[((x + 1) % 5) + 5 * y];
	                        var Tx2Lane = T[((x + 2) % 5) + 5 * y];

	                        // Mix rows
	                        lane.high = TLane.high ^ (~Tx1Lane.high & Tx2Lane.high);
	                        lane.low  = TLane.low  ^ (~Tx1Lane.low  & Tx2Lane.low);
	                    }
	                }

	                // Iota
	                var lane = state[0];
	                var roundConstant = ROUND_CONSTANTS[round];
	                lane.high ^= roundConstant.high;
	                lane.low  ^= roundConstant.low;
	            }
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;
	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;
	            var blockSizeBits = this.blockSize * 32;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x1 << (24 - nBitsLeft % 32);
	            dataWords[((Math.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits) >>> 5) - 1] |= 0x80;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Shortcuts
	            var state = this._state;
	            var outputLengthBytes = this.cfg.outputLength / 8;
	            var outputLengthLanes = outputLengthBytes / 8;

	            // Squeeze
	            var hashWords = [];
	            for (var i = 0; i < outputLengthLanes; i++) {
	                // Shortcuts
	                var lane = state[i];
	                var laneMsw = lane.high;
	                var laneLsw = lane.low;

	                // Swap endian
	                laneMsw = (
	                    (((laneMsw << 8)  | (laneMsw >>> 24)) & 0x00ff00ff) |
	                    (((laneMsw << 24) | (laneMsw >>> 8))  & 0xff00ff00)
	                );
	                laneLsw = (
	                    (((laneLsw << 8)  | (laneLsw >>> 24)) & 0x00ff00ff) |
	                    (((laneLsw << 24) | (laneLsw >>> 8))  & 0xff00ff00)
	                );

	                // Squeeze state to retrieve hash
	                hashWords.push(laneLsw);
	                hashWords.push(laneMsw);
	            }

	            // Return final computed hash
	            return new WordArray.init(hashWords, outputLengthBytes);
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);

	            var state = clone._state = this._state.slice(0);
	            for (var i = 0; i < 25; i++) {
	                state[i] = state[i].clone();
	            }

	            return clone;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA3('message');
	     *     var hash = CryptoJS.SHA3(wordArray);
	     */
	    C.SHA3 = Hasher._createHelper(SHA3);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA3(message, key);
	     */
	    C.HmacSHA3 = Hasher._createHmacHelper(SHA3);
	}(Math));


	return CryptoJS.SHA3;

}));

/***/ }),

/***/ 7460:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(4938), __webpack_require__(34));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var X64WordArray = C_x64.WordArray;
	    var C_algo = C.algo;
	    var SHA512 = C_algo.SHA512;

	    /**
	     * SHA-384 hash algorithm.
	     */
	    var SHA384 = C_algo.SHA384 = SHA512.extend({
	        _doReset: function () {
	            this._hash = new X64WordArray.init([
	                new X64Word.init(0xcbbb9d5d, 0xc1059ed8), new X64Word.init(0x629a292a, 0x367cd507),
	                new X64Word.init(0x9159015a, 0x3070dd17), new X64Word.init(0x152fecd8, 0xf70e5939),
	                new X64Word.init(0x67332667, 0xffc00b31), new X64Word.init(0x8eb44a87, 0x68581511),
	                new X64Word.init(0xdb0c2e0d, 0x64f98fa7), new X64Word.init(0x47b5481d, 0xbefa4fa4)
	            ]);
	        },

	        _doFinalize: function () {
	            var hash = SHA512._doFinalize.call(this);

	            hash.sigBytes -= 16;

	            return hash;
	        }
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA384('message');
	     *     var hash = CryptoJS.SHA384(wordArray);
	     */
	    C.SHA384 = SHA512._createHelper(SHA384);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA384(message, key);
	     */
	    C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
	}());


	return CryptoJS.SHA384;

}));

/***/ }),

/***/ 34:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(4938));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Hasher = C_lib.Hasher;
	    var C_x64 = C.x64;
	    var X64Word = C_x64.Word;
	    var X64WordArray = C_x64.WordArray;
	    var C_algo = C.algo;

	    function X64Word_create() {
	        return X64Word.create.apply(X64Word, arguments);
	    }

	    // Constants
	    var K = [
	        X64Word_create(0x428a2f98, 0xd728ae22), X64Word_create(0x71374491, 0x23ef65cd),
	        X64Word_create(0xb5c0fbcf, 0xec4d3b2f), X64Word_create(0xe9b5dba5, 0x8189dbbc),
	        X64Word_create(0x3956c25b, 0xf348b538), X64Word_create(0x59f111f1, 0xb605d019),
	        X64Word_create(0x923f82a4, 0xaf194f9b), X64Word_create(0xab1c5ed5, 0xda6d8118),
	        X64Word_create(0xd807aa98, 0xa3030242), X64Word_create(0x12835b01, 0x45706fbe),
	        X64Word_create(0x243185be, 0x4ee4b28c), X64Word_create(0x550c7dc3, 0xd5ffb4e2),
	        X64Word_create(0x72be5d74, 0xf27b896f), X64Word_create(0x80deb1fe, 0x3b1696b1),
	        X64Word_create(0x9bdc06a7, 0x25c71235), X64Word_create(0xc19bf174, 0xcf692694),
	        X64Word_create(0xe49b69c1, 0x9ef14ad2), X64Word_create(0xefbe4786, 0x384f25e3),
	        X64Word_create(0x0fc19dc6, 0x8b8cd5b5), X64Word_create(0x240ca1cc, 0x77ac9c65),
	        X64Word_create(0x2de92c6f, 0x592b0275), X64Word_create(0x4a7484aa, 0x6ea6e483),
	        X64Word_create(0x5cb0a9dc, 0xbd41fbd4), X64Word_create(0x76f988da, 0x831153b5),
	        X64Word_create(0x983e5152, 0xee66dfab), X64Word_create(0xa831c66d, 0x2db43210),
	        X64Word_create(0xb00327c8, 0x98fb213f), X64Word_create(0xbf597fc7, 0xbeef0ee4),
	        X64Word_create(0xc6e00bf3, 0x3da88fc2), X64Word_create(0xd5a79147, 0x930aa725),
	        X64Word_create(0x06ca6351, 0xe003826f), X64Word_create(0x14292967, 0x0a0e6e70),
	        X64Word_create(0x27b70a85, 0x46d22ffc), X64Word_create(0x2e1b2138, 0x5c26c926),
	        X64Word_create(0x4d2c6dfc, 0x5ac42aed), X64Word_create(0x53380d13, 0x9d95b3df),
	        X64Word_create(0x650a7354, 0x8baf63de), X64Word_create(0x766a0abb, 0x3c77b2a8),
	        X64Word_create(0x81c2c92e, 0x47edaee6), X64Word_create(0x92722c85, 0x1482353b),
	        X64Word_create(0xa2bfe8a1, 0x4cf10364), X64Word_create(0xa81a664b, 0xbc423001),
	        X64Word_create(0xc24b8b70, 0xd0f89791), X64Word_create(0xc76c51a3, 0x0654be30),
	        X64Word_create(0xd192e819, 0xd6ef5218), X64Word_create(0xd6990624, 0x5565a910),
	        X64Word_create(0xf40e3585, 0x5771202a), X64Word_create(0x106aa070, 0x32bbd1b8),
	        X64Word_create(0x19a4c116, 0xb8d2d0c8), X64Word_create(0x1e376c08, 0x5141ab53),
	        X64Word_create(0x2748774c, 0xdf8eeb99), X64Word_create(0x34b0bcb5, 0xe19b48a8),
	        X64Word_create(0x391c0cb3, 0xc5c95a63), X64Word_create(0x4ed8aa4a, 0xe3418acb),
	        X64Word_create(0x5b9cca4f, 0x7763e373), X64Word_create(0x682e6ff3, 0xd6b2b8a3),
	        X64Word_create(0x748f82ee, 0x5defb2fc), X64Word_create(0x78a5636f, 0x43172f60),
	        X64Word_create(0x84c87814, 0xa1f0ab72), X64Word_create(0x8cc70208, 0x1a6439ec),
	        X64Word_create(0x90befffa, 0x23631e28), X64Word_create(0xa4506ceb, 0xde82bde9),
	        X64Word_create(0xbef9a3f7, 0xb2c67915), X64Word_create(0xc67178f2, 0xe372532b),
	        X64Word_create(0xca273ece, 0xea26619c), X64Word_create(0xd186b8c7, 0x21c0c207),
	        X64Word_create(0xeada7dd6, 0xcde0eb1e), X64Word_create(0xf57d4f7f, 0xee6ed178),
	        X64Word_create(0x06f067aa, 0x72176fba), X64Word_create(0x0a637dc5, 0xa2c898a6),
	        X64Word_create(0x113f9804, 0xbef90dae), X64Word_create(0x1b710b35, 0x131c471b),
	        X64Word_create(0x28db77f5, 0x23047d84), X64Word_create(0x32caab7b, 0x40c72493),
	        X64Word_create(0x3c9ebe0a, 0x15c9bebc), X64Word_create(0x431d67c4, 0x9c100d4c),
	        X64Word_create(0x4cc5d4be, 0xcb3e42b6), X64Word_create(0x597f299c, 0xfc657e2a),
	        X64Word_create(0x5fcb6fab, 0x3ad6faec), X64Word_create(0x6c44198c, 0x4a475817)
	    ];

	    // Reusable objects
	    var W = [];
	    (function () {
	        for (var i = 0; i < 80; i++) {
	            W[i] = X64Word_create();
	        }
	    }());

	    /**
	     * SHA-512 hash algorithm.
	     */
	    var SHA512 = C_algo.SHA512 = Hasher.extend({
	        _doReset: function () {
	            this._hash = new X64WordArray.init([
	                new X64Word.init(0x6a09e667, 0xf3bcc908), new X64Word.init(0xbb67ae85, 0x84caa73b),
	                new X64Word.init(0x3c6ef372, 0xfe94f82b), new X64Word.init(0xa54ff53a, 0x5f1d36f1),
	                new X64Word.init(0x510e527f, 0xade682d1), new X64Word.init(0x9b05688c, 0x2b3e6c1f),
	                new X64Word.init(0x1f83d9ab, 0xfb41bd6b), new X64Word.init(0x5be0cd19, 0x137e2179)
	            ]);
	        },

	        _doProcessBlock: function (M, offset) {
	            // Shortcuts
	            var H = this._hash.words;

	            var H0 = H[0];
	            var H1 = H[1];
	            var H2 = H[2];
	            var H3 = H[3];
	            var H4 = H[4];
	            var H5 = H[5];
	            var H6 = H[6];
	            var H7 = H[7];

	            var H0h = H0.high;
	            var H0l = H0.low;
	            var H1h = H1.high;
	            var H1l = H1.low;
	            var H2h = H2.high;
	            var H2l = H2.low;
	            var H3h = H3.high;
	            var H3l = H3.low;
	            var H4h = H4.high;
	            var H4l = H4.low;
	            var H5h = H5.high;
	            var H5l = H5.low;
	            var H6h = H6.high;
	            var H6l = H6.low;
	            var H7h = H7.high;
	            var H7l = H7.low;

	            // Working variables
	            var ah = H0h;
	            var al = H0l;
	            var bh = H1h;
	            var bl = H1l;
	            var ch = H2h;
	            var cl = H2l;
	            var dh = H3h;
	            var dl = H3l;
	            var eh = H4h;
	            var el = H4l;
	            var fh = H5h;
	            var fl = H5l;
	            var gh = H6h;
	            var gl = H6l;
	            var hh = H7h;
	            var hl = H7l;

	            // Rounds
	            for (var i = 0; i < 80; i++) {
	                var Wil;
	                var Wih;

	                // Shortcut
	                var Wi = W[i];

	                // Extend message
	                if (i < 16) {
	                    Wih = Wi.high = M[offset + i * 2]     | 0;
	                    Wil = Wi.low  = M[offset + i * 2 + 1] | 0;
	                } else {
	                    // Gamma0
	                    var gamma0x  = W[i - 15];
	                    var gamma0xh = gamma0x.high;
	                    var gamma0xl = gamma0x.low;
	                    var gamma0h  = ((gamma0xh >>> 1) | (gamma0xl << 31)) ^ ((gamma0xh >>> 8) | (gamma0xl << 24)) ^ (gamma0xh >>> 7);
	                    var gamma0l  = ((gamma0xl >>> 1) | (gamma0xh << 31)) ^ ((gamma0xl >>> 8) | (gamma0xh << 24)) ^ ((gamma0xl >>> 7) | (gamma0xh << 25));

	                    // Gamma1
	                    var gamma1x  = W[i - 2];
	                    var gamma1xh = gamma1x.high;
	                    var gamma1xl = gamma1x.low;
	                    var gamma1h  = ((gamma1xh >>> 19) | (gamma1xl << 13)) ^ ((gamma1xh << 3) | (gamma1xl >>> 29)) ^ (gamma1xh >>> 6);
	                    var gamma1l  = ((gamma1xl >>> 19) | (gamma1xh << 13)) ^ ((gamma1xl << 3) | (gamma1xh >>> 29)) ^ ((gamma1xl >>> 6) | (gamma1xh << 26));

	                    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
	                    var Wi7  = W[i - 7];
	                    var Wi7h = Wi7.high;
	                    var Wi7l = Wi7.low;

	                    var Wi16  = W[i - 16];
	                    var Wi16h = Wi16.high;
	                    var Wi16l = Wi16.low;

	                    Wil = gamma0l + Wi7l;
	                    Wih = gamma0h + Wi7h + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0);
	                    Wil = Wil + gamma1l;
	                    Wih = Wih + gamma1h + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0);
	                    Wil = Wil + Wi16l;
	                    Wih = Wih + Wi16h + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0);

	                    Wi.high = Wih;
	                    Wi.low  = Wil;
	                }

	                var chh  = (eh & fh) ^ (~eh & gh);
	                var chl  = (el & fl) ^ (~el & gl);
	                var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
	                var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

	                var sigma0h = ((ah >>> 28) | (al << 4))  ^ ((ah << 30)  | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
	                var sigma0l = ((al >>> 28) | (ah << 4))  ^ ((al << 30)  | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));
	                var sigma1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9));
	                var sigma1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9));

	                // t1 = h + sigma1 + ch + K[i] + W[i]
	                var Ki  = K[i];
	                var Kih = Ki.high;
	                var Kil = Ki.low;

	                var t1l = hl + sigma1l;
	                var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
	                var t1l = t1l + chl;
	                var t1h = t1h + chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
	                var t1l = t1l + Kil;
	                var t1h = t1h + Kih + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0);
	                var t1l = t1l + Wil;
	                var t1h = t1h + Wih + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0);

	                // t2 = sigma0 + maj
	                var t2l = sigma0l + majl;
	                var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);

	                // Update working variables
	                hh = gh;
	                hl = gl;
	                gh = fh;
	                gl = fl;
	                fh = eh;
	                fl = el;
	                el = (dl + t1l) | 0;
	                eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
	                dh = ch;
	                dl = cl;
	                ch = bh;
	                cl = bl;
	                bh = ah;
	                bl = al;
	                al = (t1l + t2l) | 0;
	                ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
	            }

	            // Intermediate hash value
	            H0l = H0.low  = (H0l + al);
	            H0.high = (H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0));
	            H1l = H1.low  = (H1l + bl);
	            H1.high = (H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0));
	            H2l = H2.low  = (H2l + cl);
	            H2.high = (H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0));
	            H3l = H3.low  = (H3l + dl);
	            H3.high = (H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0));
	            H4l = H4.low  = (H4l + el);
	            H4.high = (H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0));
	            H5l = H5.low  = (H5l + fl);
	            H5.high = (H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0));
	            H6l = H6.low  = (H6l + gl);
	            H6.high = (H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0));
	            H7l = H7.low  = (H7l + hl);
	            H7.high = (H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0));
	        },

	        _doFinalize: function () {
	            // Shortcuts
	            var data = this._data;
	            var dataWords = data.words;

	            var nBitsTotal = this._nDataBytes * 8;
	            var nBitsLeft = data.sigBytes * 8;

	            // Add padding
	            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 30] = Math.floor(nBitsTotal / 0x100000000);
	            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 31] = nBitsTotal;
	            data.sigBytes = dataWords.length * 4;

	            // Hash final blocks
	            this._process();

	            // Convert hash to 32-bit word array before returning
	            var hash = this._hash.toX32();

	            // Return final computed hash
	            return hash;
	        },

	        clone: function () {
	            var clone = Hasher.clone.call(this);
	            clone._hash = this._hash.clone();

	            return clone;
	        },

	        blockSize: 1024/32
	    });

	    /**
	     * Shortcut function to the hasher's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     *
	     * @return {WordArray} The hash.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hash = CryptoJS.SHA512('message');
	     *     var hash = CryptoJS.SHA512(wordArray);
	     */
	    C.SHA512 = Hasher._createHelper(SHA512);

	    /**
	     * Shortcut function to the HMAC's object interface.
	     *
	     * @param {WordArray|string} message The message to hash.
	     * @param {WordArray|string} key The secret key.
	     *
	     * @return {WordArray} The HMAC.
	     *
	     * @static
	     *
	     * @example
	     *
	     *     var hmac = CryptoJS.HmacSHA512(message, key);
	     */
	    C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
	}());


	return CryptoJS.SHA512;

}));

/***/ }),

/***/ 4253:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory, undef) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249), __webpack_require__(8269), __webpack_require__(8214), __webpack_require__(888), __webpack_require__(5109));
	}
	else {}
}(this, function (CryptoJS) {

	(function () {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var WordArray = C_lib.WordArray;
	    var BlockCipher = C_lib.BlockCipher;
	    var C_algo = C.algo;

	    // Permuted Choice 1 constants
	    var PC1 = [
	        57, 49, 41, 33, 25, 17, 9,  1,
	        58, 50, 42, 34, 26, 18, 10, 2,
	        59, 51, 43, 35, 27, 19, 11, 3,
	        60, 52, 44, 36, 63, 55, 47, 39,
	        31, 23, 15, 7,  62, 54, 46, 38,
	        30, 22, 14, 6,  61, 53, 45, 37,
	        29, 21, 13, 5,  28, 20, 12, 4
	    ];

	    // Permuted Choice 2 constants
	    var PC2 = [
	        14, 17, 11, 24, 1,  5,
	        3,  28, 15, 6,  21, 10,
	        23, 19, 12, 4,  26, 8,
	        16, 7,  27, 20, 13, 2,
	        41, 52, 31, 37, 47, 55,
	        30, 40, 51, 45, 33, 48,
	        44, 49, 39, 56, 34, 53,
	        46, 42, 50, 36, 29, 32
	    ];

	    // Cumulative bit shift constants
	    var BIT_SHIFTS = [1,  2,  4,  6,  8,  10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

	    // SBOXes and round permutation constants
	    var SBOX_P = [
	        {
	            0x0: 0x808200,
	            0x10000000: 0x8000,
	            0x20000000: 0x808002,
	            0x30000000: 0x2,
	            0x40000000: 0x200,
	            0x50000000: 0x808202,
	            0x60000000: 0x800202,
	            0x70000000: 0x800000,
	            0x80000000: 0x202,
	            0x90000000: 0x800200,
	            0xa0000000: 0x8200,
	            0xb0000000: 0x808000,
	            0xc0000000: 0x8002,
	            0xd0000000: 0x800002,
	            0xe0000000: 0x0,
	            0xf0000000: 0x8202,
	            0x8000000: 0x0,
	            0x18000000: 0x808202,
	            0x28000000: 0x8202,
	            0x38000000: 0x8000,
	            0x48000000: 0x808200,
	            0x58000000: 0x200,
	            0x68000000: 0x808002,
	            0x78000000: 0x2,
	            0x88000000: 0x800200,
	            0x98000000: 0x8200,
	            0xa8000000: 0x808000,
	            0xb8000000: 0x800202,
	            0xc8000000: 0x800002,
	            0xd8000000: 0x8002,
	            0xe8000000: 0x202,
	            0xf8000000: 0x800000,
	            0x1: 0x8000,
	            0x10000001: 0x2,
	            0x20000001: 0x808200,
	            0x30000001: 0x800000,
	            0x40000001: 0x808002,
	            0x50000001: 0x8200,
	            0x60000001: 0x200,
	            0x70000001: 0x800202,
	            0x80000001: 0x808202,
	            0x90000001: 0x808000,
	            0xa0000001: 0x800002,
	            0xb0000001: 0x8202,
	            0xc0000001: 0x202,
	            0xd0000001: 0x800200,
	            0xe0000001: 0x8002,
	            0xf0000001: 0x0,
	            0x8000001: 0x808202,
	            0x18000001: 0x808000,
	            0x28000001: 0x800000,
	            0x38000001: 0x200,
	            0x48000001: 0x8000,
	            0x58000001: 0x800002,
	            0x68000001: 0x2,
	            0x78000001: 0x8202,
	            0x88000001: 0x8002,
	            0x98000001: 0x800202,
	            0xa8000001: 0x202,
	            0xb8000001: 0x808200,
	            0xc8000001: 0x800200,
	            0xd8000001: 0x0,
	            0xe8000001: 0x8200,
	            0xf8000001: 0x808002
	        },
	        {
	            0x0: 0x40084010,
	            0x1000000: 0x4000,
	            0x2000000: 0x80000,
	            0x3000000: 0x40080010,
	            0x4000000: 0x40000010,
	            0x5000000: 0x40084000,
	            0x6000000: 0x40004000,
	            0x7000000: 0x10,
	            0x8000000: 0x84000,
	            0x9000000: 0x40004010,
	            0xa000000: 0x40000000,
	            0xb000000: 0x84010,
	            0xc000000: 0x80010,
	            0xd000000: 0x0,
	            0xe000000: 0x4010,
	            0xf000000: 0x40080000,
	            0x800000: 0x40004000,
	            0x1800000: 0x84010,
	            0x2800000: 0x10,
	            0x3800000: 0x40004010,
	            0x4800000: 0x40084010,
	            0x5800000: 0x40000000,
	            0x6800000: 0x80000,
	            0x7800000: 0x40080010,
	            0x8800000: 0x80010,
	            0x9800000: 0x0,
	            0xa800000: 0x4000,
	            0xb800000: 0x40080000,
	            0xc800000: 0x40000010,
	            0xd800000: 0x84000,
	            0xe800000: 0x40084000,
	            0xf800000: 0x4010,
	            0x10000000: 0x0,
	            0x11000000: 0x40080010,
	            0x12000000: 0x40004010,
	            0x13000000: 0x40084000,
	            0x14000000: 0x40080000,
	            0x15000000: 0x10,
	            0x16000000: 0x84010,
	            0x17000000: 0x4000,
	            0x18000000: 0x4010,
	            0x19000000: 0x80000,
	            0x1a000000: 0x80010,
	            0x1b000000: 0x40000010,
	            0x1c000000: 0x84000,
	            0x1d000000: 0x40004000,
	            0x1e000000: 0x40000000,
	            0x1f000000: 0x40084010,
	            0x10800000: 0x84010,
	            0x11800000: 0x80000,
	            0x12800000: 0x40080000,
	            0x13800000: 0x4000,
	            0x14800000: 0x40004000,
	            0x15800000: 0x40084010,
	            0x16800000: 0x10,
	            0x17800000: 0x40000000,
	            0x18800000: 0x40084000,
	            0x19800000: 0x40000010,
	            0x1a800000: 0x40004010,
	            0x1b800000: 0x80010,
	            0x1c800000: 0x0,
	            0x1d800000: 0x4010,
	            0x1e800000: 0x40080010,
	            0x1f800000: 0x84000
	        },
	        {
	            0x0: 0x104,
	            0x100000: 0x0,
	            0x200000: 0x4000100,
	            0x300000: 0x10104,
	            0x400000: 0x10004,
	            0x500000: 0x4000004,
	            0x600000: 0x4010104,
	            0x700000: 0x4010000,
	            0x800000: 0x4000000,
	            0x900000: 0x4010100,
	            0xa00000: 0x10100,
	            0xb00000: 0x4010004,
	            0xc00000: 0x4000104,
	            0xd00000: 0x10000,
	            0xe00000: 0x4,
	            0xf00000: 0x100,
	            0x80000: 0x4010100,
	            0x180000: 0x4010004,
	            0x280000: 0x0,
	            0x380000: 0x4000100,
	            0x480000: 0x4000004,
	            0x580000: 0x10000,
	            0x680000: 0x10004,
	            0x780000: 0x104,
	            0x880000: 0x4,
	            0x980000: 0x100,
	            0xa80000: 0x4010000,
	            0xb80000: 0x10104,
	            0xc80000: 0x10100,
	            0xd80000: 0x4000104,
	            0xe80000: 0x4010104,
	            0xf80000: 0x4000000,
	            0x1000000: 0x4010100,
	            0x1100000: 0x10004,
	            0x1200000: 0x10000,
	            0x1300000: 0x4000100,
	            0x1400000: 0x100,
	            0x1500000: 0x4010104,
	            0x1600000: 0x4000004,
	            0x1700000: 0x0,
	            0x1800000: 0x4000104,
	            0x1900000: 0x4000000,
	            0x1a00000: 0x4,
	            0x1b00000: 0x10100,
	            0x1c00000: 0x4010000,
	            0x1d00000: 0x104,
	            0x1e00000: 0x10104,
	            0x1f00000: 0x4010004,
	            0x1080000: 0x4000000,
	            0x1180000: 0x104,
	            0x1280000: 0x4010100,
	            0x1380000: 0x0,
	            0x1480000: 0x10004,
	            0x1580000: 0x4000100,
	            0x1680000: 0x100,
	            0x1780000: 0x4010004,
	            0x1880000: 0x10000,
	            0x1980000: 0x4010104,
	            0x1a80000: 0x10104,
	            0x1b80000: 0x4000004,
	            0x1c80000: 0x4000104,
	            0x1d80000: 0x4010000,
	            0x1e80000: 0x4,
	            0x1f80000: 0x10100
	        },
	        {
	            0x0: 0x80401000,
	            0x10000: 0x80001040,
	            0x20000: 0x401040,
	            0x30000: 0x80400000,
	            0x40000: 0x0,
	            0x50000: 0x401000,
	            0x60000: 0x80000040,
	            0x70000: 0x400040,
	            0x80000: 0x80000000,
	            0x90000: 0x400000,
	            0xa0000: 0x40,
	            0xb0000: 0x80001000,
	            0xc0000: 0x80400040,
	            0xd0000: 0x1040,
	            0xe0000: 0x1000,
	            0xf0000: 0x80401040,
	            0x8000: 0x80001040,
	            0x18000: 0x40,
	            0x28000: 0x80400040,
	            0x38000: 0x80001000,
	            0x48000: 0x401000,
	            0x58000: 0x80401040,
	            0x68000: 0x0,
	            0x78000: 0x80400000,
	            0x88000: 0x1000,
	            0x98000: 0x80401000,
	            0xa8000: 0x400000,
	            0xb8000: 0x1040,
	            0xc8000: 0x80000000,
	            0xd8000: 0x400040,
	            0xe8000: 0x401040,
	            0xf8000: 0x80000040,
	            0x100000: 0x400040,
	            0x110000: 0x401000,
	            0x120000: 0x80000040,
	            0x130000: 0x0,
	            0x140000: 0x1040,
	            0x150000: 0x80400040,
	            0x160000: 0x80401000,
	            0x170000: 0x80001040,
	            0x180000: 0x80401040,
	            0x190000: 0x80000000,
	            0x1a0000: 0x80400000,
	            0x1b0000: 0x401040,
	            0x1c0000: 0x80001000,
	            0x1d0000: 0x400000,
	            0x1e0000: 0x40,
	            0x1f0000: 0x1000,
	            0x108000: 0x80400000,
	            0x118000: 0x80401040,
	            0x128000: 0x0,
	            0x138000: 0x401000,
	            0x148000: 0x400040,
	            0x158000: 0x80000000,
	            0x168000: 0x80001040,
	            0x178000: 0x40,
	            0x188000: 0x80000040,
	            0x198000: 0x1000,
	            0x1a8000: 0x80001000,
	            0x1b8000: 0x80400040,
	            0x1c8000: 0x1040,
	            0x1d8000: 0x80401000,
	            0x1e8000: 0x400000,
	            0x1f8000: 0x401040
	        },
	        {
	            0x0: 0x80,
	            0x1000: 0x1040000,
	            0x2000: 0x40000,
	            0x3000: 0x20000000,
	            0x4000: 0x20040080,
	            0x5000: 0x1000080,
	            0x6000: 0x21000080,
	            0x7000: 0x40080,
	            0x8000: 0x1000000,
	            0x9000: 0x20040000,
	            0xa000: 0x20000080,
	            0xb000: 0x21040080,
	            0xc000: 0x21040000,
	            0xd000: 0x0,
	            0xe000: 0x1040080,
	            0xf000: 0x21000000,
	            0x800: 0x1040080,
	            0x1800: 0x21000080,
	            0x2800: 0x80,
	            0x3800: 0x1040000,
	            0x4800: 0x40000,
	            0x5800: 0x20040080,
	            0x6800: 0x21040000,
	            0x7800: 0x20000000,
	            0x8800: 0x20040000,
	            0x9800: 0x0,
	            0xa800: 0x21040080,
	            0xb800: 0x1000080,
	            0xc800: 0x20000080,
	            0xd800: 0x21000000,
	            0xe800: 0x1000000,
	            0xf800: 0x40080,
	            0x10000: 0x40000,
	            0x11000: 0x80,
	            0x12000: 0x20000000,
	            0x13000: 0x21000080,
	            0x14000: 0x1000080,
	            0x15000: 0x21040000,
	            0x16000: 0x20040080,
	            0x17000: 0x1000000,
	            0x18000: 0x21040080,
	            0x19000: 0x21000000,
	            0x1a000: 0x1040000,
	            0x1b000: 0x20040000,
	            0x1c000: 0x40080,
	            0x1d000: 0x20000080,
	            0x1e000: 0x0,
	            0x1f000: 0x1040080,
	            0x10800: 0x21000080,
	            0x11800: 0x1000000,
	            0x12800: 0x1040000,
	            0x13800: 0x20040080,
	            0x14800: 0x20000000,
	            0x15800: 0x1040080,
	            0x16800: 0x80,
	            0x17800: 0x21040000,
	            0x18800: 0x40080,
	            0x19800: 0x21040080,
	            0x1a800: 0x0,
	            0x1b800: 0x21000000,
	            0x1c800: 0x1000080,
	            0x1d800: 0x40000,
	            0x1e800: 0x20040000,
	            0x1f800: 0x20000080
	        },
	        {
	            0x0: 0x10000008,
	            0x100: 0x2000,
	            0x200: 0x10200000,
	            0x300: 0x10202008,
	            0x400: 0x10002000,
	            0x500: 0x200000,
	            0x600: 0x200008,
	            0x700: 0x10000000,
	            0x800: 0x0,
	            0x900: 0x10002008,
	            0xa00: 0x202000,
	            0xb00: 0x8,
	            0xc00: 0x10200008,
	            0xd00: 0x202008,
	            0xe00: 0x2008,
	            0xf00: 0x10202000,
	            0x80: 0x10200000,
	            0x180: 0x10202008,
	            0x280: 0x8,
	            0x380: 0x200000,
	            0x480: 0x202008,
	            0x580: 0x10000008,
	            0x680: 0x10002000,
	            0x780: 0x2008,
	            0x880: 0x200008,
	            0x980: 0x2000,
	            0xa80: 0x10002008,
	            0xb80: 0x10200008,
	            0xc80: 0x0,
	            0xd80: 0x10202000,
	            0xe80: 0x202000,
	            0xf80: 0x10000000,
	            0x1000: 0x10002000,
	            0x1100: 0x10200008,
	            0x1200: 0x10202008,
	            0x1300: 0x2008,
	            0x1400: 0x200000,
	            0x1500: 0x10000000,
	            0x1600: 0x10000008,
	            0x1700: 0x202000,
	            0x1800: 0x202008,
	            0x1900: 0x0,
	            0x1a00: 0x8,
	            0x1b00: 0x10200000,
	            0x1c00: 0x2000,
	            0x1d00: 0x10002008,
	            0x1e00: 0x10202000,
	            0x1f00: 0x200008,
	            0x1080: 0x8,
	            0x1180: 0x202000,
	            0x1280: 0x200000,
	            0x1380: 0x10000008,
	            0x1480: 0x10002000,
	            0x1580: 0x2008,
	            0x1680: 0x10202008,
	            0x1780: 0x10200000,
	            0x1880: 0x10202000,
	            0x1980: 0x10200008,
	            0x1a80: 0x2000,
	            0x1b80: 0x202008,
	            0x1c80: 0x200008,
	            0x1d80: 0x0,
	            0x1e80: 0x10000000,
	            0x1f80: 0x10002008
	        },
	        {
	            0x0: 0x100000,
	            0x10: 0x2000401,
	            0x20: 0x400,
	            0x30: 0x100401,
	            0x40: 0x2100401,
	            0x50: 0x0,
	            0x60: 0x1,
	            0x70: 0x2100001,
	            0x80: 0x2000400,
	            0x90: 0x100001,
	            0xa0: 0x2000001,
	            0xb0: 0x2100400,
	            0xc0: 0x2100000,
	            0xd0: 0x401,
	            0xe0: 0x100400,
	            0xf0: 0x2000000,
	            0x8: 0x2100001,
	            0x18: 0x0,
	            0x28: 0x2000401,
	            0x38: 0x2100400,
	            0x48: 0x100000,
	            0x58: 0x2000001,
	            0x68: 0x2000000,
	            0x78: 0x401,
	            0x88: 0x100401,
	            0x98: 0x2000400,
	            0xa8: 0x2100000,
	            0xb8: 0x100001,
	            0xc8: 0x400,
	            0xd8: 0x2100401,
	            0xe8: 0x1,
	            0xf8: 0x100400,
	            0x100: 0x2000000,
	            0x110: 0x100000,
	            0x120: 0x2000401,
	            0x130: 0x2100001,
	            0x140: 0x100001,
	            0x150: 0x2000400,
	            0x160: 0x2100400,
	            0x170: 0x100401,
	            0x180: 0x401,
	            0x190: 0x2100401,
	            0x1a0: 0x100400,
	            0x1b0: 0x1,
	            0x1c0: 0x0,
	            0x1d0: 0x2100000,
	            0x1e0: 0x2000001,
	            0x1f0: 0x400,
	            0x108: 0x100400,
	            0x118: 0x2000401,
	            0x128: 0x2100001,
	            0x138: 0x1,
	            0x148: 0x2000000,
	            0x158: 0x100000,
	            0x168: 0x401,
	            0x178: 0x2100400,
	            0x188: 0x2000001,
	            0x198: 0x2100000,
	            0x1a8: 0x0,
	            0x1b8: 0x2100401,
	            0x1c8: 0x100401,
	            0x1d8: 0x400,
	            0x1e8: 0x2000400,
	            0x1f8: 0x100001
	        },
	        {
	            0x0: 0x8000820,
	            0x1: 0x20000,
	            0x2: 0x8000000,
	            0x3: 0x20,
	            0x4: 0x20020,
	            0x5: 0x8020820,
	            0x6: 0x8020800,
	            0x7: 0x800,
	            0x8: 0x8020000,
	            0x9: 0x8000800,
	            0xa: 0x20800,
	            0xb: 0x8020020,
	            0xc: 0x820,
	            0xd: 0x0,
	            0xe: 0x8000020,
	            0xf: 0x20820,
	            0x80000000: 0x800,
	            0x80000001: 0x8020820,
	            0x80000002: 0x8000820,
	            0x80000003: 0x8000000,
	            0x80000004: 0x8020000,
	            0x80000005: 0x20800,
	            0x80000006: 0x20820,
	            0x80000007: 0x20,
	            0x80000008: 0x8000020,
	            0x80000009: 0x820,
	            0x8000000a: 0x20020,
	            0x8000000b: 0x8020800,
	            0x8000000c: 0x0,
	            0x8000000d: 0x8020020,
	            0x8000000e: 0x8000800,
	            0x8000000f: 0x20000,
	            0x10: 0x20820,
	            0x11: 0x8020800,
	            0x12: 0x20,
	            0x13: 0x800,
	            0x14: 0x8000800,
	            0x15: 0x8000020,
	            0x16: 0x8020020,
	            0x17: 0x20000,
	            0x18: 0x0,
	            0x19: 0x20020,
	            0x1a: 0x8020000,
	            0x1b: 0x8000820,
	            0x1c: 0x8020820,
	            0x1d: 0x20800,
	            0x1e: 0x820,
	            0x1f: 0x8000000,
	            0x80000010: 0x20000,
	            0x80000011: 0x800,
	            0x80000012: 0x8020020,
	            0x80000013: 0x20820,
	            0x80000014: 0x20,
	            0x80000015: 0x8020000,
	            0x80000016: 0x8000000,
	            0x80000017: 0x8000820,
	            0x80000018: 0x8020820,
	            0x80000019: 0x8000020,
	            0x8000001a: 0x8000800,
	            0x8000001b: 0x0,
	            0x8000001c: 0x20800,
	            0x8000001d: 0x820,
	            0x8000001e: 0x20020,
	            0x8000001f: 0x8020800
	        }
	    ];

	    // Masks that select the SBOX input
	    var SBOX_MASK = [
	        0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000,
	        0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f
	    ];

	    /**
	     * DES block cipher algorithm.
	     */
	    var DES = C_algo.DES = BlockCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;

	            // Select 56 bits according to PC1
	            var keyBits = [];
	            for (var i = 0; i < 56; i++) {
	                var keyBitPos = PC1[i] - 1;
	                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
	            }

	            // Assemble 16 subkeys
	            var subKeys = this._subKeys = [];
	            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
	                // Create subkey
	                var subKey = subKeys[nSubKey] = [];

	                // Shortcut
	                var bitShift = BIT_SHIFTS[nSubKey];

	                // Select 48 bits according to PC2
	                for (var i = 0; i < 24; i++) {
	                    // Select from the left 28 key bits
	                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);

	                    // Select from the right 28 key bits
	                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
	                }

	                // Since each subkey is applied to an expanded 32-bit input,
	                // the subkey can be broken into 8 values scaled to 32-bits,
	                // which allows the key to be used without expansion
	                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
	                for (var i = 1; i < 7; i++) {
	                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
	                }
	                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
	            }

	            // Compute inverse subkeys
	            var invSubKeys = this._invSubKeys = [];
	            for (var i = 0; i < 16; i++) {
	                invSubKeys[i] = subKeys[15 - i];
	            }
	        },

	        encryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._subKeys);
	        },

	        decryptBlock: function (M, offset) {
	            this._doCryptBlock(M, offset, this._invSubKeys);
	        },

	        _doCryptBlock: function (M, offset, subKeys) {
	            // Get input
	            this._lBlock = M[offset];
	            this._rBlock = M[offset + 1];

	            // Initial permutation
	            exchangeLR.call(this, 4,  0x0f0f0f0f);
	            exchangeLR.call(this, 16, 0x0000ffff);
	            exchangeRL.call(this, 2,  0x33333333);
	            exchangeRL.call(this, 8,  0x00ff00ff);
	            exchangeLR.call(this, 1,  0x55555555);

	            // Rounds
	            for (var round = 0; round < 16; round++) {
	                // Shortcuts
	                var subKey = subKeys[round];
	                var lBlock = this._lBlock;
	                var rBlock = this._rBlock;

	                // Feistel function
	                var f = 0;
	                for (var i = 0; i < 8; i++) {
	                    f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
	                }
	                this._lBlock = rBlock;
	                this._rBlock = lBlock ^ f;
	            }

	            // Undo swap from last round
	            var t = this._lBlock;
	            this._lBlock = this._rBlock;
	            this._rBlock = t;

	            // Final permutation
	            exchangeLR.call(this, 1,  0x55555555);
	            exchangeRL.call(this, 8,  0x00ff00ff);
	            exchangeRL.call(this, 2,  0x33333333);
	            exchangeLR.call(this, 16, 0x0000ffff);
	            exchangeLR.call(this, 4,  0x0f0f0f0f);

	            // Set output
	            M[offset] = this._lBlock;
	            M[offset + 1] = this._rBlock;
	        },

	        keySize: 64/32,

	        ivSize: 64/32,

	        blockSize: 64/32
	    });

	    // Swap bits across the left and right words
	    function exchangeLR(offset, mask) {
	        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
	        this._rBlock ^= t;
	        this._lBlock ^= t << offset;
	    }

	    function exchangeRL(offset, mask) {
	        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
	        this._lBlock ^= t;
	        this._rBlock ^= t << offset;
	    }

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
	     */
	    C.DES = BlockCipher._createHelper(DES);

	    /**
	     * Triple-DES block cipher algorithm.
	     */
	    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
	        _doReset: function () {
	            // Shortcuts
	            var key = this._key;
	            var keyWords = key.words;
	            // Make sure the key length is valid (64, 128 or >= 192 bit)
	            if (keyWords.length !== 2 && keyWords.length !== 4 && keyWords.length < 6) {
	                throw new Error('Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.');
	            }

	            // Extend the key according to the keying options defined in 3DES standard
	            var key1 = keyWords.slice(0, 2);
	            var key2 = keyWords.length < 4 ? keyWords.slice(0, 2) : keyWords.slice(2, 4);
	            var key3 = keyWords.length < 6 ? keyWords.slice(0, 2) : keyWords.slice(4, 6);

	            // Create DES instances
	            this._des1 = DES.createEncryptor(WordArray.create(key1));
	            this._des2 = DES.createEncryptor(WordArray.create(key2));
	            this._des3 = DES.createEncryptor(WordArray.create(key3));
	        },

	        encryptBlock: function (M, offset) {
	            this._des1.encryptBlock(M, offset);
	            this._des2.decryptBlock(M, offset);
	            this._des3.encryptBlock(M, offset);
	        },

	        decryptBlock: function (M, offset) {
	            this._des3.decryptBlock(M, offset);
	            this._des2.encryptBlock(M, offset);
	            this._des1.decryptBlock(M, offset);
	        },

	        keySize: 192/32,

	        ivSize: 64/32,

	        blockSize: 64/32
	    });

	    /**
	     * Shortcut functions to the cipher's object interface.
	     *
	     * @example
	     *
	     *     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
	     *     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
	     */
	    C.TripleDES = BlockCipher._createHelper(TripleDES);
	}());


	return CryptoJS.TripleDES;

}));

/***/ }),

/***/ 4938:
/***/ (function(module, exports, __webpack_require__) {

;(function (root, factory) {
	if (true) {
		// CommonJS
		module.exports = exports = factory(__webpack_require__(8249));
	}
	else {}
}(this, function (CryptoJS) {

	(function (undefined) {
	    // Shortcuts
	    var C = CryptoJS;
	    var C_lib = C.lib;
	    var Base = C_lib.Base;
	    var X32WordArray = C_lib.WordArray;

	    /**
	     * x64 namespace.
	     */
	    var C_x64 = C.x64 = {};

	    /**
	     * A 64-bit word.
	     */
	    var X64Word = C_x64.Word = Base.extend({
	        /**
	         * Initializes a newly created 64-bit word.
	         *
	         * @param {number} high The high 32 bits.
	         * @param {number} low The low 32 bits.
	         *
	         * @example
	         *
	         *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
	         */
	        init: function (high, low) {
	            this.high = high;
	            this.low = low;
	        }

	        /**
	         * Bitwise NOTs this word.
	         *
	         * @return {X64Word} A new x64-Word object after negating.
	         *
	         * @example
	         *
	         *     var negated = x64Word.not();
	         */
	        // not: function () {
	            // var high = ~this.high;
	            // var low = ~this.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise ANDs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to AND with this word.
	         *
	         * @return {X64Word} A new x64-Word object after ANDing.
	         *
	         * @example
	         *
	         *     var anded = x64Word.and(anotherX64Word);
	         */
	        // and: function (word) {
	            // var high = this.high & word.high;
	            // var low = this.low & word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise ORs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to OR with this word.
	         *
	         * @return {X64Word} A new x64-Word object after ORing.
	         *
	         * @example
	         *
	         *     var ored = x64Word.or(anotherX64Word);
	         */
	        // or: function (word) {
	            // var high = this.high | word.high;
	            // var low = this.low | word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Bitwise XORs this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to XOR with this word.
	         *
	         * @return {X64Word} A new x64-Word object after XORing.
	         *
	         * @example
	         *
	         *     var xored = x64Word.xor(anotherX64Word);
	         */
	        // xor: function (word) {
	            // var high = this.high ^ word.high;
	            // var low = this.low ^ word.low;

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Shifts this word n bits to the left.
	         *
	         * @param {number} n The number of bits to shift.
	         *
	         * @return {X64Word} A new x64-Word object after shifting.
	         *
	         * @example
	         *
	         *     var shifted = x64Word.shiftL(25);
	         */
	        // shiftL: function (n) {
	            // if (n < 32) {
	                // var high = (this.high << n) | (this.low >>> (32 - n));
	                // var low = this.low << n;
	            // } else {
	                // var high = this.low << (n - 32);
	                // var low = 0;
	            // }

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Shifts this word n bits to the right.
	         *
	         * @param {number} n The number of bits to shift.
	         *
	         * @return {X64Word} A new x64-Word object after shifting.
	         *
	         * @example
	         *
	         *     var shifted = x64Word.shiftR(7);
	         */
	        // shiftR: function (n) {
	            // if (n < 32) {
	                // var low = (this.low >>> n) | (this.high << (32 - n));
	                // var high = this.high >>> n;
	            // } else {
	                // var low = this.high >>> (n - 32);
	                // var high = 0;
	            // }

	            // return X64Word.create(high, low);
	        // },

	        /**
	         * Rotates this word n bits to the left.
	         *
	         * @param {number} n The number of bits to rotate.
	         *
	         * @return {X64Word} A new x64-Word object after rotating.
	         *
	         * @example
	         *
	         *     var rotated = x64Word.rotL(25);
	         */
	        // rotL: function (n) {
	            // return this.shiftL(n).or(this.shiftR(64 - n));
	        // },

	        /**
	         * Rotates this word n bits to the right.
	         *
	         * @param {number} n The number of bits to rotate.
	         *
	         * @return {X64Word} A new x64-Word object after rotating.
	         *
	         * @example
	         *
	         *     var rotated = x64Word.rotR(7);
	         */
	        // rotR: function (n) {
	            // return this.shiftR(n).or(this.shiftL(64 - n));
	        // },

	        /**
	         * Adds this word with the passed word.
	         *
	         * @param {X64Word} word The x64-Word to add with this word.
	         *
	         * @return {X64Word} A new x64-Word object after adding.
	         *
	         * @example
	         *
	         *     var added = x64Word.add(anotherX64Word);
	         */
	        // add: function (word) {
	            // var low = (this.low + word.low) | 0;
	            // var carry = (low >>> 0) < (this.low >>> 0) ? 1 : 0;
	            // var high = (this.high + word.high + carry) | 0;

	            // return X64Word.create(high, low);
	        // }
	    });

	    /**
	     * An array of 64-bit words.
	     *
	     * @property {Array} words The array of CryptoJS.x64.Word objects.
	     * @property {number} sigBytes The number of significant bytes in this word array.
	     */
	    var X64WordArray = C_x64.WordArray = Base.extend({
	        /**
	         * Initializes a newly created word array.
	         *
	         * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
	         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
	         *
	         * @example
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create();
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create([
	         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
	         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
	         *     ]);
	         *
	         *     var wordArray = CryptoJS.x64.WordArray.create([
	         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
	         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
	         *     ], 10);
	         */
	        init: function (words, sigBytes) {
	            words = this.words = words || [];

	            if (sigBytes != undefined) {
	                this.sigBytes = sigBytes;
	            } else {
	                this.sigBytes = words.length * 8;
	            }
	        },

	        /**
	         * Converts this 64-bit word array to a 32-bit word array.
	         *
	         * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
	         *
	         * @example
	         *
	         *     var x32WordArray = x64WordArray.toX32();
	         */
	        toX32: function () {
	            // Shortcuts
	            var x64Words = this.words;
	            var x64WordsLength = x64Words.length;

	            // Convert
	            var x32Words = [];
	            for (var i = 0; i < x64WordsLength; i++) {
	                var x64Word = x64Words[i];
	                x32Words.push(x64Word.high);
	                x32Words.push(x64Word.low);
	            }

	            return X32WordArray.create(x32Words, this.sigBytes);
	        },

	        /**
	         * Creates a copy of this word array.
	         *
	         * @return {X64WordArray} The clone.
	         *
	         * @example
	         *
	         *     var clone = x64WordArray.clone();
	         */
	        clone: function () {
	            var clone = Base.clone.call(this);

	            // Clone "words" array
	            var words = clone.words = this.words.slice(0);

	            // Clone each X64Word object
	            var wordsLength = words.length;
	            for (var i = 0; i < wordsLength; i++) {
	                words[i] = words[i].clone();
	            }

	            return clone;
	        }
	    });
	}());


	return CryptoJS;

}));

/***/ }),

/***/ 1227:
/***/ ((module, exports, __webpack_require__) => {

/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = __webpack_require__(2447)(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};


/***/ }),

/***/ 2447:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = __webpack_require__(7824);
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;


/***/ }),

/***/ 284:
/***/ ((module) => {

var naiveFallback = function () {
	if (typeof self === "object" && self) return self;
	if (typeof window === "object" && window) return window;
	throw new Error("Unable to resolve global `this`");
};

module.exports = (function () {
	if (this) return this;

	// Unexpected strict mode (may happen if e.g. bundled into ESM module)

	// Fallback to standard globalThis if available
	if (typeof globalThis === "object" && globalThis) return globalThis;

	// Thanks @mathiasbynens -> https://mathiasbynens.be/notes/globalthis
	// In all ES5+ engines global object inherits from Object.prototype
	// (if you approached one that doesn't please report)
	try {
		Object.defineProperty(Object.prototype, "__global__", {
			get: function () { return this; },
			configurable: true
		});
	} catch (error) {
		// Unfortunate case of updates to Object.prototype being restricted
		// via preventExtensions, seal or freeze
		return naiveFallback();
	}
	try {
		// Safari case (window.__global__ works, but __global__ does not)
		if (!__global__) return naiveFallback();
		return __global__;
	} finally {
		delete Object.prototype.__global__;
	}
})();


/***/ }),

/***/ 6729:
/***/ ((module) => {

"use strict";


var has = Object.prototype.hasOwnProperty
  , prefix = '~';

/**
 * Constructor to create a storage for our `EE` objects.
 * An `Events` instance is a plain object whose properties are event names.
 *
 * @constructor
 * @private
 */
function Events() {}

//
// We try to not inherit from `Object.prototype`. In some engines creating an
// instance in this way is faster than calling `Object.create(null)` directly.
// If `Object.create(null)` is not supported we prefix the event names with a
// character to make sure that the built-in object properties are not
// overridden or used as an attack vector.
//
if (Object.create) {
  Events.prototype = Object.create(null);

  //
  // This hack is needed because the `__proto__` property is still inherited in
  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
  //
  if (!new Events().__proto__) prefix = false;
}

/**
 * Representation of a single event listener.
 *
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
 * @constructor
 * @private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Add a listener for a given event.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} context The context to invoke the listener with.
 * @param {Boolean} once Specify if the listener is a one-time listener.
 * @returns {EventEmitter}
 * @private
 */
function addListener(emitter, event, fn, context, once) {
  if (typeof fn !== 'function') {
    throw new TypeError('The listener must be a function');
  }

  var listener = new EE(fn, context || emitter, once)
    , evt = prefix ? prefix + event : event;

  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
  else emitter._events[evt] = [emitter._events[evt], listener];

  return emitter;
}

/**
 * Clear event by name.
 *
 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
 * @param {(String|Symbol)} evt The Event name.
 * @private
 */
function clearEvent(emitter, evt) {
  if (--emitter._eventsCount === 0) emitter._events = new Events();
  else delete emitter._events[evt];
}

/**
 * Minimal `EventEmitter` interface that is molded against the Node.js
 * `EventEmitter` interface.
 *
 * @constructor
 * @public
 */
function EventEmitter() {
  this._events = new Events();
  this._eventsCount = 0;
}

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var names = []
    , events
    , name;

  if (this._eventsCount === 0) return names;

  for (name in (events = this._events)) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Array} The registered listeners.
 * @public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  var evt = prefix ? prefix + event : event
    , handlers = this._events[evt];

  if (!handlers) return [];
  if (handlers.fn) return [handlers.fn];

  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
    ee[i] = handlers[i].fn;
  }

  return ee;
};

/**
 * Return the number of listeners listening to a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Number} The number of listeners.
 * @public
 */
EventEmitter.prototype.listenerCount = function listenerCount(event) {
  var evt = prefix ? prefix + event : event
    , listeners = this._events[evt];

  if (!listeners) return 0;
  if (listeners.fn) return 1;
  return listeners.length;
};

/**
 * Calls each of the listeners registered for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @returns {Boolean} `true` if the event had listeners, else `false`.
 * @public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if (listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Add a listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  return addListener(this, event, fn, context, false);
};

/**
 * Add a one-time listener for a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn The listener function.
 * @param {*} [context=this] The context to invoke the listener with.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  return addListener(this, event, fn, context, true);
};

/**
 * Remove the listeners of a given event.
 *
 * @param {(String|Symbol)} event The event name.
 * @param {Function} fn Only remove the listeners that match this function.
 * @param {*} context Only remove the listeners that have this context.
 * @param {Boolean} once Only remove one-time listeners.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events[evt]) return this;
  if (!fn) {
    clearEvent(this, evt);
    return this;
  }

  var listeners = this._events[evt];

  if (listeners.fn) {
    if (
      listeners.fn === fn &&
      (!once || listeners.once) &&
      (!context || listeners.context === context)
    ) {
      clearEvent(this, evt);
    }
  } else {
    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
      if (
        listeners[i].fn !== fn ||
        (once && !listeners[i].once) ||
        (context && listeners[i].context !== context)
      ) {
        events.push(listeners[i]);
      }
    }

    //
    // Reset the array, or remove it completely if we have no more listeners.
    //
    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
    else clearEvent(this, evt);
  }

  return this;
};

/**
 * Remove all listeners, or those of the specified event.
 *
 * @param {(String|Symbol)} [event] The event name.
 * @returns {EventEmitter} `this`.
 * @public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  var evt;

  if (event) {
    evt = prefix ? prefix + event : event;
    if (this._events[evt]) clearEvent(this, evt);
  } else {
    this._events = new Events();
    this._eventsCount = 0;
  }

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Allow `EventEmitter` to be imported as module namespace.
//
EventEmitter.EventEmitter = EventEmitter;

//
// Expose the module.
//
if (true) {
  module.exports = EventEmitter;
}


/***/ }),

/***/ 645:
/***/ ((__unused_webpack_module, exports) => {

/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),

/***/ 2632:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {bech32, hex, utf8} = __webpack_require__(9187)

// defaults for encode; default timestamp is current time at call
const DEFAULTNETWORK = {
  // default network is bitcoin
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  validWitnessVersions: [0]
}
const TESTNETWORK = {
  bech32: 'tb',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0]
}
const REGTESTNETWORK = {
  bech32: 'bcrt',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0]
}
const SIMNETWORK = {
  bech32: 'sb',
  pubKeyHash: 0x3f,
  scriptHash: 0x7b,
  validWitnessVersions: [0]
}

const FEATUREBIT_ORDER = [
  'option_data_loss_protect',
  'initial_routing_sync',
  'option_upfront_shutdown_script',
  'gossip_queries',
  'var_onion_optin',
  'gossip_queries_ex',
  'option_static_remotekey',
  'payment_secret',
  'basic_mpp',
  'option_support_large_channel'
]

const DIVISORS = {
  m: BigInt(1e3),
  u: BigInt(1e6),
  n: BigInt(1e9),
  p: BigInt(1e12)
}

const MAX_MILLISATS = BigInt('2100000000000000000')

const MILLISATS_PER_BTC = BigInt(1e11)

const TAGCODES = {
  payment_hash: 1,
  payment_secret: 16,
  description: 13,
  payee: 19,
  description_hash: 23, // commit to longer descriptions (used by lnurl-pay)
  expiry: 6, // default: 3600 (1 hour)
  min_final_cltv_expiry: 24, // default: 9
  fallback_address: 9,
  route_hint: 3, // for extra routing info (private etc.)
  feature_bits: 5,
  metadata: 27
}

// reverse the keys and values of TAGCODES and insert into TAGNAMES
const TAGNAMES = {}
for (let i = 0, keys = Object.keys(TAGCODES); i < keys.length; i++) {
  const currentName = keys[i]
  const currentCode = TAGCODES[keys[i]].toString()
  TAGNAMES[currentCode] = currentName
}

const TAGPARSERS = {
  1: words => hex.encode(bech32.fromWordsUnsafe(words)), // 256 bits
  16: words => hex.encode(bech32.fromWordsUnsafe(words)), // 256 bits
  13: words => utf8.encode(bech32.fromWordsUnsafe(words)), // string variable length
  19: words => hex.encode(bech32.fromWordsUnsafe(words)), // 264 bits
  23: words => hex.encode(bech32.fromWordsUnsafe(words)), // 256 bits
  27: words => hex.encode(bech32.fromWordsUnsafe(words)), // variable
  6: wordsToIntBE, // default: 3600 (1 hour)
  24: wordsToIntBE, // default: 9
  3: routingInfoParser, // for extra routing info (private etc.)
  5: featureBitsParser // keep feature bits as array of 5 bit words
}

function getUnknownParser(tagCode) {
  return words => ({
    tagCode: parseInt(tagCode),
    words: bech32.encode('unknown', words, Number.MAX_SAFE_INTEGER)
  })
}

function wordsToIntBE(words) {
  return words.reverse().reduce((total, item, index) => {
    return total + item * Math.pow(32, index)
  }, 0)
}

// first convert from words to buffer, trimming padding where necessary
// parse in 51 byte chunks. See encoder for details.
function routingInfoParser(words) {
  const routes = []
  let pubkey,
    shortChannelId,
    feeBaseMSats,
    feeProportionalMillionths,
    cltvExpiryDelta
  let routesBuffer = bech32.fromWordsUnsafe(words)
  while (routesBuffer.length > 0) {
    pubkey = hex.encode(routesBuffer.slice(0, 33)) // 33 bytes
    shortChannelId = hex.encode(routesBuffer.slice(33, 41)) // 8 bytes
    feeBaseMSats = parseInt(hex.encode(routesBuffer.slice(41, 45)), 16) // 4 bytes
    feeProportionalMillionths = parseInt(
      hex.encode(routesBuffer.slice(45, 49)),
      16
    ) // 4 bytes
    cltvExpiryDelta = parseInt(hex.encode(routesBuffer.slice(49, 51)), 16) // 2 bytes

    routesBuffer = routesBuffer.slice(51)

    routes.push({
      pubkey,
      short_channel_id: shortChannelId,
      fee_base_msat: feeBaseMSats,
      fee_proportional_millionths: feeProportionalMillionths,
      cltv_expiry_delta: cltvExpiryDelta
    })
  }
  return routes
}

function featureBitsParser(words) {
  const bools = words
    .slice()
    .reverse()
    .map(word => [
      !!(word & 0b1),
      !!(word & 0b10),
      !!(word & 0b100),
      !!(word & 0b1000),
      !!(word & 0b10000)
    ])
    .reduce((finalArr, itemArr) => finalArr.concat(itemArr), [])
  while (bools.length < FEATUREBIT_ORDER.length * 2) {
    bools.push(false)
  }

  const featureBits = {}

  FEATUREBIT_ORDER.forEach((featureName, index) => {
    let status
    if (bools[index * 2]) {
      status = 'required'
    } else if (bools[index * 2 + 1]) {
      status = 'supported'
    } else {
      status = 'unsupported'
    }
    featureBits[featureName] = status
  })

  const extraBits = bools.slice(FEATUREBIT_ORDER.length * 2)
  featureBits.extra_bits = {
    start_bit: FEATUREBIT_ORDER.length * 2,
    bits: extraBits,
    has_required: extraBits.reduce(
      (result, bit, index) =>
        index % 2 !== 0 ? result || false : result || bit,
      false
    )
  }

  return featureBits
}

function hrpToMillisat(hrpString, outputString) {
  let divisor, value
  if (hrpString.slice(-1).match(/^[munp]$/)) {
    divisor = hrpString.slice(-1)
    value = hrpString.slice(0, -1)
  } else if (hrpString.slice(-1).match(/^[^munp0-9]$/)) {
    throw new Error('Not a valid multiplier for the amount')
  } else {
    value = hrpString
  }

  if (!value.match(/^\d+$/))
    throw new Error('Not a valid human readable amount')

  const valueBN = BigInt(value)

  const millisatoshisBN = divisor
    ? (valueBN * MILLISATS_PER_BTC) / DIVISORS[divisor]
    : valueBN * MILLISATS_PER_BTC

  if (
    (divisor === 'p' && !(valueBN % BigInt(10) === BigInt(0))) ||
    millisatoshisBN > MAX_MILLISATS
  ) {
    throw new Error('Amount is outside of valid range')
  }

  return outputString ? millisatoshisBN.toString() : millisatoshisBN
}

// decode will only have extra comments that aren't covered in encode comments.
// also if anything is hard to read I'll comment.
function decode(paymentRequest, network) {
  if (typeof paymentRequest !== 'string')
    throw new Error('Lightning Payment Request must be string')
  if (paymentRequest.slice(0, 2).toLowerCase() !== 'ln')
    throw new Error('Not a proper lightning payment request')

  const sections = []
  const decoded = bech32.decode(paymentRequest, Number.MAX_SAFE_INTEGER)
  paymentRequest = paymentRequest.toLowerCase()
  const prefix = decoded.prefix
  let words = decoded.words
  let letters = paymentRequest.slice(prefix.length + 1)
  let sigWords = words.slice(-104)
  words = words.slice(0, -104)

  // Without reverse lookups, can't say that the multipier at the end must
  // have a number before it, so instead we parse, and if the second group
  // doesn't have anything, there's a good chance the last letter of the
  // coin type got captured by the third group, so just re-regex without
  // the number.
  let prefixMatches = prefix.match(/^ln(\S+?)(\d*)([a-zA-Z]?)$/)
  if (prefixMatches && !prefixMatches[2])
    prefixMatches = prefix.match(/^ln(\S+)$/)
  if (!prefixMatches) {
    throw new Error('Not a proper lightning payment request')
  }

  // "ln" section
  sections.push({
    name: 'lightning_network',
    letters: 'ln'
  })

  // "bc" section
  const bech32Prefix = prefixMatches[1]
  let coinNetwork
  if (!network) {
    switch (bech32Prefix) {
      case DEFAULTNETWORK.bech32:
        coinNetwork = DEFAULTNETWORK
        break
      case TESTNETWORK.bech32:
        coinNetwork = TESTNETWORK
        break
      case REGTESTNETWORK.bech32:
        coinNetwork = REGTESTNETWORK
        break
      case SIMNETWORK.bech32:
        coinNetwork = SIMNETWORK
        break
    }
  } else {
    if (
      network.bech32 === undefined ||
      network.pubKeyHash === undefined ||
      network.scriptHash === undefined ||
      !Array.isArray(network.validWitnessVersions)
    )
      throw new Error('Invalid network')
    coinNetwork = network
  }
  if (!coinNetwork || coinNetwork.bech32 !== bech32Prefix) {
    throw new Error('Unknown coin bech32 prefix')
  }
  sections.push({
    name: 'coin_network',
    letters: bech32Prefix,
    value: coinNetwork
  })

  // amount section
  const value = prefixMatches[2]
  let millisatoshis
  if (value) {
    const divisor = prefixMatches[3]
    millisatoshis = hrpToMillisat(value + divisor, true)
    sections.push({
      name: 'amount',
      letters: prefixMatches[2] + prefixMatches[3],
      value: millisatoshis
    })
  } else {
    millisatoshis = null
  }

  // "1" separator
  sections.push({
    name: 'separator',
    letters: '1'
  })

  // timestamp
  const timestamp = wordsToIntBE(words.slice(0, 7))
  words = words.slice(7) // trim off the left 7 words
  sections.push({
    name: 'timestamp',
    letters: letters.slice(0, 7),
    value: timestamp
  })
  letters = letters.slice(7)

  let tagName, parser, tagLength, tagWords
  // we have no tag count to go on, so just keep hacking off words
  // until we have none.
  while (words.length > 0) {
    const tagCode = words[0].toString()
    tagName = TAGNAMES[tagCode] || 'unknown_tag'
    parser = TAGPARSERS[tagCode] || getUnknownParser(tagCode)
    words = words.slice(1)

    tagLength = wordsToIntBE(words.slice(0, 2))
    words = words.slice(2)

    tagWords = words.slice(0, tagLength)
    words = words.slice(tagLength)

    sections.push({
      name: tagName,
      tag: letters[0],
      letters: letters.slice(0, 1 + 2 + tagLength),
      value: parser(tagWords) // see: parsers for more comments
    })
    letters = letters.slice(1 + 2 + tagLength)
  }

  // signature
  sections.push({
    name: 'signature',
    letters: letters.slice(0, 104),
    value: hex.encode(bech32.fromWordsUnsafe(sigWords))
  })
  letters = letters.slice(104)

  // checksum
  sections.push({
    name: 'checksum',
    letters: letters
  })

  let result = {
    paymentRequest,
    sections,

    get expiry() {
      let exp = sections.find(s => s.name === 'expiry')
      if (exp) return getValue('timestamp') + exp.value
    },

    get route_hints() {
      return sections.filter(s => s.name === 'route_hint').map(s => s.value)
    }
  }

  for (let name in TAGCODES) {
    if (name === 'route_hint') {
      // route hints can be multiple, so this won't work for them
      continue
    }

    Object.defineProperty(result, name, {
      get() {
        return getValue(name)
      }
    })
  }

  return result

  function getValue(name) {
    let section = sections.find(s => s.name === name)
    return section ? section.value : undefined
  }
}

module.exports = {
  decode,
  hrpToMillisat
}


/***/ }),

/***/ 7824:
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}


/***/ }),

/***/ 9372:
/***/ ((module) => {

/**
 * A node in a Trie that allows for prefix based searching
 * @class
 */
class TrieNode {
  constructor() {
    this._childPaths = {};
    this._data = [];

    return this;
  }

  add(key, entry) {
    const splitKey = (key || "").split("");
    const keyLength = splitKey.length - 1;
    let node = this;

    for (let i = keyLength; i >= 0; i--) {
      const currentKey = splitKey[keyLength - i];

      if (!node._childPaths[currentKey]) {
        node = node._childPaths[currentKey] = new TrieNode();
      } else {
        node = node._childPaths[currentKey];
      }
    }

    node._data.push(entry);

    return node;
  }

  getNode(key) {
    const splitKey = (key || "").split("");
    const keyLength = splitKey.length - 1;
    let node = this;

    for (let i = keyLength; i >= 0; i--) {
      node = node._childPaths[splitKey[keyLength - i]] || null;
      if (node === null) return null;
    }

    return node;
  }

  getData(key) {
    const rootNode = this.getNode(key);
    if (!rootNode) return null;

    // search from rootNode down
    const children = [rootNode];
    const results = [];

    // Under normal circumstances, mutating an array you're traversing 
    // is bad and this is less readable, but this has outperformed everything else
    for (let i = 0; i < children.length; i++) {
      const currentChild = children[i];

      if (currentChild._data.length) {
        results.push.apply(results, currentChild._data);
      }

      const grandchildNodes = Object.values(currentChild._childPaths);
      if (grandchildNodes.length) {
        children.push.apply(children, grandchildNodes);
      }
    }

    return results;
  }
}

module.exports = TrieNode;


/***/ }),

/***/ 2278:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Container = void 0;
var ForOfAdaptor_1 = __webpack_require__(7428);
/**
 * Basic container.
 *
 * @template T Stored elements' type
 * @template SourceT Derived type extending this {@link Container}
 * @template IteratorT Iterator type
 * @template ReverseT Reverse iterator type
 * @template PElem Parent type of *T*, used for inserting elements through {@link assign} and {@link insert}.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var Container = /** @class */ (function () {
    function Container() {
    }
    /**
     * @inheritDoc
     */
    Container.prototype.empty = function () {
        return this.size() === 0;
    };
    /**
     * @inheritDoc
     */
    Container.prototype.rbegin = function () {
        return this.end().reverse();
    };
    /**
     * @inheritDoc
     */
    Container.prototype.rend = function () {
        return this.begin().reverse();
    };
    /**
     * @inheritDoc
     */
    Container.prototype[Symbol.iterator] = function () {
        return new ForOfAdaptor_1.ForOfAdaptor(this.begin(), this.end());
    };
    /**
     * @inheritDoc
     */
    Container.prototype.toJSON = function () {
        var e_1, _a;
        var ret = [];
        try {
            for (var _b = __values(this), _c = _b.next(); !_c.done; _c = _b.next()) {
                var elem = _c.value;
                ret.push(elem);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return ret;
    };
    return Container;
}());
exports.Container = Container;
//# sourceMappingURL=Container.js.map

/***/ }),

/***/ 9683:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MapContainer = void 0;
var Container_1 = __webpack_require__(2278);
var NativeArrayIterator_1 = __webpack_require__(9932);
/**
 * Basic map container.
 *
 * @template Key Key type
 * @template T Mapped type
 * @template Unique Whether duplicated key is blocked or not
 * @template Source Derived type extending this {@link MapContainer}
 * @template IteratorT Iterator type
 * @template ReverseT Reverse iterator type
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var MapContainer = /** @class */ (function (_super) {
    __extends(MapContainer, _super);
    /* ---------------------------------------------------------
        CONSTURCTORS
    --------------------------------------------------------- */
    /**
     * Default Constructor.
     */
    function MapContainer(factory) {
        var _this = _super.call(this) || this;
        _this.data_ = factory(_this);
        return _this;
    }
    /**
     * @inheritDoc
     */
    MapContainer.prototype.assign = function (first, last) {
        // INSERT
        this.clear();
        this.insert(first, last);
    };
    /**
     * @inheritDoc
     */
    MapContainer.prototype.clear = function () {
        // TO BE ABSTRACT
        this.data_.clear();
    };
    /**
     * @inheritDoc
     */
    MapContainer.prototype.begin = function () {
        return this.data_.begin();
    };
    /**
     * @inheritDoc
     */
    MapContainer.prototype.end = function () {
        return this.data_.end();
    };
    /* ---------------------------------------------------------
        ELEMENTS
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    MapContainer.prototype.has = function (key) {
        return !this.find(key).equals(this.end());
    };
    /**
     * @inheritDoc
     */
    MapContainer.prototype.size = function () {
        return this.data_.size();
    };
    /* =========================================================
        ELEMENTS I/O
            - INSERT
            - ERASE
            - UTILITY
            - POST-PROCESS
    ============================================================
        INSERT
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    MapContainer.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        // INSERT BY RANGE
        var first = new NativeArrayIterator_1.NativeArrayIterator(items, 0);
        var last = new NativeArrayIterator_1.NativeArrayIterator(items, items.length);
        this.insert(first, last);
        // RETURN SIZE
        return this.size();
    };
    MapContainer.prototype.insert = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length === 1)
            return this.emplace(args[0].first, args[0].second);
        else if (args[0].next instanceof Function &&
            args[1].next instanceof Function)
            return this._Insert_by_range(args[0], args[1]);
        else
            return this.emplace_hint(args[0], args[1].first, args[1].second);
    };
    MapContainer.prototype.erase = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length === 1 &&
            (args[0] instanceof this.end().constructor === false ||
                args[0].source() !== this))
            return this._Erase_by_key(args[0]);
        else if (args.length === 1)
            return this._Erase_by_range(args[0]);
        else
            return this._Erase_by_range(args[0], args[1]);
    };
    MapContainer.prototype._Erase_by_range = function (first, last) {
        if (last === void 0) { last = first.next(); }
        // ERASE
        var it = this.data_.erase(first, last);
        // POST-PROCESS
        this._Handle_erase(first, last);
        return it;
    };
    return MapContainer;
}(Container_1.Container));
exports.MapContainer = MapContainer;
//# sourceMappingURL=MapContainer.js.map

/***/ }),

/***/ 6639:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SetContainer = void 0;
var Container_1 = __webpack_require__(2278);
var NativeArrayIterator_1 = __webpack_require__(9932);
/**
 * Basic set container.
 *
 * @template Key Key type
 * @template Unique Whether duplicated key is blocked or not
 * @template Source Derived type extending this {@link SetContainer}
 * @template IteratorT Iterator type
 * @template ReverseT Reverse iterator type
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var SetContainer = /** @class */ (function (_super) {
    __extends(SetContainer, _super);
    /* ---------------------------------------------------------
        CONSTURCTORS
    --------------------------------------------------------- */
    /**
     * Default Constructor.
     */
    function SetContainer(factory) {
        var _this = _super.call(this) || this;
        _this.data_ = factory(_this);
        return _this;
    }
    /**
     * @inheritDoc
     */
    SetContainer.prototype.assign = function (first, last) {
        // INSERT
        this.clear();
        this.insert(first, last);
    };
    /**
     * @inheritDoc
     */
    SetContainer.prototype.clear = function () {
        // TO BE ABSTRACT
        this.data_.clear();
    };
    /**
     * @inheritDoc
     */
    SetContainer.prototype.begin = function () {
        return this.data_.begin();
    };
    /**
     * @inheritDoc
     */
    SetContainer.prototype.end = function () {
        return this.data_.end();
    };
    /* ---------------------------------------------------------
        ELEMENTS
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    SetContainer.prototype.has = function (key) {
        return !this.find(key).equals(this.end());
    };
    /**
     * @inheritDoc
     */
    SetContainer.prototype.size = function () {
        return this.data_.size();
    };
    /* =========================================================
        ELEMENTS I/O
            - INSERT
            - ERASE
            - UTILITY
            - POST-PROCESS
    ============================================================
        INSERT
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    SetContainer.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        if (items.length === 0)
            return this.size();
        // INSERT BY RANGE
        var first = new NativeArrayIterator_1.NativeArrayIterator(items, 0);
        var last = new NativeArrayIterator_1.NativeArrayIterator(items, items.length);
        this._Insert_by_range(first, last);
        // RETURN SIZE
        return this.size();
    };
    SetContainer.prototype.insert = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length === 1)
            return this._Insert_by_key(args[0]);
        else if (args[0].next instanceof Function &&
            args[1].next instanceof Function)
            return this._Insert_by_range(args[0], args[1]);
        else
            return this._Insert_by_hint(args[0], args[1]);
    };
    SetContainer.prototype.erase = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length === 1 &&
            !(args[0] instanceof this.end().constructor &&
                args[0].source() === this))
            return this._Erase_by_val(args[0]);
        else if (args.length === 1)
            return this._Erase_by_range(args[0]);
        else
            return this._Erase_by_range(args[0], args[1]);
    };
    SetContainer.prototype._Erase_by_range = function (first, last) {
        if (last === void 0) { last = first.next(); }
        // ERASE
        var it = this.data_.erase(first, last);
        // POST-PROCESS
        this._Handle_erase(first, last);
        return it;
    };
    return SetContainer;
}(Container_1.Container));
exports.SetContainer = SetContainer;
//# sourceMappingURL=SetContainer.js.map

/***/ }),

/***/ 1571:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UniqueMap = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.base
 */
//================================================================
var MapContainer_1 = __webpack_require__(9683);
var ErrorGenerator_1 = __webpack_require__(1566);
/**
 * Basic map container blocking duplicated key.
 *
 * @template Key Key type
 * @template T Mapped type
 * @template Source Derived type extending this {@link UniqueMap}
 * @template IteratorT Iterator type
 * @template ReverseT Reverse iterator type
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var UniqueMap = /** @class */ (function (_super) {
    __extends(UniqueMap, _super);
    function UniqueMap() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    UniqueMap.prototype.count = function (key) {
        return this.find(key).equals(this.end()) ? 0 : 1;
    };
    /**
     * Get a value.
     *
     * @param key Key to search for.
     * @return The value mapped by the key.
     */
    UniqueMap.prototype.get = function (key) {
        var it = this.find(key);
        if (it.equals(this.end()) === true)
            throw ErrorGenerator_1.ErrorGenerator.key_nout_found(this, "get", key);
        return it.second;
    };
    /**
     * Take a value.
     *
     * Get a value, or set the value and returns it.
     *
     * @param key Key to search for.
     * @param generator Value generator when the matched key not found
     * @returns Value, anyway
     */
    UniqueMap.prototype.take = function (key, generator) {
        var it = this.find(key);
        return it.equals(this.end())
            ? this.emplace(key, generator()).first.second
            : it.second;
    };
    /**
     * Set a value with key.
     *
     * @param key Key to be mapped or search for.
     * @param val Value to insert or assign.
     */
    UniqueMap.prototype.set = function (key, val) {
        this.insert_or_assign(key, val);
    };
    UniqueMap.prototype.insert = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return _super.prototype.insert.apply(this, __spreadArray([], __read(args), false));
    };
    UniqueMap.prototype._Insert_by_range = function (first, last) {
        for (var it = first; !it.equals(last); it = it.next())
            this.emplace(it.value.first, it.value.second);
    };
    UniqueMap.prototype.insert_or_assign = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (args.length === 2) {
            return this._Insert_or_assign_with_key_value(args[0], args[1]);
        }
        else if (args.length === 3) {
            // INSERT OR ASSIGN AN ELEMENT
            return this._Insert_or_assign_with_hint(args[0], args[1], args[2]);
        }
    };
    UniqueMap.prototype._Insert_or_assign_with_key_value = function (key, value) {
        var ret = this.emplace(key, value);
        if (ret.second === false)
            ret.first.second = value;
        return ret;
    };
    UniqueMap.prototype._Insert_or_assign_with_hint = function (hint, key, value) {
        var ret = this.emplace_hint(hint, key, value);
        if (ret.second !== value)
            ret.second = value;
        return ret;
    };
    UniqueMap.prototype.extract = function (param) {
        if (param instanceof this.end().constructor)
            return this._Extract_by_iterator(param);
        else
            return this._Extract_by_key(param);
    };
    UniqueMap.prototype._Extract_by_key = function (key) {
        var it = this.find(key);
        if (it.equals(this.end()) === true)
            throw ErrorGenerator_1.ErrorGenerator.key_nout_found(this, "extract", key);
        var ret = it.value;
        this._Erase_by_range(it);
        return ret;
    };
    UniqueMap.prototype._Extract_by_iterator = function (it) {
        if (it.equals(this.end()) === true)
            return this.end();
        this._Erase_by_range(it);
        return it;
    };
    UniqueMap.prototype._Erase_by_key = function (key) {
        var it = this.find(key);
        if (it.equals(this.end()) === true)
            return 0;
        this._Erase_by_range(it);
        return 1;
    };
    /* ---------------------------------------------------------
        UTILITY
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    UniqueMap.prototype.merge = function (source) {
        for (var it = source.begin(); !it.equals(source.end());)
            if (this.has(it.first) === false) {
                this.insert(it.value);
                it = source.erase(it);
            }
            else
                it = it.next();
    };
    return UniqueMap;
}(MapContainer_1.MapContainer));
exports.UniqueMap = UniqueMap;
//# sourceMappingURL=UniqueMap.js.map

/***/ }),

/***/ 2570:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UniqueSet = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.base
 */
//================================================================
var SetContainer_1 = __webpack_require__(6639);
var ErrorGenerator_1 = __webpack_require__(1566);
/**
 * Basic set container blocking duplicated key.
 *
 * @template Key Key type
 * @template Source Derived type extending this {@link UniqueSet}
 * @template IteratorT Iterator type
 * @template ReverseT Reverse iterator type
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var UniqueSet = /** @class */ (function (_super) {
    __extends(UniqueSet, _super);
    function UniqueSet() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /* ---------------------------------------------------------
        ACCESSOR
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    UniqueSet.prototype.count = function (key) {
        return this.find(key).equals(this.end()) ? 0 : 1;
    };
    UniqueSet.prototype.insert = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return _super.prototype.insert.apply(this, __spreadArray([], __read(args), false));
    };
    UniqueSet.prototype._Insert_by_range = function (first, last) {
        for (; !first.equals(last); first = first.next())
            this._Insert_by_key(first.value);
    };
    UniqueSet.prototype.extract = function (param) {
        if (param instanceof this.end().constructor)
            return this._Extract_by_iterator(param);
        else
            return this._Extract_by_val(param);
    };
    UniqueSet.prototype._Extract_by_val = function (key) {
        var it = this.find(key);
        if (it.equals(this.end()) === true)
            throw ErrorGenerator_1.ErrorGenerator.key_nout_found(this, "extract", key);
        this._Erase_by_range(it);
        return key;
    };
    UniqueSet.prototype._Extract_by_iterator = function (it) {
        if (it.equals(this.end()) === true || this.has(it.value) === false)
            return this.end();
        this._Erase_by_range(it);
        return it;
    };
    UniqueSet.prototype._Erase_by_val = function (key) {
        var it = this.find(key);
        if (it.equals(this.end()) === true)
            return 0;
        this._Erase_by_range(it);
        return 1;
    };
    /* ---------------------------------------------------------
        UTILITY
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    UniqueSet.prototype.merge = function (source) {
        for (var it = source.begin(); !it.equals(source.end());) {
            if (this.has(it.value) === false) {
                this.insert(it.value);
                it = source.erase(it);
            }
            else
                it = it.next();
        }
    };
    return UniqueSet;
}(SetContainer_1.SetContainer));
exports.UniqueSet = UniqueSet;
//# sourceMappingURL=UniqueSet.js.map

/***/ }),

/***/ 1266:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HashMap = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var UniqueMap_1 = __webpack_require__(1571);
var IHashContainer_1 = __webpack_require__(4970);
var MapElementList_1 = __webpack_require__(9753);
var MapHashBuckets_1 = __webpack_require__(3136);
var Entry_1 = __webpack_require__(9430);
var Pair_1 = __webpack_require__(5351);
/**
 * Unique-key Map based on Hash buckets.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var HashMap = /** @class */ (function (_super) {
    __extends(HashMap, _super);
    function HashMap() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _this = _super.call(this, function (thisArg) { return new MapElementList_1.MapElementList(thisArg); }) || this;
        IHashContainer_1.IHashContainer.construct.apply(IHashContainer_1.IHashContainer, __spreadArray([_this,
            HashMap,
            function (hash, pred) {
                _this.buckets_ = new MapHashBuckets_1.MapHashBuckets(_this, hash, pred);
            }], __read(args), false));
        return _this;
    }
    /* ---------------------------------------------------------
        ASSIGN & CLEAR
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashMap.prototype.clear = function () {
        this.buckets_.clear();
        _super.prototype.clear.call(this);
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.swap = function (obj) {
        var _a, _b;
        // SWAP CONTENTS
        _a = __read([obj.data_, this.data_], 2), this.data_ = _a[0], obj.data_ = _a[1];
        MapElementList_1.MapElementList._Swap_associative(this.data_, obj.data_);
        // SWAP BUCKETS
        MapHashBuckets_1.MapHashBuckets._Swap_source(this.buckets_, obj.buckets_);
        _b = __read([obj.buckets_, this.buckets_], 2), this.buckets_ = _b[0], obj.buckets_ = _b[1];
    };
    /* =========================================================
        ACCESSORS
            - MEMBER
            - HASH
    ============================================================
        MEMBER
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashMap.prototype.find = function (key) {
        return this.buckets_.find(key);
    };
    HashMap.prototype.begin = function (index) {
        if (index === void 0) { index = null; }
        if (index === null)
            return _super.prototype.begin.call(this);
        else
            return this.buckets_.at(index)[0];
    };
    HashMap.prototype.end = function (index) {
        if (index === void 0) { index = null; }
        if (index === null)
            return _super.prototype.end.call(this);
        else {
            var bucket = this.buckets_.at(index);
            return bucket[bucket.length - 1].next();
        }
    };
    HashMap.prototype.rbegin = function (index) {
        if (index === void 0) { index = null; }
        return this.end(index).reverse();
    };
    HashMap.prototype.rend = function (index) {
        if (index === void 0) { index = null; }
        return this.begin(index).reverse();
    };
    /* ---------------------------------------------------------
        HASH
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashMap.prototype.bucket_count = function () {
        return this.buckets_.length();
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.bucket_size = function (index) {
        return this.buckets_.at(index).length;
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.load_factor = function () {
        return this.buckets_.load_factor();
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.hash_function = function () {
        return this.buckets_.hash_function();
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.key_eq = function () {
        return this.buckets_.key_eq();
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.bucket = function (key) {
        return this.hash_function()(key) % this.buckets_.length();
    };
    HashMap.prototype.max_load_factor = function (z) {
        if (z === void 0) { z = null; }
        return this.buckets_.max_load_factor(z);
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.reserve = function (n) {
        this.buckets_.reserve(n);
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.rehash = function (n) {
        this.buckets_.rehash(n);
    };
    /* =========================================================
        ELEMENTS I/O
            - INSERT
            - POST-PROCESS
    ============================================================
        INSERT
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashMap.prototype.emplace = function (key, val) {
        // TEST WHETHER EXIST
        var it = this.find(key);
        if (it.equals(this.end()) === false)
            return new Pair_1.Pair(it, false);
        // INSERT
        this.data_.push(new Entry_1.Entry(key, val));
        it = it.prev();
        // POST-PROCESS
        this._Handle_insert(it, it.next());
        return new Pair_1.Pair(it, true);
    };
    /**
     * @inheritDoc
     */
    HashMap.prototype.emplace_hint = function (hint, key, val) {
        // FIND DUPLICATED KEY
        var it = this.find(key);
        if (it.equals(this.end()) === true) {
            // INSERT
            it = this.data_.insert(hint, new Entry_1.Entry(key, val));
            // POST-PROCESS
            this._Handle_insert(it, it.next());
        }
        return it;
    };
    /* ---------------------------------------------------------
        POST-PROCESS
    --------------------------------------------------------- */
    HashMap.prototype._Handle_insert = function (first, last) {
        for (; !first.equals(last); first = first.next())
            this.buckets_.insert(first);
    };
    HashMap.prototype._Handle_erase = function (first, last) {
        for (; !first.equals(last); first = first.next())
            this.buckets_.erase(first);
    };
    return HashMap;
}(UniqueMap_1.UniqueMap));
exports.HashMap = HashMap;
/**
 *
 */
(function (HashMap) {
    // BODY
    HashMap.Iterator = MapElementList_1.MapElementList.Iterator;
    HashMap.ReverseIterator = MapElementList_1.MapElementList.ReverseIterator;
})(HashMap = exports.HashMap || (exports.HashMap = {}));
exports.HashMap = HashMap;
//# sourceMappingURL=HashMap.js.map

/***/ }),

/***/ 5017:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HashSet = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var UniqueSet_1 = __webpack_require__(2570);
var IHashContainer_1 = __webpack_require__(4970);
var SetElementList_1 = __webpack_require__(7976);
var SetHashBuckets_1 = __webpack_require__(6449);
var Pair_1 = __webpack_require__(5351);
/**
 * Unique-key Set based on Hash buckets.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var HashSet = /** @class */ (function (_super) {
    __extends(HashSet, _super);
    function HashSet() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var _this = _super.call(this, function (thisArg) { return new SetElementList_1.SetElementList(thisArg); }) || this;
        IHashContainer_1.IHashContainer.construct.apply(IHashContainer_1.IHashContainer, __spreadArray([_this,
            HashSet,
            function (hash, pred) {
                _this.buckets_ = new SetHashBuckets_1.SetHashBuckets(_this, hash, pred);
            }], __read(args), false));
        return _this;
    }
    /* ---------------------------------------------------------
        ASSIGN & CLEAR
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashSet.prototype.clear = function () {
        this.buckets_.clear();
        _super.prototype.clear.call(this);
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.swap = function (obj) {
        var _a, _b;
        // SWAP CONTENTS
        _a = __read([obj.data_, this.data_], 2), this.data_ = _a[0], obj.data_ = _a[1];
        SetElementList_1.SetElementList._Swap_associative(this.data_, obj.data_);
        // SWAP BUCKETS
        SetHashBuckets_1.SetHashBuckets._Swap_source(this.buckets_, obj.buckets_);
        _b = __read([obj.buckets_, this.buckets_], 2), this.buckets_ = _b[0], obj.buckets_ = _b[1];
    };
    /* =========================================================
        ACCESSORS
            - MEMBER
            - HASH
    ============================================================
        MEMBER
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashSet.prototype.find = function (key) {
        return this.buckets_.find(key);
    };
    HashSet.prototype.begin = function (index) {
        if (index === void 0) { index = null; }
        if (index === null)
            return _super.prototype.begin.call(this);
        else
            return this.buckets_.at(index)[0];
    };
    HashSet.prototype.end = function (index) {
        if (index === void 0) { index = null; }
        if (index === null)
            return _super.prototype.end.call(this);
        else {
            var bucket = this.buckets_.at(index);
            return bucket[bucket.length - 1].next();
        }
    };
    HashSet.prototype.rbegin = function (index) {
        if (index === void 0) { index = null; }
        return this.end(index).reverse();
    };
    HashSet.prototype.rend = function (index) {
        if (index === void 0) { index = null; }
        return this.begin(index).reverse();
    };
    /* ---------------------------------------------------------
        HASH
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    HashSet.prototype.bucket_count = function () {
        return this.buckets_.length();
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.bucket_size = function (n) {
        return this.buckets_.at(n).length;
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.load_factor = function () {
        return this.buckets_.load_factor();
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.hash_function = function () {
        return this.buckets_.hash_function();
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.key_eq = function () {
        return this.buckets_.key_eq();
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.bucket = function (key) {
        return this.hash_function()(key) % this.buckets_.length();
    };
    HashSet.prototype.max_load_factor = function (z) {
        if (z === void 0) { z = null; }
        return this.buckets_.max_load_factor(z);
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.reserve = function (n) {
        this.buckets_.reserve(n);
    };
    /**
     * @inheritDoc
     */
    HashSet.prototype.rehash = function (n) {
        this.buckets_.rehash(n);
    };
    /* =========================================================
        ELEMENTS I/O
            - INSERT
            - POST-PROCESS
            - SWAP
    ============================================================
        INSERT
    --------------------------------------------------------- */
    HashSet.prototype._Insert_by_key = function (key) {
        // TEST WHETHER EXIST
        var it = this.find(key);
        if (it.equals(this.end()) === false)
            return new Pair_1.Pair(it, false);
        // INSERT
        this.data_.push(key);
        it = it.prev();
        // POST-PROCESS
        this._Handle_insert(it, it.next());
        return new Pair_1.Pair(it, true);
    };
    HashSet.prototype._Insert_by_hint = function (hint, key) {
        // FIND DUPLICATED KEY
        var it = this.find(key);
        if (it.equals(this.end()) === true) {
            // INSERT
            it = this.data_.insert(hint, key);
            // POST-PROCESS
            this._Handle_insert(it, it.next());
        }
        return it;
    };
    /* ---------------------------------------------------------
        POST-PROCESS
    --------------------------------------------------------- */
    HashSet.prototype._Handle_insert = function (first, last) {
        for (; !first.equals(last); first = first.next())
            this.buckets_.insert(first);
    };
    HashSet.prototype._Handle_erase = function (first, last) {
        for (; !first.equals(last); first = first.next())
            this.buckets_.erase(first);
    };
    return HashSet;
}(UniqueSet_1.UniqueSet));
exports.HashSet = HashSet;
/**
 *
 */
(function (HashSet) {
    // BODY
    HashSet.Iterator = SetElementList_1.SetElementList.Iterator;
    HashSet.ReverseIterator = SetElementList_1.SetElementList.ReverseIterator;
})(HashSet = exports.HashSet || (exports.HashSet = {}));
exports.HashSet = HashSet;
//# sourceMappingURL=HashSet.js.map

/***/ }),

/***/ 269:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Exception = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
/**
 * Base Exception.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var Exception = /** @class */ (function (_super) {
    __extends(Exception, _super);
    /* ---------------------------------------------------------
        CONSTRUCTOR
    --------------------------------------------------------- */
    /**
     * Initializer Constructor.
     *
     * @param message The error messgae.
     */
    function Exception(message) {
        var _newTarget = this.constructor;
        var _this = _super.call(this, message) || this;
        // INHERITANCE POLYFILL
        var proto = _newTarget.prototype;
        if (Object.setPrototypeOf)
            Object.setPrototypeOf(_this, proto);
        else
            _this.__proto__ = proto;
        return _this;
    }
    Object.defineProperty(Exception.prototype, "name", {
        /* ---------------------------------------------------------
            ACCESSORS
        --------------------------------------------------------- */
        /**
         * The error name.
         */
        get: function () {
            return this.constructor.name;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get error message.
     *
     * @return The error message.
     */
    Exception.prototype.what = function () {
        return this.message;
    };
    /**
     * Native function for `JSON.stringify()`.
     *
     * The {@link Exception.toJSON} function returns only three properties; ({@link name}, {@link message} and {@link stack}). If you want to define a new sub-class extending the {@link Exception} and const the class to export additional props (or remove some props), override this {@link Exception.toJSON} method.
     *
     * @return An object for `JSON.stringify()`.
     */
    Exception.prototype.toJSON = function () {
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
        };
    };
    return Exception;
}(Error));
exports.Exception = Exception;
//# sourceMappingURL=Exception.js.map

/***/ }),

/***/ 9014:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.InvalidArgument = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var LogicError_1 = __webpack_require__(5501);
/**
 * Invalid Argument Exception.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var InvalidArgument = /** @class */ (function (_super) {
    __extends(InvalidArgument, _super);
    /**
     * Initializer Constructor.
     *
     * @param message The error messgae.
     */
    function InvalidArgument(message) {
        return _super.call(this, message) || this;
    }
    return InvalidArgument;
}(LogicError_1.LogicError));
exports.InvalidArgument = InvalidArgument;
//# sourceMappingURL=InvalidArgument.js.map

/***/ }),

/***/ 5501:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LogicError = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var Exception_1 = __webpack_require__(269);
/**
 * Logic Error.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var LogicError = /** @class */ (function (_super) {
    __extends(LogicError, _super);
    /**
     * Initializer Constructor.
     *
     * @param message The error messgae.
     */
    function LogicError(message) {
        return _super.call(this, message) || this;
    }
    return LogicError;
}(Exception_1.Exception));
exports.LogicError = LogicError;
//# sourceMappingURL=LogicError.js.map

/***/ }),

/***/ 7632:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OutOfRange = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var LogicError_1 = __webpack_require__(5501);
/**
 * Out-of-range Exception.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var OutOfRange = /** @class */ (function (_super) {
    __extends(OutOfRange, _super);
    /**
     * Initializer Constructor.
     *
     * @param message The error messgae.
     */
    function OutOfRange(message) {
        return _super.call(this, message) || this;
    }
    return OutOfRange;
}(LogicError_1.LogicError));
exports.OutOfRange = OutOfRange;
//# sourceMappingURL=OutOfRange.js.map

/***/ }),

/***/ 8925:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.greater_equal = exports.greater = exports.less_equal = exports.less = exports.not_equal_to = exports.equal_to = void 0;
var uid_1 = __webpack_require__(4682);
/**
 * Test whether two arguments are equal.
 *
 * @param x The first argument to compare.
 * @param y The second argument to compare.
 * @return Whether two arguments are equal or not.
 */
function equal_to(x, y) {
    // CONVERT TO PRIMITIVE TYPE
    x = x ? x.valueOf() : x;
    y = y ? y.valueOf() : y;
    // DO COMPARE
    if (x instanceof Object &&
        x.equals instanceof Function)
        return x.equals(y);
    else
        return x === y;
}
exports.equal_to = equal_to;
/**
 * Test whether two arguments are not equal.
 *
 * @param x The first argument to compare.
 * @param y The second argument to compare.
 * @return Returns `true`, if two arguments are not equal, otherwise `false`.
 */
function not_equal_to(x, y) {
    return !equal_to(x, y);
}
exports.not_equal_to = not_equal_to;
/**
 * Test whether *x* is less than *y*.
 *
 * @param x The first argument to compare.
 * @param y The second argument to compare.
 * @return Whether *x* is less than *y*.
 */
function less(x, y) {
    // CONVERT TO PRIMITIVE TYPE
    x = x.valueOf();
    y = y.valueOf();
    // DO COMPARE
    if (x instanceof Object)
        if (x.less instanceof Function)
            // has less()
            return x.less(y);
        else
            return (0, uid_1.get_uid)(x) < (0, uid_1.get_uid)(y);
    else
        return x < y;
}
exports.less = less;
/**
 * Test whether *x* is less than or equal to *y*.
 *
 * @param x The first argument to compare.
 * @param y The second argument to compare.
 * @return Whether *x* is less than or equal to *y*.
 */
function less_equal(x, y) {
    return less(x, y) || equal_to(x, y);
}
exports.less_equal = less_equal;
/**
 * Test whether *x* is greater than *y*.
 *
 * @param x The first argument to compare.
 * @param y The second argument to compare.
 * @return Whether *x* is greater than *y*.
 */
function greater(x, y) {
    return !less_equal(x, y);
}
exports.greater = greater;
/**
 * Test whether *x* is greater than or equal to *y*.
 *
 * @param x The first argument to compare.
 * @param y The second argument to compare.
 * @return Whether *x* is greater than or equal to *y*.
 */
function greater_equal(x, y) {
    return !less(x, y);
}
exports.greater_equal = greater_equal;
//# sourceMappingURL=comparators.js.map

/***/ }),

/***/ 9029:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hash = void 0;
var uid_1 = __webpack_require__(4682);
/**
 * Hash function.
 *
 * @param itemList The items to be hashed.
 * @return The hash code.
 */
function hash() {
    var e_1, _a;
    var itemList = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        itemList[_i] = arguments[_i];
    }
    var ret = INIT_VALUE;
    try {
        for (var itemList_1 = __values(itemList), itemList_1_1 = itemList_1.next(); !itemList_1_1.done; itemList_1_1 = itemList_1.next()) {
            var item = itemList_1_1.value;
            item = item ? item.valueOf() : item;
            var type = typeof item;
            if (type === "boolean")
                // BOOLEAN -> 1 BYTE
                ret = _Hash_boolean(item, ret);
            else if (type === "number" || type === "bigint")
                // NUMBER -> 8 BYTES
                ret = _Hash_number(item, ret);
            else if (type === "string")
                // STRING -> {LENGTH} BYTES
                ret = _Hash_string(item, ret);
            else if (item instanceof Object &&
                item.hashCode instanceof Function) {
                var hashed = item.hashCode();
                if (itemList.length === 1)
                    return hashed;
                else {
                    ret = ret ^ hashed;
                    ret *= MULTIPLIER;
                }
            } // object | null | undefined
            else
                ret = _Hash_number((0, uid_1.get_uid)(item), ret);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (itemList_1_1 && !itemList_1_1.done && (_a = itemList_1.return)) _a.call(itemList_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return Math.abs(ret);
}
exports.hash = hash;
function _Hash_boolean(val, ret) {
    ret ^= val ? 1 : 0;
    ret *= MULTIPLIER;
    return ret;
}
function _Hash_number(val, ret) {
    return _Hash_string(val.toString(), ret);
    // // ------------------------------------------
    // //    IN C++
    // //        CONSIDER A NUMBER AS A STRING
    // //        HASH<STRING>((CHAR*)&VAL, 8)
    // // ------------------------------------------
    // // CONSTRUCT BUFFER AND BYTE_ARRAY
    // const buffer: ArrayBuffer = new ArrayBuffer(8);
    // const byteArray: Int8Array = new Int8Array(buffer);
    // const valueArray: Float64Array = new Float64Array(buffer);
    // valueArray[0] = val;
    // for (let i: number = 0; i < byteArray.length; ++i)
    // {
    //     const byte = (byteArray[i] < 0) ? byteArray[i] + 256 : byteArray[i];
    //     ret ^= byte;
    //     ret *= _HASH_MULTIPLIER;
    // }
    // return Math.abs(ret);
}
function _Hash_string(str, ret) {
    for (var i = 0; i < str.length; ++i) {
        ret ^= str.charCodeAt(i);
        ret *= MULTIPLIER;
    }
    return Math.abs(ret);
}
/* ---------------------------------------------------------
    RESERVED ITEMS
--------------------------------------------------------- */
var INIT_VALUE = 2166136261;
var MULTIPLIER = 16777619;
//# sourceMappingURL=hash.js.map

/***/ }),

/***/ 4682:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.get_uid = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var Global_1 = __webpack_require__(4931);
/**
 * Get unique identifier.
 *
 * @param obj Target object.
 * @return The identifier number.
 */
function get_uid(obj) {
    // NO UID EXISTS, THEN ISSUE ONE.
    if (obj instanceof Object) {
        if (obj.hasOwnProperty("__get_m_iUID") === false) {
            var uid_1 = ++(0, Global_1._Get_root)().__s_iUID;
            Object.defineProperty(obj, "__get_m_iUID", {
                value: function () {
                    return uid_1;
                },
            });
        }
        // RETURNS
        return obj.__get_m_iUID();
    }
    else if (obj === undefined)
        return -1;
    // is null
    else
        return 0;
}
exports.get_uid = get_uid;
//# sourceMappingURL=uid.js.map

/***/ }),

/***/ 4931:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports._Get_root = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var node_1 = __webpack_require__(4922);
/**
 * @internal
 */
function _Get_root() {
    if (__s_pRoot === null) {
        __s_pRoot = ((0, node_1.is_node)() ? __webpack_require__.g : self);
        if (__s_pRoot.__s_iUID === undefined)
            __s_pRoot.__s_iUID = 0;
    }
    return __s_pRoot;
}
exports._Get_root = _Get_root;
/**
 * @internal
 */
var __s_pRoot = null;
//# sourceMappingURL=Global.js.map

/***/ }),

/***/ 2644:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IAssociativeContainer = void 0;
var IAssociativeContainer;
(function (IAssociativeContainer) {
    /**
     * @internal
     */
    function construct(source) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var ramda;
        var tail;
        if (args.length >= 1 && args[0] instanceof Array) {
            // INITIALIZER LIST CONSTRUCTOR
            ramda = function () {
                var items = args[0];
                source.push.apply(source, __spreadArray([], __read(items), false));
            };
            tail = args.slice(1);
        }
        else if (args.length >= 2 &&
            args[0].next instanceof Function &&
            args[1].next instanceof Function) {
            // RANGE CONSTRUCTOR
            ramda = function () {
                var first = args[0];
                var last = args[1];
                source.assign(first, last);
            };
            tail = args.slice(2);
        }
        else {
            // DEFAULT CONSTRUCTOR
            ramda = null;
            tail = args;
        }
        return { ramda: ramda, tail: tail };
    }
    IAssociativeContainer.construct = construct;
})(IAssociativeContainer = exports.IAssociativeContainer || (exports.IAssociativeContainer = {}));
//# sourceMappingURL=IAssociativeContainer.js.map

/***/ }),

/***/ 4970:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IHashContainer = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var IAssociativeContainer_1 = __webpack_require__(2644);
var hash_1 = __webpack_require__(9029);
var comparators_1 = __webpack_require__(8925);
var IHashContainer;
(function (IHashContainer) {
    /**
     * @internal
     */
    function construct(source, Source, bucketFactory) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
            args[_i - 3] = arguments[_i];
        }
        // DECLARE MEMBERS
        var post_process = null;
        var hash_function = hash_1.hash;
        var key_eq = comparators_1.equal_to;
        //----
        // INITIALIZE MEMBERS AND POST-PROCESS
        //----
        // BRANCH - METHOD OVERLOADINGS
        if (args.length === 1 && args[0] instanceof Source) {
            // PARAMETERS
            var container_1 = args[0];
            hash_function = container_1.hash_function();
            key_eq = container_1.key_eq();
            // COPY CONSTRUCTOR
            post_process = function () {
                var first = container_1.begin();
                var last = container_1.end();
                source.assign(first, last);
            };
        }
        else {
            var tuple = IAssociativeContainer_1.IAssociativeContainer.construct.apply(IAssociativeContainer_1.IAssociativeContainer, __spreadArray([source], __read(args), false));
            post_process = tuple.ramda;
            if (tuple.tail.length >= 1)
                hash_function = tuple.tail[0];
            if (tuple.tail.length >= 2)
                key_eq = tuple.tail[1];
        }
        //----
        // DO PROCESS
        //----
        // CONSTRUCT BUCKET
        bucketFactory(hash_function, key_eq);
        // ACT POST-PROCESS
        if (post_process !== null)
            post_process();
    }
    IHashContainer.construct = construct;
})(IHashContainer = exports.IHashContainer || (exports.IHashContainer = {}));
//# sourceMappingURL=IHashContainer.js.map

/***/ }),

/***/ 9753:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MapElementList = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var ListContainer_1 = __webpack_require__(7647);
var ListIterator_1 = __webpack_require__(2918);
var ReverseIterator_1 = __webpack_require__(5709);
/**
 * Doubly Linked List storing map elements.
 *
 * @template Key Key type
 * @template T Mapped type
 * @template Unique Whether duplicated key is blocked or not
 * @template Source Source type
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var MapElementList = /** @class */ (function (_super) {
    __extends(MapElementList, _super);
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    function MapElementList(associative) {
        var _this = _super.call(this) || this;
        _this.associative_ = associative;
        return _this;
    }
    MapElementList.prototype._Create_iterator = function (prev, next, val) {
        return MapElementList.Iterator.create(this, prev, next, val);
    };
    /**
     * @internal
     */
    MapElementList._Swap_associative = function (x, y) {
        var _a;
        _a = __read([y.associative_, x.associative_], 2), x.associative_ = _a[0], y.associative_ = _a[1];
    };
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    MapElementList.prototype.associative = function () {
        return this.associative_;
    };
    return MapElementList;
}(ListContainer_1.ListContainer));
exports.MapElementList = MapElementList;
/**
 *
 */
(function (MapElementList) {
    /**
     * Iterator of map container storing elements in a list.
     *
     * @template Key Key type
     * @template T Mapped type
     * @template Unique Whether duplicated key is blocked or not
     * @template Source Source container type
     *
     * @author Jeongho Nam - https://github.com/samchon
     */
    var Iterator = /** @class */ (function (_super) {
        __extends(Iterator, _super);
        /* ---------------------------------------------------------
            CONSTRUCTORS
        --------------------------------------------------------- */
        function Iterator(list, prev, next, val) {
            var _this = _super.call(this, prev, next, val) || this;
            _this.list_ = list;
            return _this;
        }
        /**
         * @internal
         */
        Iterator.create = function (list, prev, next, val) {
            return new Iterator(list, prev, next, val);
        };
        /**
         * @inheritDoc
         */
        Iterator.prototype.reverse = function () {
            return new ReverseIterator(this);
        };
        /* ---------------------------------------------------------
            ACCESSORS
        --------------------------------------------------------- */
        /**
         * @inheritDoc
         */
        Iterator.prototype.source = function () {
            return this.list_.associative();
        };
        Object.defineProperty(Iterator.prototype, "first", {
            /**
             * @inheritDoc
             */
            get: function () {
                return this.value.first;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(Iterator.prototype, "second", {
            /**
             * @inheritDoc
             */
            get: function () {
                return this.value.second;
            },
            /**
             * @inheritDoc
             */
            set: function (val) {
                this.value.second = val;
            },
            enumerable: false,
            configurable: true
        });
        return Iterator;
    }(ListIterator_1.ListIterator));
    MapElementList.Iterator = Iterator;
    /**
     * Reverse iterator of map container storing elements a list.
     *
     * @template Key Key type
     * @template T Mapped type
     * @template Unique Whether duplicated key is blocked or not
     * @template Source Source container type
     *
     * @author Jeongho Nam - https://github.com/samchon
     */
    var ReverseIterator = /** @class */ (function (_super) {
        __extends(ReverseIterator, _super);
        function ReverseIterator() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        /* ---------------------------------------------------------
            CONSTRUCTORS
        --------------------------------------------------------- */
        ReverseIterator.prototype._Create_neighbor = function (base) {
            return new ReverseIterator(base);
        };
        Object.defineProperty(ReverseIterator.prototype, "first", {
            /* ---------------------------------------------------------
                ACCESSORS
            --------------------------------------------------------- */
            /**
             * Get the first, key element.
             *
             * @return The first element.
             */
            get: function () {
                return this.base_.first;
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(ReverseIterator.prototype, "second", {
            /**
             * Get the second, stored element.
             *
             * @return The second element.
             */
            get: function () {
                return this.base_.second;
            },
            /**
             * Set the second, stored element.
             *
             * @param val The value to set.
             */
            set: function (val) {
                this.base_.second = val;
            },
            enumerable: false,
            configurable: true
        });
        return ReverseIterator;
    }(ReverseIterator_1.ReverseIterator));
    MapElementList.ReverseIterator = ReverseIterator;
})(MapElementList = exports.MapElementList || (exports.MapElementList = {}));
exports.MapElementList = MapElementList;
//# sourceMappingURL=MapElementList.js.map

/***/ }),

/***/ 7976:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SetElementList = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var ListContainer_1 = __webpack_require__(7647);
var ListIterator_1 = __webpack_require__(2918);
var ReverseIterator_1 = __webpack_require__(5709);
/**
 * Doubly Linked List storing set elements.
 *
 * @template Key Key type
 * @template Unique Whether duplicated key is blocked or not
 * @template Source Source container type
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var SetElementList = /** @class */ (function (_super) {
    __extends(SetElementList, _super);
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    function SetElementList(associative) {
        var _this = _super.call(this) || this;
        _this.associative_ = associative;
        return _this;
    }
    SetElementList.prototype._Create_iterator = function (prev, next, val) {
        return SetElementList.Iterator.create(this, prev, next, val);
    };
    /**
     * @internal
     */
    SetElementList._Swap_associative = function (x, y) {
        var _a;
        _a = __read([y.associative_, x.associative_], 2), x.associative_ = _a[0], y.associative_ = _a[1];
    };
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    SetElementList.prototype.associative = function () {
        return this.associative_;
    };
    return SetElementList;
}(ListContainer_1.ListContainer));
exports.SetElementList = SetElementList;
/**
 *
 */
(function (SetElementList) {
    /**
     * Iterator of set container storing elements in a list.
     *
     * @template Key Key type
     * @template Unique Whether duplicated key is blocked or not
     * @template Source Source container type
     *
     * @author Jeongho Nam - https://github.com/samchon
     */
    var Iterator = /** @class */ (function (_super) {
        __extends(Iterator, _super);
        /* ---------------------------------------------------------
            CONSTRUCTORS
        --------------------------------------------------------- */
        function Iterator(list, prev, next, val) {
            var _this = _super.call(this, prev, next, val) || this;
            _this.source_ = list;
            return _this;
        }
        /**
         * @internal
         */
        Iterator.create = function (list, prev, next, val) {
            return new Iterator(list, prev, next, val);
        };
        /**
         * @inheritDoc
         */
        Iterator.prototype.reverse = function () {
            return new ReverseIterator(this);
        };
        /* ---------------------------------------------------------
            ACCESSORS
        --------------------------------------------------------- */
        /**
         * @inheritDoc
         */
        Iterator.prototype.source = function () {
            return this.source_.associative();
        };
        return Iterator;
    }(ListIterator_1.ListIterator));
    SetElementList.Iterator = Iterator;
    /**
     * Reverser iterator of set container storing elements in a list.
     *
     * @template Key Key type
     * @template Unique Whether duplicated key is blocked or not
     * @template Source Source container type
     *
     * @author Jeongho Nam - https://github.com/samchon
     */
    var ReverseIterator = /** @class */ (function (_super) {
        __extends(ReverseIterator, _super);
        function ReverseIterator() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ReverseIterator.prototype._Create_neighbor = function (base) {
            return new ReverseIterator(base);
        };
        return ReverseIterator;
    }(ReverseIterator_1.ReverseIterator));
    SetElementList.ReverseIterator = ReverseIterator;
})(SetElementList = exports.SetElementList || (exports.SetElementList = {}));
exports.SetElementList = SetElementList;
//# sourceMappingURL=SetElementList.js.map

/***/ }),

/***/ 7647:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ListContainer = void 0;
var Container_1 = __webpack_require__(2278);
var ListIterator_1 = __webpack_require__(2918);
var Repeater_1 = __webpack_require__(7489);
var NativeArrayIterator_1 = __webpack_require__(9932);
var global_1 = __webpack_require__(6937);
var ErrorGenerator_1 = __webpack_require__(1566);
/**
 * Basic List Container.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var ListContainer = /** @class */ (function (_super) {
    __extends(ListContainer, _super);
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    /**
     * Default Constructor.
     */
    function ListContainer() {
        var _this = _super.call(this) || this;
        // INIT MEMBERS
        _this.end_ = _this._Create_iterator(null, null);
        _this.clear();
        return _this;
    }
    ListContainer.prototype.assign = function (par1, par2) {
        this.clear();
        this.insert(this.end(), par1, par2);
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.clear = function () {
        // DISCONNECT NODES
        ListIterator_1.ListIterator._Set_prev(this.end_, this.end_);
        ListIterator_1.ListIterator._Set_next(this.end_, this.end_);
        // RE-SIZE -> 0
        this.begin_ = this.end_;
        this.size_ = 0;
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.resize = function (n) {
        var expansion = n - this.size();
        if (expansion > 0)
            this.insert(this.end(), expansion, undefined);
        else if (expansion < 0)
            this.erase((0, global_1.advance)(this.end(), -expansion), this.end());
    };
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ListContainer.prototype.begin = function () {
        return this.begin_;
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.end = function () {
        return this.end_;
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.size = function () {
        return this.size_;
    };
    /* =========================================================
        ELEMENTS I/O
            - PUSH & POP
            - INSERT
            - ERASE
            - POST-PROCESS
    ============================================================
        PUSH & POP
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ListContainer.prototype.push_front = function (val) {
        this.insert(this.begin_, val);
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.push_back = function (val) {
        this.insert(this.end_, val);
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.pop_front = function () {
        if (this.empty() === true)
            throw ErrorGenerator_1.ErrorGenerator.empty(this.end_.source().constructor.name, "pop_front");
        this.erase(this.begin_);
    };
    /**
     * @inheritDoc
     */
    ListContainer.prototype.pop_back = function () {
        if (this.empty() === true)
            throw ErrorGenerator_1.ErrorGenerator.empty(this.end_.source().constructor.name, "pop_back");
        this.erase(this.end_.prev());
    };
    /* ---------------------------------------------------------
        INSERT
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ListContainer.prototype.push = function () {
        var items = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            items[_i] = arguments[_i];
        }
        if (items.length === 0)
            return this.size();
        // INSERT BY RANGE
        var first = new NativeArrayIterator_1.NativeArrayIterator(items, 0);
        var last = new NativeArrayIterator_1.NativeArrayIterator(items, items.length);
        this._Insert_by_range(this.end(), first, last);
        // RETURN SIZE
        return this.size();
    };
    ListContainer.prototype.insert = function (pos) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        // VALIDATION
        if (pos.source() !== this.end_.source())
            throw ErrorGenerator_1.ErrorGenerator.not_my_iterator(this.end_.source(), "insert");
        else if (pos.erased_ === true)
            throw ErrorGenerator_1.ErrorGenerator.erased_iterator(this.end_.source(), "insert");
        // BRANCHES
        if (args.length === 1)
            return this._Insert_by_repeating_val(pos, 1, args[0]);
        else if (args.length === 2 && typeof args[0] === "number")
            return this._Insert_by_repeating_val(pos, args[0], args[1]);
        else
            return this._Insert_by_range(pos, args[0], args[1]);
    };
    ListContainer.prototype._Insert_by_repeating_val = function (position, n, val) {
        var first = new Repeater_1.Repeater(0, val);
        var last = new Repeater_1.Repeater(n);
        return this._Insert_by_range(position, first, last);
    };
    ListContainer.prototype._Insert_by_range = function (position, begin, end) {
        var prev = position.prev();
        var first = null;
        var size = 0;
        for (var it = begin; it.equals(end) === false; it = it.next()) {
            // CONSTRUCT ITEM, THE NEW ELEMENT
            var item = this._Create_iterator(prev, null, it.value);
            if (size === 0)
                first = item;
            // PLACE ITEM ON THE NEXT OF "PREV"
            ListIterator_1.ListIterator._Set_next(prev, item);
            // SHIFT CURRENT ITEM TO PREVIOUS
            prev = item;
            ++size;
        }
        // WILL FIRST BE THE BEGIN?
        if (position.equals(this.begin()) === true)
            this.begin_ = first;
        // CONNECT BETWEEN LAST AND POSITION
        ListIterator_1.ListIterator._Set_next(prev, position);
        ListIterator_1.ListIterator._Set_prev(position, prev);
        this.size_ += size;
        return first;
    };
    ListContainer.prototype.erase = function (first, last) {
        if (last === void 0) { last = first.next(); }
        return this._Erase_by_range(first, last);
    };
    ListContainer.prototype._Erase_by_range = function (first, last) {
        // VALIDATION
        if (first.source() !== this.end_.source())
            throw ErrorGenerator_1.ErrorGenerator.not_my_iterator(this.end_.source(), "insert");
        else if (first.erased_ === true)
            throw ErrorGenerator_1.ErrorGenerator.erased_iterator(this.end_.source(), "insert");
        else if (first.equals(this.end_))
            return this.end_;
        // FIND PREV AND NEXT
        var prev = first.prev();
        // SHRINK
        ListIterator_1.ListIterator._Set_next(prev, last);
        ListIterator_1.ListIterator._Set_prev(last, prev);
        for (var it = first; !it.equals(last); it = it.next()) {
            it.erased_ = true;
            --this.size_;
        }
        if (first.equals(this.begin_))
            this.begin_ = last;
        return last;
    };
    /* ---------------------------------------------------------
        SWAP
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ListContainer.prototype.swap = function (obj) {
        var _a, _b, _c;
        _a = __read([obj.begin_, this.begin_], 2), this.begin_ = _a[0], obj.begin_ = _a[1];
        _b = __read([obj.end_, this.end_], 2), this.end_ = _b[0], obj.end_ = _b[1];
        _c = __read([obj.size_, this.size_], 2), this.size_ = _c[0], obj.size_ = _c[1];
    };
    return ListContainer;
}(Container_1.Container));
exports.ListContainer = ListContainer;
//# sourceMappingURL=ListContainer.js.map

/***/ }),

/***/ 1566:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ErrorGenerator = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var InvalidArgument_1 = __webpack_require__(9014);
var OutOfRange_1 = __webpack_require__(7632);
var ErrorGenerator;
(function (ErrorGenerator) {
    /* ---------------------------------------------------------
        COMMON
    --------------------------------------------------------- */
    function get_class_name(instance) {
        if (typeof instance === "string")
            return instance;
        var ret = instance.constructor.name;
        if (instance.constructor.__MODULE)
            ret = "".concat(instance.constructor.__MODULE, ".").concat(ret);
        return "std.".concat(ret);
    }
    ErrorGenerator.get_class_name = get_class_name;
    /* ---------------------------------------------------------
        CONTAINERS
    --------------------------------------------------------- */
    function empty(instance, method) {
        return new OutOfRange_1.OutOfRange("Error on ".concat(get_class_name(instance), ".").concat(method, "(): it's empty container."));
    }
    ErrorGenerator.empty = empty;
    function negative_index(instance, method, index) {
        return new OutOfRange_1.OutOfRange("Error on ".concat(get_class_name(instance), ".").concat(method, "(): parametric index is negative -> (index = ").concat(index, ")."));
    }
    ErrorGenerator.negative_index = negative_index;
    function excessive_index(instance, method, index, size) {
        return new OutOfRange_1.OutOfRange("Error on ".concat(get_class_name(instance), ".").concat(method, "(): parametric index is equal or greater than size -> (index = ").concat(index, ", size: ").concat(size, ")."));
    }
    ErrorGenerator.excessive_index = excessive_index;
    function not_my_iterator(instance, method) {
        return new InvalidArgument_1.InvalidArgument("Error on ".concat(get_class_name(instance), ".").concat(method, "(): parametric iterator is not this container's own."));
    }
    ErrorGenerator.not_my_iterator = not_my_iterator;
    function erased_iterator(instance, method) {
        return new InvalidArgument_1.InvalidArgument("Error on ".concat(get_class_name(instance), ".").concat(method, "(): parametric iterator, it already has been erased."));
    }
    ErrorGenerator.erased_iterator = erased_iterator;
    function negative_iterator(instance, method, index) {
        return new OutOfRange_1.OutOfRange("Error on ".concat(get_class_name(instance), ".").concat(method, "(): parametric iterator is directing negative position -> (index = ").concat(index, ")."));
    }
    ErrorGenerator.negative_iterator = negative_iterator;
    function iterator_end_value(instance, method) {
        if (method === void 0) { method = "end"; }
        var className = get_class_name(instance);
        return new OutOfRange_1.OutOfRange("Error on ".concat(className, ".Iterator.value: cannot access to the ").concat(className, ".").concat(method, "().value."));
    }
    ErrorGenerator.iterator_end_value = iterator_end_value;
    function key_nout_found(instance, method, key) {
        throw new OutOfRange_1.OutOfRange("Error on ".concat(get_class_name(instance), ".").concat(method, "(): unable to find the matched key -> ").concat(key));
    }
    ErrorGenerator.key_nout_found = key_nout_found;
})(ErrorGenerator = exports.ErrorGenerator || (exports.ErrorGenerator = {}));
//# sourceMappingURL=ErrorGenerator.js.map

/***/ }),

/***/ 1663:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HashBuckets = void 0;
/**
 * Hash buckets
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var HashBuckets = /** @class */ (function () {
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    function HashBuckets(fetcher, hasher) {
        this.fetcher_ = fetcher;
        this.hasher_ = hasher;
        this.max_load_factor_ = DEFAULT_MAX_FACTOR;
        this.data_ = [];
        this.size_ = 0;
        this.initialize();
    }
    HashBuckets.prototype.clear = function () {
        this.data_ = [];
        this.size_ = 0;
        this.initialize();
    };
    HashBuckets.prototype.rehash = function (length) {
        var e_1, _a, e_2, _b;
        length = Math.max(length, MIN_BUCKET_COUNT);
        var data = [];
        for (var i = 0; i < length; ++i)
            data.push([]);
        try {
            for (var _c = __values(this.data_), _d = _c.next(); !_d.done; _d = _c.next()) {
                var row = _d.value;
                try {
                    for (var row_1 = (e_2 = void 0, __values(row)), row_1_1 = row_1.next(); !row_1_1.done; row_1_1 = row_1.next()) {
                        var elem = row_1_1.value;
                        var index = this.hasher_(this.fetcher_(elem)) % data.length;
                        data[index].push(elem);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (row_1_1 && !row_1_1.done && (_b = row_1.return)) _b.call(row_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.data_ = data;
    };
    HashBuckets.prototype.reserve = function (length) {
        if (length > this.capacity()) {
            length = Math.floor(length / this.max_load_factor_);
            this.rehash(length);
        }
    };
    HashBuckets.prototype.initialize = function () {
        for (var i = 0; i < MIN_BUCKET_COUNT; ++i)
            this.data_.push([]);
    };
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    HashBuckets.prototype.length = function () {
        return this.data_.length;
    };
    HashBuckets.prototype.capacity = function () {
        return this.data_.length * this.max_load_factor_;
    };
    HashBuckets.prototype.at = function (index) {
        return this.data_[index];
    };
    HashBuckets.prototype.load_factor = function () {
        return this.size_ / this.length();
    };
    HashBuckets.prototype.max_load_factor = function (z) {
        if (z === void 0) { z = null; }
        if (z === null)
            return this.max_load_factor_;
        else
            this.max_load_factor_ = z;
    };
    HashBuckets.prototype.hash_function = function () {
        return this.hasher_;
    };
    /* ---------------------------------------------------------
        ELEMENTS I/O
    --------------------------------------------------------- */
    HashBuckets.prototype.index = function (elem) {
        return this.hasher_(this.fetcher_(elem)) % this.length();
    };
    HashBuckets.prototype.insert = function (val) {
        var capacity = this.capacity();
        if (++this.size_ > capacity)
            this.reserve(capacity * 2);
        var index = this.index(val);
        this.data_[index].push(val);
    };
    HashBuckets.prototype.erase = function (val) {
        var index = this.index(val);
        var bucket = this.data_[index];
        for (var i = 0; i < bucket.length; ++i)
            if (bucket[i] === val) {
                bucket.splice(i, 1);
                --this.size_;
                break;
            }
    };
    return HashBuckets;
}());
exports.HashBuckets = HashBuckets;
var MIN_BUCKET_COUNT = 10;
var DEFAULT_MAX_FACTOR = 1.0;
//# sourceMappingURL=HashBuckets.js.map

/***/ }),

/***/ 3136:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MapHashBuckets = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var HashBuckets_1 = __webpack_require__(1663);
/**
 * Hash buckets for map containers.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var MapHashBuckets = /** @class */ (function (_super) {
    __extends(MapHashBuckets, _super);
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    /**
     * Initializer Constructor
     *
     * @param source Source map container
     * @param hasher Hash function
     * @param pred Equality function
     */
    function MapHashBuckets(source, hasher, pred) {
        var _this = _super.call(this, fetcher, hasher) || this;
        _this.source_ = source;
        _this.key_eq_ = pred;
        return _this;
    }
    /**
     * @internal
     */
    MapHashBuckets._Swap_source = function (x, y) {
        var _a;
        _a = __read([y.source_, x.source_], 2), x.source_ = _a[0], y.source_ = _a[1];
    };
    /* ---------------------------------------------------------
        FINDERS
    --------------------------------------------------------- */
    MapHashBuckets.prototype.key_eq = function () {
        return this.key_eq_;
    };
    MapHashBuckets.prototype.find = function (key) {
        var e_1, _a;
        var index = this.hash_function()(key) % this.length();
        var bucket = this.at(index);
        try {
            for (var bucket_1 = __values(bucket), bucket_1_1 = bucket_1.next(); !bucket_1_1.done; bucket_1_1 = bucket_1.next()) {
                var it = bucket_1_1.value;
                if (this.key_eq_(it.first, key))
                    return it;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (bucket_1_1 && !bucket_1_1.done && (_a = bucket_1.return)) _a.call(bucket_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return this.source_.end();
    };
    return MapHashBuckets;
}(HashBuckets_1.HashBuckets));
exports.MapHashBuckets = MapHashBuckets;
function fetcher(elem) {
    return elem.first;
}
//# sourceMappingURL=MapHashBuckets.js.map

/***/ }),

/***/ 6449:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SetHashBuckets = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std.internal
 */
//================================================================
var HashBuckets_1 = __webpack_require__(1663);
/**
 * Hash buckets for set containers
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var SetHashBuckets = /** @class */ (function (_super) {
    __extends(SetHashBuckets, _super);
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    /**
     * Initializer Constructor
     *
     * @param source Source set container
     * @param hasher Hash function
     * @param pred Equality function
     */
    function SetHashBuckets(source, hasher, pred) {
        var _this = _super.call(this, fetcher, hasher) || this;
        _this.source_ = source;
        _this.key_eq_ = pred;
        return _this;
    }
    /**
     * @internal
     */
    SetHashBuckets._Swap_source = function (x, y) {
        var _a;
        _a = __read([y.source_, x.source_], 2), x.source_ = _a[0], y.source_ = _a[1];
    };
    /* ---------------------------------------------------------
        FINDERS
    --------------------------------------------------------- */
    SetHashBuckets.prototype.key_eq = function () {
        return this.key_eq_;
    };
    SetHashBuckets.prototype.find = function (val) {
        var e_1, _a;
        var index = this.hash_function()(val) % this.length();
        var bucket = this.at(index);
        try {
            for (var bucket_1 = __values(bucket), bucket_1_1 = bucket_1.next(); !bucket_1_1.done; bucket_1_1 = bucket_1.next()) {
                var it = bucket_1_1.value;
                if (this.key_eq_(it.value, val))
                    return it;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (bucket_1_1 && !bucket_1_1.done && (_a = bucket_1.return)) _a.call(bucket_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return this.source_.end();
    };
    return SetHashBuckets;
}(HashBuckets_1.HashBuckets));
exports.SetHashBuckets = SetHashBuckets;
function fetcher(elem) {
    return elem.value;
}
//# sourceMappingURL=SetHashBuckets.js.map

/***/ }),

/***/ 2918:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ListIterator = void 0;
var ErrorGenerator_1 = __webpack_require__(1566);
/**
 * Basic List Iterator.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var ListIterator = /** @class */ (function () {
    /* ---------------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------------- */
    function ListIterator(prev, next, value) {
        this.prev_ = prev;
        this.next_ = next;
        this.value_ = value;
    }
    /**
     * @internal
     */
    ListIterator._Set_prev = function (it, prev) {
        it.prev_ = prev;
    };
    /**
     * @internal
     */
    ListIterator._Set_next = function (it, next) {
        it.next_ = next;
    };
    /**
     * @inheritDoc
     */
    ListIterator.prototype.prev = function () {
        return this.prev_;
    };
    /**
     * @inheritDoc
     */
    ListIterator.prototype.next = function () {
        return this.next_;
    };
    Object.defineProperty(ListIterator.prototype, "value", {
        /**
         * @inheritDoc
         */
        get: function () {
            this._Try_value();
            return this.value_;
        },
        enumerable: false,
        configurable: true
    });
    ListIterator.prototype._Try_value = function () {
        if (this.value_ === undefined &&
            this.equals(this.source().end()) === true)
            throw ErrorGenerator_1.ErrorGenerator.iterator_end_value(this.source());
    };
    /* ---------------------------------------------------------------
        COMPARISON
    --------------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ListIterator.prototype.equals = function (obj) {
        return this === obj;
    };
    return ListIterator;
}());
exports.ListIterator = ListIterator;
//# sourceMappingURL=ListIterator.js.map

/***/ }),

/***/ 5709:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReverseIterator = void 0;
/**
 * Basic reverse iterator.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var ReverseIterator = /** @class */ (function () {
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    /**
     * Initializer Constructor.
     *
     * @param base The base iterator.
     */
    function ReverseIterator(base) {
        this.base_ = base.prev();
    }
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    /**
     * Get source container.
     *
     * @return The source container.
     */
    ReverseIterator.prototype.source = function () {
        return this.base_.source();
    };
    /**
     * @inheritDoc
     */
    ReverseIterator.prototype.base = function () {
        return this.base_.next();
    };
    Object.defineProperty(ReverseIterator.prototype, "value", {
        /**
         * @inheritDoc
         */
        get: function () {
            return this.base_.value;
        },
        enumerable: false,
        configurable: true
    });
    /* ---------------------------------------------------------
        MOVERS
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ReverseIterator.prototype.prev = function () {
        // this.base().next()
        return this._Create_neighbor(this.base().next());
    };
    /**
     * @inheritDoc
     */
    ReverseIterator.prototype.next = function () {
        // this.base().prev()
        return this._Create_neighbor(this.base_);
    };
    /* ---------------------------------------------------------
        COMPARES
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    ReverseIterator.prototype.equals = function (obj) {
        return this.base_.equals(obj.base_);
    };
    return ReverseIterator;
}());
exports.ReverseIterator = ReverseIterator;
//# sourceMappingURL=ReverseIterator.js.map

/***/ }),

/***/ 7428:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ForOfAdaptor = void 0;
/**
 * Adaptor for `for ... of` iteration.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var ForOfAdaptor = /** @class */ (function () {
    /**
     * Initializer Constructor.
     *
     * @param first Input iteartor of the first position.
     * @param last Input iterator of the last position.
     */
    function ForOfAdaptor(first, last) {
        this.it_ = first;
        this.last_ = last;
    }
    /**
     * @inheritDoc
     */
    ForOfAdaptor.prototype.next = function () {
        if (this.it_.equals(this.last_))
            return {
                done: true,
                value: undefined,
            };
        else {
            var it = this.it_;
            this.it_ = this.it_.next();
            return {
                done: false,
                value: it.value,
            };
        }
    };
    /**
     * @inheritDoc
     */
    ForOfAdaptor.prototype[Symbol.iterator] = function () {
        return this;
    };
    return ForOfAdaptor;
}());
exports.ForOfAdaptor = ForOfAdaptor;
//# sourceMappingURL=ForOfAdaptor.js.map

/***/ }),

/***/ 9932:
/***/ (function(__unused_webpack_module, exports) {

"use strict";

var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NativeArrayIterator = void 0;
var NativeArrayIterator = /** @class */ (function () {
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    function NativeArrayIterator(data, index) {
        this.data_ = data;
        this.index_ = index;
    }
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    NativeArrayIterator.prototype.index = function () {
        return this.index_;
    };
    Object.defineProperty(NativeArrayIterator.prototype, "value", {
        get: function () {
            return this.data_[this.index_];
        },
        enumerable: false,
        configurable: true
    });
    /* ---------------------------------------------------------
        MOVERS
    --------------------------------------------------------- */
    NativeArrayIterator.prototype.prev = function () {
        --this.index_;
        return this;
    };
    NativeArrayIterator.prototype.next = function () {
        ++this.index_;
        return this;
    };
    NativeArrayIterator.prototype.advance = function (n) {
        this.index_ += n;
        return this;
    };
    /* ---------------------------------------------------------
        COMPARES
    --------------------------------------------------------- */
    NativeArrayIterator.prototype.equals = function (obj) {
        return this.data_ === obj.data_ && this.index_ === obj.index_;
    };
    NativeArrayIterator.prototype.swap = function (obj) {
        var _a, _b;
        _a = __read([obj.data_, this.data_], 2), this.data_ = _a[0], obj.data_ = _a[1];
        _b = __read([obj.index_, this.index_], 2), this.index_ = _b[0], obj.index_ = _b[1];
    };
    return NativeArrayIterator;
}());
exports.NativeArrayIterator = NativeArrayIterator;
//# sourceMappingURL=NativeArrayIterator.js.map

/***/ }),

/***/ 7489:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Repeater = void 0;
var Repeater = /** @class */ (function () {
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    function Repeater(index, value) {
        this.index_ = index;
        this.value_ = value;
    }
    /* ---------------------------------------------------------
        ACCESSORS
    --------------------------------------------------------- */
    Repeater.prototype.index = function () {
        return this.index_;
    };
    Object.defineProperty(Repeater.prototype, "value", {
        get: function () {
            return this.value_;
        },
        enumerable: false,
        configurable: true
    });
    /* ---------------------------------------------------------
        MOVERS & COMPARE
    --------------------------------------------------------- */
    Repeater.prototype.next = function () {
        ++this.index_;
        return this;
    };
    Repeater.prototype.equals = function (obj) {
        return this.index_ === obj.index_;
    };
    return Repeater;
}());
exports.Repeater = Repeater;
//# sourceMappingURL=Repeater.js.map

/***/ }),

/***/ 6937:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.next = exports.prev = exports.advance = exports.distance = exports.size = exports.empty = void 0;
var InvalidArgument_1 = __webpack_require__(9014);
/* =========================================================
    GLOBAL FUNCTIONS
        - ACCESSORS
        - MOVERS
        - FACTORIES
============================================================
    ACCESSORS
--------------------------------------------------------- */
/**
 * Test whether a container is empty.
 *
 * @param source Target container.
 * @return Whether empty or not.
 */
function empty(source) {
    if (source instanceof Array)
        return source.length !== 0;
    else
        return source.empty();
}
exports.empty = empty;
/**
 * Get number of elements of a container.
 *
 * @param source Target container.
 * @return The number of elements in the container.
 */
function size(source) {
    if (source instanceof Array)
        return source.length;
    else
        return source.size();
}
exports.size = size;
function distance(first, last) {
    if (first.index instanceof Function)
        return _Distance_via_index(first, last);
    var ret = 0;
    for (; !first.equals(last); first = first.next())
        ++ret;
    return ret;
}
exports.distance = distance;
function _Distance_via_index(first, last) {
    var x = first.index();
    var y = last.index();
    if (first.base instanceof Function)
        return x - y;
    else
        return y - x;
}
function advance(it, n) {
    if (n === 0)
        return it;
    else if (it.advance instanceof Function)
        return it.advance(n);
    var stepper;
    if (n < 0) {
        if (!(it.prev instanceof Function))
            throw new InvalidArgument_1.InvalidArgument("Error on std.advance(): parametric iterator is not a bi-directional iterator, thus advancing to negative direction is not possible.");
        stepper = function (it) { return it.prev(); };
        n = -n;
    }
    else
        stepper = function (it) { return it.next(); };
    while (n-- > 0)
        it = stepper(it);
    return it;
}
exports.advance = advance;
/**
 * Get previous iterator.
 *
 * @param it Iterator to move.
 * @param n Step to move prev.
 * @return An iterator moved to prev *n* steps.
 */
function prev(it, n) {
    if (n === void 0) { n = 1; }
    if (n === 1)
        return it.prev();
    else
        return advance(it, -n);
}
exports.prev = prev;
/**
 * Get next iterator.
 *
 * @param it Iterator to move.
 * @param n Step to move next.
 * @return Iterator moved to next *n* steps.
 */
function next(it, n) {
    if (n === void 0) { n = 1; }
    if (n === 1)
        return it.next();
    else
        return advance(it, n);
}
exports.next = next;
//# sourceMappingURL=global.js.map

/***/ }),

/***/ 9430:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Entry = void 0;
var hash_1 = __webpack_require__(9029);
var comparators_1 = __webpack_require__(8925);
/**
 * Entry for mapping.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var Entry = /** @class */ (function () {
    /**
     * Intializer Constructor.
     *
     * @param first The first, key element.
     * @param second The second, mapped element.
     */
    function Entry(first, second) {
        this.first = first;
        this.second = second;
    }
    /**
     * @inheritDoc
     */
    Entry.prototype.equals = function (obj) {
        return (0, comparators_1.equal_to)(this.first, obj.first);
    };
    /**
     * @inheritDoc
     */
    Entry.prototype.less = function (obj) {
        return (0, comparators_1.less)(this.first, obj.first);
    };
    /**
     * @inheritDoc
     */
    Entry.prototype.hashCode = function () {
        return (0, hash_1.hash)(this.first);
    };
    return Entry;
}());
exports.Entry = Entry;
//# sourceMappingURL=Entry.js.map

/***/ }),

/***/ 5351:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.make_pair = exports.Pair = void 0;
var hash_1 = __webpack_require__(9029);
var comparators_1 = __webpack_require__(8925);
/**
 * Pair of two elements.
 *
 * @author Jeongho Nam - https://github.com/samchon
 */
var Pair = /** @class */ (function () {
    /* ---------------------------------------------------------
        CONSTRUCTORS
    --------------------------------------------------------- */
    /**
     * Initializer Constructor.
     *
     * @param first The first element.
     * @param second The second element.
     */
    function Pair(first, second) {
        this.first = first;
        this.second = second;
    }
    /* ---------------------------------------------------------
        COMPARISON
    --------------------------------------------------------- */
    /**
     * @inheritDoc
     */
    Pair.prototype.equals = function (pair) {
        return ((0, comparators_1.equal_to)(this.first, pair.first) &&
            (0, comparators_1.equal_to)(this.second, pair.second));
    };
    /**
     * @inheritDoc
     */
    Pair.prototype.less = function (pair) {
        if ((0, comparators_1.equal_to)(this.first, pair.first) === false)
            return (0, comparators_1.less)(this.first, pair.first);
        else
            return (0, comparators_1.less)(this.second, pair.second);
    };
    /**
     * @inheritDoc
     */
    Pair.prototype.hashCode = function () {
        return (0, hash_1.hash)(this.first, this.second);
    };
    return Pair;
}());
exports.Pair = Pair;
/**
 * Create a {@link Pair}.
 *
 * @param first The 1st element.
 * @param second The 2nd element.
 *
 * @return A {@link Pair} object.
 */
function make_pair(first, second) {
    return new Pair(first, second);
}
exports.make_pair = make_pair;
//# sourceMappingURL=Pair.js.map

/***/ }),

/***/ 4922:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.is_node = void 0;
//================================================================
/**
 * @packageDocumentation
 * @module std
 */
//================================================================
var is_node_ = null;
/**
 * Test whether the code is running on NodeJS.
 *
 * @return Whether NodeJS or not.
 */
function is_node() {
    if (is_node_ === null)
        is_node_ =
            typeof __webpack_require__.g === "object" &&
                typeof __webpack_require__.g.process === "object" &&
                typeof __webpack_require__.g.process.versions === "object" &&
                typeof __webpack_require__.g.process.versions.node !== "undefined";
    return is_node_;
}
exports.is_node = is_node;
//# sourceMappingURL=node.js.map

/***/ }),

/***/ 5995:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var websocket_1 = __webpack_require__(5840);
var EventTarget_1 = __webpack_require__(1112);
var Event_1 = __webpack_require__(9653);
var CloseEvent_1 = __webpack_require__(4164);
var MessageEvent_1 = __webpack_require__(4584);
var ErrorEvent_1 = __webpack_require__(5025);
var WebSocket = /** @class */ (function (_super) {
    __extends(WebSocket, _super);
    /* ----------------------------------------------------------------
        CONSTRUCTORS
    ---------------------------------------------------------------- */
    function WebSocket(url, protocols) {
        var _this = _super.call(this) || this;
        _this.on_ = {};
        _this.state_ = WebSocket.CONNECTING;
        //----
        // CLIENT
        //----
        // PREPARE SOCKET
        _this.client_ = new websocket_1.client();
        _this.client_.on("connect", _this._Handle_connect.bind(_this));
        _this.client_.on("connectFailed", _this._Handle_error.bind(_this));
        if (typeof protocols === "string")
            protocols = [protocols];
        // DO CONNECT
        _this.client_.connect(url, protocols);
        return _this;
    }
    WebSocket.prototype.close = function (code, reason) {
        this.state_ = WebSocket.CLOSING;
        if (code === undefined)
            this.connection_.sendCloseFrame();
        else
            this.connection_.sendCloseFrame(code, reason, true);
    };
    /* ================================================================
        ACCESSORS
            - SENDER
            - PROPERTIES
            - LISTENERS
    ===================================================================
        SENDER
    ---------------------------------------------------------------- */
    WebSocket.prototype.send = function (data) {
        if (typeof data.valueOf() === "string")
            this.connection_.sendUTF(data);
        else {
            var buffer = void 0;
            if (data instanceof Buffer)
                buffer = data;
            else if (data instanceof Blob)
                buffer = new Buffer(data, "blob");
            else if (data.buffer)
                buffer = new Buffer(data.buffer);
            else
                buffer = new Buffer(data);
            this.connection_.sendBytes(buffer);
        }
    };
    Object.defineProperty(WebSocket.prototype, "url", {
        /* ----------------------------------------------------------------
            PROPERTIES
        ---------------------------------------------------------------- */
        get: function () {
            return this.client_.url.href;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "protocol", {
        get: function () {
            return this.client_.protocols
                ? this.client_.protocols[0]
                : "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "extensions", {
        get: function () {
            return this.connection_ && this.connection_.extensions
                ? this.connection_.extensions[0].name
                : "";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "readyState", {
        get: function () {
            return this.state_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "bufferedAmount", {
        get: function () {
            return this.connection_.bytesWaitingToFlush;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "binaryType", {
        get: function () {
            return "arraybuffer";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "onopen", {
        /* ----------------------------------------------------------------
            LISTENERS
        ---------------------------------------------------------------- */
        get: function () {
            return this.on_.open;
        },
        set: function (listener) {
            this._Set_on("open", listener);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "onclose", {
        get: function () {
            return this.on_.close;
        },
        set: function (listener) {
            this._Set_on("close", listener);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "onmessage", {
        get: function () {
            return this.on_.message;
        },
        set: function (listener) {
            this._Set_on("message", listener);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WebSocket.prototype, "onerror", {
        get: function () {
            return this.on_.error;
        },
        set: function (listener) {
            this._Set_on("error", listener);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @hidden
     */
    WebSocket.prototype._Set_on = function (type, listener) {
        if (this.on_[type])
            this.removeEventListener(type, this.on_[type]);
        this.addEventListener(type, listener);
        this.on_[type] = listener;
    };
    /* ----------------------------------------------------------------
        SOCKET HANDLERS
    ---------------------------------------------------------------- */
    /**
     * @hidden
     */
    WebSocket.prototype._Handle_connect = function (connection) {
        this.connection_ = connection;
        this.state_ = WebSocket.OPEN;
        this.connection_.on("message", this._Handle_message.bind(this));
        this.connection_.on("error", this._Handle_error.bind(this));
        this.connection_.on("close", this._Handle_close.bind(this));
        var event = new Event_1.Event("open", EVENT_INIT);
        this.dispatchEvent(event);
    };
    /**
     * @hidden
     */
    WebSocket.prototype._Handle_close = function (code, reason) {
        var event = new CloseEvent_1.CloseEvent("close", __assign({}, EVENT_INIT, { code: code, reason: reason }));
        this.state_ = WebSocket.CLOSED;
        this.dispatchEvent(event);
    };
    /**
     * @hidden
     */
    WebSocket.prototype._Handle_message = function (message) {
        var event = new MessageEvent_1.MessageEvent("message", __assign({}, EVENT_INIT, { data: message.binaryData
                ? message.binaryData
                : message.utf8Data }));
        this.dispatchEvent(event);
    };
    /**
     * @hidden
     */
    WebSocket.prototype._Handle_error = function (error) {
        var event = new ErrorEvent_1.ErrorEvent("error", __assign({}, EVENT_INIT, { error: error, message: error.message }));
        if (this.state_ === WebSocket.CONNECTING)
            this.state_ = WebSocket.CLOSED;
        this.dispatchEvent(event);
    };
    return WebSocket;
}(EventTarget_1.EventTarget));
exports.WebSocket = WebSocket;
(function (WebSocket) {
    WebSocket.CONNECTING = 0;
    WebSocket.OPEN = 1;
    WebSocket.CLOSING = 2;
    WebSocket.CLOSED = 3;
})(WebSocket = exports.WebSocket || (exports.WebSocket = {}));
exports.WebSocket = WebSocket;
var EVENT_INIT = {
    bubbles: false,
    cancelable: false
};
//# sourceMappingURL=WebSocket.js.map

/***/ }),

/***/ 4164:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
var Event_1 = __webpack_require__(9653);
var CloseEvent = /** @class */ (function (_super) {
    __extends(CloseEvent, _super);
    function CloseEvent(type, init) {
        return _super.call(this, type, init) || this;
    }
    return CloseEvent;
}(Event_1.Event));
exports.CloseEvent = CloseEvent;
//# sourceMappingURL=CloseEvent.js.map

/***/ }),

/***/ 5025:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
var Event_1 = __webpack_require__(9653);
var ErrorEvent = /** @class */ (function (_super) {
    __extends(ErrorEvent, _super);
    function ErrorEvent(type, init) {
        return _super.call(this, type, init) || this;
    }
    return ErrorEvent;
}(Event_1.Event));
exports.ErrorEvent = ErrorEvent;
//# sourceMappingURL=ErrorEvent.js.map

/***/ }),

/***/ 9653:
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var Event = /** @class */ (function () {
    function Event(type, init) {
        this.type = type;
        if (init)
            Object.assign(this, init);
    }
    return Event;
}());
exports.Event = Event;
//# sourceMappingURL=Event.js.map

/***/ }),

/***/ 1112:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var HashSet_1 = __webpack_require__(5017);
var HashMap_1 = __webpack_require__(1266);
var EventTarget = /** @class */ (function () {
    function EventTarget() {
        this.listeners_ = new HashMap_1.HashMap();
        this.created_at_ = new Date();
    }
    EventTarget.prototype.dispatchEvent = function (event) {
        var e_1, _a;
        // FIND LISTENERS
        var it = this.listeners_.find(event.type);
        if (it.equals(this.listeners_.end()))
            return;
        // SET DEFAULT ARGUMENTS
        event.target = this;
        event.timeStamp = new Date().getTime() - this.created_at_.getTime();
        try {
            // CALL THE LISTENERS
            for (var _b = __values(it.second), _c = _b.next(); !_c.done; _c = _b.next()) {
                var listener = _c.value;
                listener(event);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    EventTarget.prototype.addEventListener = function (type, listener) {
        var it = this.listeners_.find(type);
        if (it.equals(this.listeners_.end()))
            it = this.listeners_.emplace(type, new HashSet_1.HashSet()).first;
        it.second.insert(listener);
    };
    EventTarget.prototype.removeEventListener = function (type, listener) {
        var it = this.listeners_.find(type);
        if (it.equals(this.listeners_.end()))
            return;
        it.second.erase(listener);
        if (it.second.empty())
            this.listeners_.erase(it);
    };
    return EventTarget;
}());
exports.EventTarget = EventTarget;
//# sourceMappingURL=EventTarget.js.map

/***/ }),

/***/ 4584:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
var Event_1 = __webpack_require__(9653);
var MessageEvent = /** @class */ (function (_super) {
    __extends(MessageEvent, _super);
    function MessageEvent(type, init) {
        return _super.call(this, type, init) || this;
    }
    return MessageEvent;
}(Event_1.Event));
exports.MessageEvent = MessageEvent;
//# sourceMappingURL=MessageEvent.js.map

/***/ }),

/***/ 6445:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
var node_1 = __webpack_require__(4922);
if (node_1.is_node())
    __webpack_require__.g.WebSocket = (__webpack_require__(5995).WebSocket);
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 5840:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _globalThis;
if (typeof globalThis === 'object') {
	_globalThis = globalThis;
} else {
	try {
		_globalThis = __webpack_require__(284);
	} catch (error) {
	} finally {
		if (!_globalThis && typeof window !== 'undefined') { _globalThis = window; }
		if (!_globalThis) { throw new Error('Could not determine global this'); }
	}
}

var NativeWebSocket = _globalThis.WebSocket || _globalThis.MozWebSocket;
var websocket_version = __webpack_require__(9387);


/**
 * Expose a W3C WebSocket class with just one or two arguments.
 */
function W3CWebSocket(uri, protocols) {
	var native_instance;

	if (protocols) {
		native_instance = new NativeWebSocket(uri, protocols);
	}
	else {
		native_instance = new NativeWebSocket(uri);
	}

	/**
	 * 'native_instance' is an instance of nativeWebSocket (the browser's WebSocket
	 * class). Since it is an Object it will be returned as it is when creating an
	 * instance of W3CWebSocket via 'new W3CWebSocket()'.
	 *
	 * ECMAScript 5: http://bclary.com/2004/11/07/#a-13.2.2
	 */
	return native_instance;
}
if (NativeWebSocket) {
	['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function(prop) {
		Object.defineProperty(W3CWebSocket, prop, {
			get: function() { return NativeWebSocket[prop]; }
		});
	});
}

/**
 * Module exports.
 */
module.exports = {
    'w3cwebsocket' : NativeWebSocket ? W3CWebSocket : null,
    'version'      : websocket_version
};


/***/ }),

/***/ 9387:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(9794).version;


/***/ }),

/***/ 6672:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9648);
/* harmony import */ var _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(1913);


const Trie = __webpack_require__(9372);

window.noteTitleTrie = new Trie();
window.notes = {};

// Connect UI button
function connectWalletApp() {
  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .toggleConnect */ .Ti)().then(() => {
    if (window.nip07signer) { showMyNotes(); }
  })
}
window.connectWalletApp = connectWalletApp;

function showMyNotes() {
  $("#notes-list").empty();
  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .ensureConnected */ .zs)().then(() => {
    window.notesModal = new bootstrap.Modal('#myNotesModal', {});
    window.notesModal.show();
    $("#note-search-box").focus();
    fetchNotes();
  })
}
window.showMyNotes = showMyNotes;

function fetchNotes() {
  noteTitleTrie = new Trie(); // This is a full reload, so we empty out the existing index.
  notes = {};

  const filter = { authors: [window.nostrUser.hexpubkey()], kinds: [30023] }
  window.ndk.fetchEvents(filter).then(function(eventSet) {
      eventSet.forEach(function(e) { saveNoteToDatabase(e); });
      searchNotes(); // trigger a search to generate the initial display
  }).catch((error) => console.log(error));
}

// Load the note into the editor given by params
function loadNote() {
  if (!PageContext.instance.noteIdentifierFromUrl()) { 
    if (!!window.nip07signer) { return showMyNotes(); }
    else { return newNote(); }
  }

  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .ensureConnected */ .zs)().then(() => {
    const filter = PageContext.instance.noteFilterFromUrl();
    window.ndk.fetchEvent(filter).then(function(event) {
      if (!!event) {
        if (event.pubkey == window.nostrUser.hexpubkey()) {
          saveNoteToDatabase(event);
          editNote(event.id);
        }
      } else if (filter["#d"] && filter["#d"][0].startsWith("tagayasu-")) { // editing a non-existant note, prepoluate fields based on nattr d-tag if present
        const title = filter["#d"][0].slice(9).split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        window.MDEditor.value(`# ${title}`);
        $("#note-title").val(title);
      }
    });
  });
}
window.loadNote = loadNote;

function saveNoteToDatabase(event) {
  const note = Note.fromNostrEvent(event);
  notes[event.id] = note;
  note.title.split(" ").forEach(function(word) {
    noteTitleTrie.add(word.toLowerCase(), event.id);
  });
}

function searchNotes() {
  $("#notes-list").empty();
  const uniqueNotes = new Set();
  $("#note-search-box").val().toLowerCase().split(" ").forEach(function(searchWord) {
    const searchResults = noteTitleTrie.getData(searchWord);
    if (!!searchResults) {
      searchResults.forEach(function(noteId) {
        uniqueNotes.add(noteId);
      });
    }
  });

  let notesDisplayed = 0;
  uniqueNotes.forEach(function(noteId) {
    const note = window.notes[noteId];
    if (notesDisplayed > 20) { return; }
    $("#notes-list").append("<button class='list-group-item list-group-item-action' onclick=\"editNote('" + note.id + "')\">" + note.title + "</button>");
    notesDisplayed++;
  });
}
window.searchNotes = searchNotes;

async function editNote(noteId) {
  PageContext.instance.setNote(window.notes[noteId]);
}
window.editNote = editNote

function newNote() {
  if (!!window.notesModal) { window.notesModal.hide(); }
  window.MDEditor.value("# Welcome to Tagayasu\n\nThis is the note editor, where you can create and edit your content.\n\nTo publish a note, make sure to enter a title below, then click `Publish`!");
  $("#note-title").val("");
  PageContext.instance.setNoteByAuthorPubkey(PageContext.instance.note.authorPubkey);
}
window.newNote = newNote;

function saveNote() {
  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .ensureConnected */ .zs)().then(() => {
    const title = $("#note-title").val();
    if ((0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .dtagFor */ .oF)(title) == "tagayasu-") {
      console.log("empty title is not allowed");
      return;
    }
  
    const saveEvent = new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_1__/* .NDKEvent */ ._C(window.ndk);
    saveEvent.kind = 30023;
    saveEvent.content = window.MDEditor.value();
    saveEvent.tags = [
      ["d", (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .dtagFor */ .oF)(title)],
      ["title", title],
      ["published_at", Math.floor(Date.now() / 1000).toString()]
    ]
    MarkdownRenderer.instance.parse(window.MDEditor.value()).backrefs.forEach(function(backref) {
      saveEvent.tags.push(["a", backref]);
    });
    console.log(saveEvent);
    saveEvent.publish().then(function(x) {
        console.log("published event");
        PageContext.instance.setNoteByNostrEvent(saveEvent);
    })
  });
}
window.saveNote = saveNote;

function savePrivateNote() {
  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .ensureConnected */ .zs)().then(async () => {
    const title = $("#note-title").val();
    if ((0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .dtagFor */ .oF)(title) == "tagayasu-") {
      console.log("empty title is not allowed");
      return;
    }
  
    const saveEvent = new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_1__/* .NDKEvent */ ._C(window.ndk);
    saveEvent.kind = 30023;
    saveEvent.content = await (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .encryptSelf */ .DE)(window.MDEditor.value());
    saveEvent.tags = [
      ["d", (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .dtagFor */ .oF)(title)],
      ["title", title],
      ["private", "true"],
      ["published_at", Math.floor(Date.now() / 1000).toString()]
    ]
    saveEvent.publish().then(function(x) {
        console.log("published event");
        PageContext.instance.setNoteByNostrEvent(saveEvent);
    })
  });
}
window.savePrivateNote = savePrivateNote;

function viewPublishedNote() {
  window.location.href = window.router.urlFor(Router.BROWSER, PageContext.instance.note.handle);
}
window.viewPublishedNote = viewPublishedNote



/***/ }),

/***/ 2451:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9648);


// Connect UI button
function connectWalletBrowse() {
  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .toggleConnect */ .Ti)();
}
window.connectWalletBrowse = connectWalletBrowse;


// Run on page ready; loads the note content from nostr
function browseNote() {
  (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .ensureReadonlyConnected */ .lD)();
   
  const filters = PageContext.instance.noteFilterFromUrl();
  if (!!filters.authors) { PageContext.instance.setNoteByAuthorPubkey(filters.authors[0]); } // save the author from the params (if possible) rather than event in case the event does not exist.
  window.ndk.fetchEvent(filters).then(async function(event) {
    if (!!event) { PageContext.instance.setNoteByNostrEvent(event); }
  });
}
window.browseNote = browseNote;

function openNoteInEditor() {
  window.location.href = window.router.urlFor(Router.EDITOR, PageContext.instance.noteIdentifierFromUrl());
}
window.openNoteInEditor = openNoteInEditor;

async function lookupNpubFromDns() {
  //const hostname = window.location.hostname;
  const hostname = "tagayasu.xyz";
  const url = `https://1.1.1.1/dns-query?name=npub.${hostname}&type=TXT`;
  const headers = {
    'accept': 'application/dns-json'
  };

  // Make the fetch request
  const npub = await fetch(url, {
    headers: headers
  })
    .then(response => response.json()) // Parse the response as JSON
    .then(data => data["Answer"][0]["data"].replace(/[^a-zA-Z0-9]/g, ''))
    .catch(error => {
      console.error('Error:', error);
    });
  return npub;
}
window.lookupNpubFromDns = lookupNpubFromDns;

/***/ }),

/***/ 9648:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DE: () => (/* binding */ encryptSelf),
/* harmony export */   Gk: () => (/* binding */ decryptSelf),
/* harmony export */   Mf: () => (/* binding */ atagFor),
/* harmony export */   Ti: () => (/* binding */ toggleConnect),
/* harmony export */   lD: () => (/* binding */ ensureReadonlyConnected),
/* harmony export */   oF: () => (/* binding */ dtagFor),
/* harmony export */   vK: () => (/* binding */ naddrFor),
/* harmony export */   zs: () => (/* binding */ ensureConnected)
/* harmony export */ });
/* harmony import */ var _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1913);

window.buffer = (__webpack_require__(8764)/* .Buffer */ .lW)
const crypto = __webpack_require__(1354);

window.relays = {
  default: [
    "wss://relay.damus.io"
  ],
  active: []
}
window.relays.active = window.relays.default;

// Swaps between connected / disconnected
function toggleConnect() {
  if (window.nip07signer) {
    window.nip07signer = null;
    window.ndk = null;
    window.nostrUser = null;
    delete(window.sessionStorage.privateKey);
    delete(window.sessionStorage.lastKeyProvider);
    $(".connect-wallet").text("Connect");
    return ensureReadonlyConnected().then(() => {
      window.dispatchEvent(new Event(Wallet.WALLET_DISCONNECTED_EVENT));
    });
  } else {
    return ensureConnected();
  }
}

// Will try to get a connection without user interaction if possible
function trySeamlessConnection() {
  if (window.nip07signer && isNostrConnectionHealthy()) { 
    return Promise.resolve("already connected");
  } else if (window.sessionStorage.lastKeyProvider == "nip07" && !!window.nostr) {
    return connectNostrViaNip07();
  } else if (window.sessionStorage.lastKeyProvider == "private-key" && !!window.sessionStorage.privateKey) {
    return connectNostrViaPrivateKey(window.sessionStorage.privateKey);
  } else {
    return Promise.reject("no seamless connection possible");
  }
}
window.trySeamlessConnection = trySeamlessConnection;

function ensureConnected() {
  return trySeamlessConnection().catch(() => {
    if (!!window.nostr) {
      return connectNostrViaNip07();
    } else if (!!window.ethereum) {
      return connectNostrViaEthereum();
    } else {
      return connectNostrViaPassphrase();
    }
  });
}
  
function ensureReadonlyConnected() {
  if (!isNostrConnectionHealthy()) {
    window.ndk = new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .ZP({explicitRelayUrls: window.relays.active});
    window.ndk.connect();
  }
  return Promise.resolve("connected");
}

function isNostrConnectionHealthy() {
  if (!window.ndk) { return false; }
  const connectionStats = window.ndk.pool.stats();
  return connectionStats.connected / connectionStats.total >= 0.5
}
  
function connectNostr(nip07signer) {
  window.nip07signer = nip07signer;
  window.ndk = new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .ZP({ signer: window.nip07signer, explicitRelayUrls: window.relays.active });

  return nip07signer.user().then(async (user) => {
      if (!!user.npub) {
          window.nostrUser = user;
          console.log("Permission granted to read their public key:", user.npub);
          window.dispatchEvent(new Event(Wallet.WALLET_CONNECTED_EVENT));
          window.ndk.connect();
      }
  });
};

function connectNostrViaNip07() {
  window.sessionStorage.lastKeyProvider = "nip07";
  return connectNostr(new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* .NDKNip07Signer */ .fJ());
}

function connectNostrViaPrivateKey(privateKey) {
  window.sessionStorage.privateKey = privateKey;
  window.sessionStorage.lastKeyProvider = "private-key";
  return connectNostr(new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* .NDKPrivateKeySigner */ .Gg(window.sessionStorage.privateKey));
}

async function connectNostrViaEthereum() {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    .catch((err) => {
      if (err.code === 4001) {
        // EIP-1193 userRejectedRequest error
        // If this happens, the user rejected the connection request.
        console.log('Please connect to MetaMask.');
      } else {
        console.error(err);
      }
    });
  const account = accounts[0];
  console.log(account);

  const message = "Sign this message to approve the current website *unlimited* access to your Tagayasu account.\n\nPlease be very careful to make sure you are on the correct website (tagayasu.xyz) to prevent phising attacks!";

  // For historical reasons, you must submit the message to sign in hex-encoded UTF-8.
  // This uses a Node.js-style buffer shim in the browser.
  const msg = `0x${window.buffer.from(message, 'utf8').toString('hex')}`;
  const sign = await ethereum.request({
    method: 'personal_sign',
    params: [msg, account],
  });
  return connectNostrViaPrivateKey(crypto.SHA256(sign).toString(crypto.enc.Hex).slice(0, 64));
}

function connectNostrViaPassphrase() {
  return new Promise((resolve, reject) => {
    const modal = new bootstrap.Modal("#keyEntryModal", {});
    modal.show();

    modal._element.addEventListener('hidden.bs.modal', function onModalHidden() {
      // Remove the event listener to avoid memory leaks
      modal._element.removeEventListener('hidden.bs.modal', onModalHidden);
      reject("no suitable key store found");
    });

    const submitButton = document.getElementById('connectWithPassPhraseButton');
    submitButton.addEventListener('click', function onButtonClick() {
      // Remove the event listener to avoid memory leaks
      submitButton.removeEventListener('click', onButtonClick);
      modal.hide();
      connectNostrViaPrivateKey(crypto.SHA256($("#pass-phrase").val()).toString(crypto.enc.Hex).slice(0, 64)).then(resolve("user logged in with passphrase"));
    });
  });
}

function dtagFor(title) {
  return "tagayasu-" + title.replace(/[^\w\s]/g, '').toLowerCase().replace(/\s+/g, '-');
}

function naddrFor(title, hexpubkey) {
  const event = new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* .NDKEvent */ ._C(window.ndk);
  event.kind = 30023;
  event.pubkey = hexpubkey;
  event.tags = [["d", dtagFor(title)]];
  return event.encode();
}

function atagFor(title, hexpubkey) {
  return `30023:${hexpubkey}:${dtagFor(title)}`
}

function encryptSelf(text) {
  if (!!window.nostr && !!window.nostr.nip04) {
    return window.nostr.nip04.encrypt(window.nostrUser.hexpubkey(), text);
  } else if (!!window.sessionStorage.privateKey) {
    return Promise.resolve(crypto.AES.encrypt(text, window.sessionStorage.privateKey).toString());
  } else {
    return Promise.reject("Did not find any encryption compatible wallet");
  }
}

function decryptSelf(text) {
  if (!!window.nostr && !!window.nostr.nip04) {
    return window.nostr.nip04.decrypt(window.nostrUser.hexpubkey(), text);
  } else if (!!window.sessionStorage.privateKey) {
    return Promise.resolve(crypto.AES.decrypt(text, window.sessionStorage.privateKey).toString(crypto.enc.Utf8));
  } else {
    return Promise.reject("Did not find any encryption compatible wallet");
  }
}

/***/ }),

/***/ 5857:
/***/ (() => {

class DnsClient {
    _baseUrl = 'https://1.1.1.1/dns-query?type=TXT&name=';
    _headers = { 'accept': 'application/dns-json' };

    static instance = new DnsClient();
    constructor() {
        if (!!DnsClient.instance) { throw new Error('Use singleton instance'); }
    }

    async txt(domain) {
        return fetch(this._baseUrl + domain, { headers: this._headers })
        .then(response => response.json())
        .then(data => {
            if (data["Answer"]) {
                return data["Answer"][0]["data"].replace(/[^a-zA-Z0-9]/g, '');
            } else {
                return '';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            return null;
        });
    }

    _npubs = {};
    async npub(domain) {
        if (!!this._npubs[domain]) { return this._npubs[domain]; }
        const result = await this.txt(`npub.${domain}`);
        this._npubs[domain] = result;
        return this._npubs[domain];
    }
}
window.DnsClient = DnsClient;

/***/ }),

/***/ 6044:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9648);


class MarkdownRenderer {
    static instance = new MarkdownRenderer();
    constructor() {
        if (!!MarkdownRenderer.instance) { throw new Error('Use singleton instance'); }
    }

    renderHtml(markdown) {
        return this.parse(markdown).html;
    }

    parse(markdown) {
        // Custom tokenizer to parse links to authors other articles
        // Format: [[note title]]
        const tokenizer = {
            link(src) {
            const match = src.match(/^\[\[([^\]\n]+)\]\]/);
            if (match) {
                this.lexer.state.inLink = true;
                const handle = (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .naddrFor */ .vK)(match[1], PageContext.instance.note.authorPubkey);
                const token = {
                type: 'link',
                raw: match[0],
                href: window.router.urlFor(Router.BROWSER, handle),
                title: match[1],
                text: match[1],
                tokens: this.lexer.inlineTokens(match[1])
                }
                this.lexer.state.inLink = false;
                window.foo.push((0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .atagFor */ .Mf)(match[1], PageContext.instance.note.authorPubkey));
                return token;
            }
            return false;
            }
        };

        window.foo = [];
        marked.use({ tokenizer });
        marked.use(markedKatex({ throwOnError: true }));
        return {
            html: DOMPurify.sanitize(marked.parse(markdown)),
            backrefs: window.foo,
        }
    }
}
window.MarkdownRenderer = MarkdownRenderer;

/***/ }),

/***/ 3797:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1913);


class Note {
    static fromNostrEvent(event) {
        const note = new Note();
        note.id = event.id;
        note.nostrEvent = event;
        note.title = event.tags.find(t => t[0] == "title")[1];
        note.private = !!event.tags.find(t => t[0] == "private");
        note.content = event.content;
        note.authorPubkey = event.pubkey;
        return note;
    }

    static fromHexPubkey(pubkey) {
        const note = new Note();
        note.authorPubkey = pubkey;
        return note;
    }

    get handle() {
        const event = new _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* .NDKEvent */ ._C(window.ndk);
        event.kind = 30023;
        event.pubkey = this.authorPubkey;
        event.tags = [["d", this.dtag]];
        return event.encode();
    }

    get dtag() {
        return "tagayasu-" + this.title.replace(/[^\w\s]/g, '').toLowerCase().replace(/\s+/g, '-');
    }
}
window.Note = Note;

/***/ }),

/***/ 5284:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1913);


class PageContext {
    static NOTE_IN_FOCUS_CHANGED = "note-in-focus-changed";
    static NADDR_PARAM_NAME = "n";

    static instance = new PageContext();
    constructor() {
        if (!!PageContext.instance) { throw new Error('Use singleton instance'); }
    }

    _note = new Note();
    get note() { return this._note; }
    setNote(note) { // note should be an instance of `Note`
        this._note = note;
        window.dispatchEvent(new Event(PageContext.NOTE_IN_FOCUS_CHANGED));
    }
    setNoteByNostrEvent(event) {
        this._note = Note.fromNostrEvent(event);
        window.dispatchEvent(new Event(PageContext.NOTE_IN_FOCUS_CHANGED));
    }
    setNoteByAuthorPubkey(authorPubkey) {
        if (authorPubkey.startsWith("npub")) {
            throw new Error('Expected hexpubkey, got npub');
        }
        this._note = Note.fromHexPubkey(authorPubkey);
        window.dispatchEvent(new Event(PageContext.NOTE_IN_FOCUS_CHANGED));
    }
    

    _dnslinkNpub = null;
    async dnslinkNpub() {
        if (this._dnslinkNpub !== null) { return this._dnslinkNpub; }

        const npubFromDomain = await DnsClient.instance.npub(window.location.hostname);
        if (npubFromDomain === null || !npubFromDomain.startsWith('npub')) { this._dnslinkNpub = ''; }
        else { this._dnslinkNpub = npubFromDomain; }
        return this._dnslinkNpub;
    }

    noteFilterFromUrl() {
        const filter = (0,_nostr_dev_kit_ndk__WEBPACK_IMPORTED_MODULE_0__/* .filterFromId */ .e)(this.noteIdentifierFromUrl());
        if (!filter.kinds) { filter.kinds = [30023]; }
        return filter;
    }

    noteIdentifierFromUrl() {
        return this._urlParam(PageContext.NADDR_PARAM_NAME);
    }

    _urlParam(name) {
        if (window.router.inlineParams[name]) { return window.router.inlineParams[name]; }
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results==null) {
          return null;
        }
        return decodeURI(results[1]) || 0;
    }
}
window.PageContext = PageContext;

/***/ }),

/***/ 8751:
/***/ (() => {

/**
 * /<page name>/...  always overrides to that page
 * 
 * Otherwise a default page is chosen based on the environment:
 * 1) If we're on a known editor domain, go to the editor
 * 2) If there is a npub TXT record on the domain, go to the browser
 * 3) If there's no npub, show the dnslink help page
 */

class Router {
    editorDomains = [
        'app.tagayasu.xyz',
        'melari-organic-goggles-g4q45x579r2v4w6-8080.app.github.dev'
    ];

    static EDITOR = 'editor';
    static BROWSER = 'browser';
    static DNSLINK_HELP = 'dnslinkHelp';
    static ALL_PAGES = [Router.EDITOR, Router.BROWSER, Router.DNSLINK_HELP];

    _pageName = null;
    get pageName() {
        if (!!this._pageName) { return this._pageName; }
        throw new Error('Call route() first');
    }

    _defaultPageName = null;
    get defaultPageName() {
        if (!!this._defaultPageName) { return this._defaultPageName; }
        throw new Error('call route() first');
    }

    _inlineParams = null;
    get inlineParams() {
        if (!!this._inlineParams) { return this._inlineParams; }
        throw new Error('call route() first');
    }

    async route() {
        if (this.editorDomains.includes(window.location.hostname)) {
            this._defaultPageName = Router.EDITOR;
        } else if (!!(await PageContext.instance.dnslinkNpub())) {
            this._defaultPageName = Router.BROWSER;
        } else {
            this._defaultPageName = Router.DNSLINK_HELP;
        }

        const urlParts = window.location.pathname.split('/').filter(x => x);
        if (Router.ALL_PAGES.includes(urlParts[0])) {
            this._pageName = urlParts[0];
            this._parseInlineParams(this._pageName, urlParts.slice(1));
            return this;
        }
        
        this._pageName = this._defaultPageName;
        this._parseInlineParams(this._pageName, urlParts);
        return this;
    }

    urlFor(pageName, postFix) {
        if (!Router.ALL_PAGES.includes(pageName)) {
            throw new Error(pageName + " is not a valid page");
        }

        const postFixWithSlash = postFix.startsWith("/") ? postFix : "/" + postFix;
        if (pageName == this.defaultPageName) {
            return window.location.origin + postFixWithSlash;
        } else {
            return window.location.origin + "/" + pageName + postFixWithSlash;
        }
    }

    _parseInlineParams(pageName, urlParts) {
        this._inlineParams = {};
        this._inlineParams[PageContext.NADDR_PARAM_NAME] = urlParts[0];
    }
}
window.Router = Router;

/***/ }),

/***/ 8281:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _common_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9648);


$(window).on('load', async function() {
    window.trySeamlessConnection();

    window.router = await new Router().route();
    $("#page-" + window.router.pageName).show();
    if (window.router.pageName == "editor") {
        window.loadNote();
    } else if (window.router.pageName == "browser") {
        window.browseNote();
    }
});

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function(e) {
    $("#help-npub").html(window.nostrUser.npub);
    if (window.router.pageName == Router.EDITOR) {
        PageContext.instance.setNoteByAuthorPubkey(window.nostrUser.hexpubkey());
    }
});

window.addEventListener(Wallet.WALLET_CONNECTION_CHANGED, function(e) {
    renderConnectButtons({ hover: false });
    updateOwnerOnly();
});

window.addEventListener(PageContext.NOTE_IN_FOCUS_CHANGED, async function(e) {
    updateOwnerOnly();

    const note = PageContext.instance.note;
    if (note.nostrEvent) {
        if (note.private) { // if the private tag is present, it means the content is encrypted
            $("#note-content").html(MarkdownRenderer.instance.renderHtml(await (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .decryptSelf */ .Gk)(note.content)))
            window.MDEditor.value(await (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .decryptSelf */ .Gk)(note.content));
          } else {
            $("#note-content").html(MarkdownRenderer.instance.renderHtml(note.content));
            window.MDEditor.value(note.content);
          }
          loadBackrefs();
    } else {
        $("#note-content").html("<center><h3>note not found!</h3>Either this version of the note no longer exists or it's on a different nostr relay.");
    }

    if (!!window.notesModal) { window.notesModal.hide(); }
    $("#note-title").val(note.title);
});

$('#myNotesModal').on('shown.bs.modal', function () {
    $('#note-search-box').focus();
});

$(".connect-wallet").mouseenter(function() {
    renderConnectButtons({ hover: true });
});
$(".connect-wallet").mouseleave(function() {
    renderConnectButtons({ hover: false });
});

window.MDEditor = new SimpleMDE({
    showIcons: ["code", "table"],
    renderingConfig: {
        codeSyntaxHighlighting: true
    },
    tabSize: 2,
    previewRender: MarkdownRenderer.instance.renderHtml
});

function renderConnectButtons({ hover }) {
    $(".connect-wallet").each(function(_i, _obj) {
      $(this).width("auto");
      if (!window.nip07signer) { return; } // Only show disconnect hover text if connected
      const width = $(this).width();
      $(this).text(hover ? "🔴 Disconnect" : npubPreview());
      $(this).width(hover ? `${width}px` : "auto");
    });
}

function npubPreview() {
    if (!window.nostrUser) { return "Connect"; }
    return window.nostrUser.npub.slice(0,8) + "…" + window.nostrUser.npub.slice(59,63);
}

function updateOwnerOnly() {
    if (
        !!PageContext.instance.note.authorPubkey &&
        !!window.nostrUser &&
        PageContext.instance.note.authorPubkey == window.nostrUser.hexpubkey()
    ) {
        $(".owner-only").show();
    } else {
        $(".owner-only").hide();
    }
}

function loadBackrefs() {
    (0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .ensureReadonlyConnected */ .lD)();

    $("#backref-content").empty();

    const filters = {
        authors: [PageContext.instance.note.nostrEvent.pubkey],
        kinds: [30023],
        "#a": [(0,_common_js__WEBPACK_IMPORTED_MODULE_0__/* .atagFor */ .Mf)(PageContext.instance.note.nostrEvent.tags.find(t => t[0] == "title")[1], PageContext.instance.note.nostrEvent.pubkey)]
    };
    window.ndk.fetchEvents(filters).then(function(events) {
        events.forEach(function(event) {
        const href = window.router.urlFor(Router.BROWSER, event.encode());
        const title = event.tags.find(t => t[0] == "title")[1];
        $("#backref-content").append(`<li><a href='${href}'>${title}</a></li>`)
        });
    });
}

/***/ }),

/***/ 5123:
/***/ (() => {

class Wallet {
    static WALLET_CONNECTED_EVENT = "wallet-connected-event";
    static WALLET_DISCONNECTED_EVENT = "wallet-disconnected-event";
    static WALLET_CONNECTION_CHANGED = "wallet-connection-changed";

    static instance = new Wallet();
    constructor() {
        if (!!Wallet.instance) { throw new Error('Use singleton instance'); }
    }
}
window.Wallet = Wallet;

window.addEventListener(Wallet.WALLET_CONNECTED_EVENT, function(e) {
    window.dispatchEvent(new Event(Wallet.WALLET_CONNECTION_CHANGED));
});

window.addEventListener(Wallet.WALLET_DISCONNECTED_EVENT, function(e) {
    window.dispatchEvent(new Event(Wallet.WALLET_CONNECTION_CHANGED));
});

/***/ }),

/***/ 2480:
/***/ (() => {

/* (ignored) */

/***/ }),

/***/ 1913:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  _C: () => (/* binding */ NDKEvent),
  fJ: () => (/* binding */ NDKNip07Signer),
  Gg: () => (/* binding */ NDKPrivateKeySigner),
  ZP: () => (/* binding */ NDK7),
  e: () => (/* binding */ filterFromId)
});

// UNUSED EXPORTS: NDKKind, NDKList, NDKNip46Backend, NDKNip46Signer, NDKNostrRpc, NDKRelay, NDKRelaySet, NDKRelayStatus, NDKSubscription, NDKSubscriptionCacheUsage, NDKSubscriptionGroup, NDKUser, defaultOpts, mergeEvent, mergeFilters, zapInvoiceFromEvent

// NAMESPACE OBJECT: ./node_modules/@noble/curves/esm/abstract/utils.js
var abstract_utils_namespaceObject = {};
__webpack_require__.r(abstract_utils_namespaceObject);
__webpack_require__.d(abstract_utils_namespaceObject, {
  dQ: () => (bitMask),
  ci: () => (utils_bytesToHex),
  bytesToNumberBE: () => (bytesToNumberBE),
  ty: () => (bytesToNumberLE),
  eV: () => (utils_concatBytes),
  n$: () => (createHmacDrbg),
  ql: () => (ensureBytes),
  hexToBytes: () => (utils_hexToBytes),
  tL: () => (numberToBytesBE),
  S5: () => (numberToBytesLE),
  iY: () => (utils_utf8ToBytes),
  FF: () => (validateObject)
});

// EXTERNAL MODULE: ./node_modules/debug/src/browser.js
var browser = __webpack_require__(1227);
// EXTERNAL MODULE: ./node_modules/eventemitter3/index.js
var eventemitter3 = __webpack_require__(6729);
;// CONCATENATED MODULE: ./node_modules/eventemitter3/index.mjs



/* harmony default export */ const node_modules_eventemitter3 = (eventemitter3);

;// CONCATENATED MODULE: ./node_modules/@noble/curves/node_modules/@noble/hashes/esm/_assert.js
function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
function bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`Expected boolean, not ${b}`);
}
function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new TypeError('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new TypeError(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
function hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(hash.outputLen);
    number(hash.blockLen);
}
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
const assert = {
    number,
    bool,
    bytes,
    hash,
    exists,
    output,
};
/* harmony default export */ const _assert = (assert);
//# sourceMappingURL=_assert.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/node_modules/@noble/hashes/esm/crypto.js
const crypto_crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
//# sourceMappingURL=crypto.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/node_modules/@noble/hashes/esm/utils.js
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// We use `globalThis.crypto`, but node.js versions earlier than v19 don't
// declare it in global scope. For node.js, package.json#exports field mapping
// rewrites import from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated, we can just drop the import.

// Cast array to different type
const u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
// Cast array to view
const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!isLE)
    throw new Error('Non little-endian hardware is not supported');
const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef])) // 'deadbeef'
 */
function bytesToHex(uint8a) {
    // pre-caching improves the speed 6x
    if (!(uint8a instanceof Uint8Array))
        throw new Error('Uint8Array expected');
    let hex = '';
    for (let i = 0; i < uint8a.length; i++) {
        hex += hexes[uint8a[i]];
    }
    return hex;
}
/**
 * @example hexToBytes('deadbeef') // Uint8Array.from([0xde, 0xad, 0xbe, 0xef])
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
    }
    if (hex.length % 2)
        throw new Error('hexToBytes: received invalid unpadded hex');
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
const nextTick = async () => { };
// Returns control to thread each 'tick' ms to avoid blocking
async function asyncLoop(iters, tick, cb) {
    let ts = Date.now();
    for (let i = 0; i < iters; i++) {
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick)
            continue;
        await nextTick();
        ts += diff;
    }
}
function utf8ToBytes(str) {
    if (typeof str !== 'string') {
        throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
    }
    return new TextEncoder().encode(str);
}
function toBytes(data) {
    if (typeof data === 'string')
        data = utf8ToBytes(data);
    if (!(data instanceof Uint8Array))
        throw new TypeError(`Expected input type is Uint8Array (got ${typeof data})`);
    return data;
}
/**
 * Concats Uint8Array-s into one; like `Buffer.concat([buf1, buf2])`
 * @example concatBytes(buf1, buf2)
 */
function concatBytes(...arrays) {
    if (!arrays.every((a) => a instanceof Uint8Array))
        throw new Error('Uint8Array list expected');
    if (arrays.length === 1)
        return arrays[0];
    const length = arrays.reduce((a, arr) => a + arr.length, 0);
    const result = new Uint8Array(length);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}
// For runtime check if class implements interface
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
// Check if object doens't have custom constructor (like Uint8Array/Array)
const isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
function checkOpts(defaults, opts) {
    if (opts !== undefined && (typeof opts !== 'object' || !isPlainObject(opts)))
        throw new TypeError('Options should be object or undefined');
    const merged = Object.assign(defaults, opts);
    return merged;
}
function wrapConstructor(hashConstructor) {
    const hashC = (message) => hashConstructor().update(toBytes(message)).digest();
    const tmp = hashConstructor();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashConstructor();
    return hashC;
}
function wrapConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
/**
 * Secure PRNG. Uses `globalThis.crypto` or node.js crypto module.
 */
function randomBytes(bytesLength = 32) {
    if (crypto_crypto && typeof crypto_crypto.getRandomValues === 'function') {
        return crypto_crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
}
//# sourceMappingURL=utils.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/node_modules/@noble/hashes/esm/_sha2.js


// Polyfill for Safari 14
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class SHA2 extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
    }
    update(data) {
        _assert.exists(this);
        const { view, buffer, blockLen } = this;
        data = toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = createView(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        _assert.exists(this);
        _assert.output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = createView(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
//# sourceMappingURL=_sha2.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/node_modules/@noble/hashes/esm/sha256.js


// Choice: a ? b : c
const Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = new Uint32Array(64);
class SHA256 extends SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
// Constants from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
class SHA224 extends SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
const sha256 = wrapConstructor(() => new SHA256());
const sha224 = wrapConstructor(() => new SHA224());
//# sourceMappingURL=sha256.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/abstract/utils.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const _0n = BigInt(0);
const _1n = BigInt(1);
const _2n = BigInt(2);
const u8a = (a) => a instanceof Uint8Array;
const utils_hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
function utils_bytesToHex(bytes) {
    if (!u8a(bytes))
        throw new Error('Uint8Array expected');
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += utils_hexes[bytes[i]];
    }
    return hex;
}
function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    // Big Endian
    return BigInt(hex === '' ? '0' : `0x${hex}`);
}
// Caching slows it down 2-3x
function utils_hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    if (hex.length % 2)
        throw new Error('hex string is invalid: unpadded ' + hex.length);
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
// Big Endian
function bytesToNumberBE(bytes) {
    return hexToNumber(utils_bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
    if (!u8a(bytes))
        throw new Error('Uint8Array expected');
    return hexToNumber(utils_bytesToHex(Uint8Array.from(bytes).reverse()));
}
const numberToBytesBE = (n, len) => utils_hexToBytes(n.toString(16).padStart(len * 2, '0'));
const numberToBytesLE = (n, len) => numberToBytesBE(n, len).reverse();
// Returns variable number bytes (minimal bigint encoding?)
const numberToVarBytesBE = (n) => utils_hexToBytes(numberToHexUnpadded(n));
function ensureBytes(title, hex, expectedLength) {
    let res;
    if (typeof hex === 'string') {
        try {
            res = utils_hexToBytes(hex);
        }
        catch (e) {
            throw new Error(`${title} must be valid hex string, got "${hex}". Cause: ${e}`);
        }
    }
    else if (u8a(hex)) {
        // Uint8Array.from() instead of hash.slice() because node.js Buffer
        // is instance of Uint8Array, and its slice() creates **mutable** copy
        res = Uint8Array.from(hex);
    }
    else {
        throw new Error(`${title} must be hex string or Uint8Array`);
    }
    const len = res.length;
    if (typeof expectedLength === 'number' && len !== expectedLength)
        throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
    return res;
}
// Copies several Uint8Arrays into one.
function utils_concatBytes(...arrs) {
    const r = new Uint8Array(arrs.reduce((sum, a) => sum + a.length, 0));
    let pad = 0; // walk through each item, ensure they have proper type
    arrs.forEach((a) => {
        if (!u8a(a))
            throw new Error('Uint8Array expected');
        r.set(a, pad);
        pad += a.length;
    });
    return r;
}
function equalBytes(b1, b2) {
    // We don't care about timing attacks here
    if (b1.length !== b2.length)
        return false;
    for (let i = 0; i < b1.length; i++)
        if (b1[i] !== b2[i])
            return false;
    return true;
}
function utils_utf8ToBytes(str) {
    if (typeof str !== 'string') {
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    }
    return new TextEncoder().encode(str);
}
// Bit operations
// Amount of bits inside bigint (Same as n.toString(2).length)
function bitLen(n) {
    let len;
    for (len = 0; n > _0n; n >>= _1n, len += 1)
        ;
    return len;
}
// Gets single bit at position. NOTE: first bit position is 0 (same as arrays)
// Same as !!+Array.from(n.toString(2)).reverse()[pos]
const bitGet = (n, pos) => (n >> BigInt(pos)) & _1n;
// Sets single bit at position
const bitSet = (n, pos, value) => n | ((value ? _1n : _0n) << BigInt(pos));
// Return mask for N bits (Same as BigInt(`0b${Array(i).fill('1').join('')}`))
// Not using ** operator with bigints for old engines.
const bitMask = (n) => (_2n << BigInt(n - 1)) - _1n;
// DRBG
const u8n = (data) => new Uint8Array(data); // creates Uint8Array
const u8fr = (arr) => Uint8Array.from(arr); // another shortcut
/**
 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
 * @returns function that will call DRBG until 2nd arg returns something meaningful
 * @example
 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
 */
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    if (typeof hashLen !== 'number' || hashLen < 2)
        throw new Error('hashLen must be a number');
    if (typeof qByteLen !== 'number' || qByteLen < 2)
        throw new Error('qByteLen must be a number');
    if (typeof hmacFn !== 'function')
        throw new Error('hmacFn must be a function');
    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
    let i = 0; // Iterations counter, will throw when over 1000
    const reset = () => {
        v.fill(1);
        k.fill(0);
        i = 0;
    };
    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
    const reseed = (seed = u8n()) => {
        // HMAC-DRBG reseed() function. Steps D-G
        k = h(u8fr([0x00]), seed); // k = hmac(k || v || 0x00 || seed)
        v = h(); // v = hmac(k || v)
        if (seed.length === 0)
            return;
        k = h(u8fr([0x01]), seed); // k = hmac(k || v || 0x01 || seed)
        v = h(); // v = hmac(k || v)
    };
    const gen = () => {
        // HMAC-DRBG generate() function
        if (i++ >= 1000)
            throw new Error('drbg: tried 1000 values');
        let len = 0;
        const out = [];
        while (len < qByteLen) {
            v = h();
            const sl = v.slice();
            out.push(sl);
            len += v.length;
        }
        return utils_concatBytes(...out);
    };
    const genUntil = (seed, pred) => {
        reset();
        reseed(seed); // Steps D-G
        let res = undefined; // Step H: grind until k is in [1..n-1]
        while (!(res = pred(gen())))
            reseed();
        reset();
        return res;
    };
    return genUntil;
}
// Validating curves and fields
const validatorFns = {
    bigint: (val) => typeof val === 'bigint',
    function: (val) => typeof val === 'function',
    boolean: (val) => typeof val === 'boolean',
    string: (val) => typeof val === 'string',
    isSafeInteger: (val) => Number.isSafeInteger(val),
    array: (val) => Array.isArray(val),
    field: (val, object) => object.Fp.isValid(val),
    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
};
// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
function validateObject(object, validators, optValidators = {}) {
    const checkField = (fieldName, type, isOptional) => {
        const checkVal = validatorFns[type];
        if (typeof checkVal !== 'function')
            throw new Error(`Invalid validator "${type}", expected function`);
        const val = object[fieldName];
        if (isOptional && val === undefined)
            return;
        if (!checkVal(val, object)) {
            throw new Error(`Invalid param ${String(fieldName)}=${val} (${typeof val}), expected ${type}`);
        }
    };
    for (const [fieldName, type] of Object.entries(validators))
        checkField(fieldName, type, false);
    for (const [fieldName, type] of Object.entries(optValidators))
        checkField(fieldName, type, true);
    return object;
}
// validate type tests
// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
// // Should fail type-check
// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });
//# sourceMappingURL=utils.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/abstract/modular.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Utilities for modular arithmetics and finite fields

// prettier-ignore
const modular_0n = BigInt(0), modular_1n = BigInt(1), modular_2n = BigInt(2), _3n = BigInt(3);
// prettier-ignore
const _4n = BigInt(4), _5n = BigInt(5), _8n = BigInt(8);
// prettier-ignore
const _9n = BigInt(9), _16n = BigInt(16);
// Calculates a modulo b
function mod(a, b) {
    const result = a % b;
    return result >= modular_0n ? result : b + result;
}
/**
 * Efficiently exponentiate num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @example
 * powMod(2n, 6n, 11n) // 64n % 11n == 9n
 */
// TODO: use field version && remove
function pow(num, power, modulo) {
    if (modulo <= modular_0n || power < modular_0n)
        throw new Error('Expected power/modulo > 0');
    if (modulo === modular_1n)
        return modular_0n;
    let res = modular_1n;
    while (power > modular_0n) {
        if (power & modular_1n)
            res = (res * num) % modulo;
        num = (num * num) % modulo;
        power >>= modular_1n;
    }
    return res;
}
// Does x ^ (2 ^ power) mod p. pow2(30, 4) == 30 ^ (2 ^ 4)
function pow2(x, power, modulo) {
    let res = x;
    while (power-- > modular_0n) {
        res *= res;
        res %= modulo;
    }
    return res;
}
// Inverses number over modulo
function invert(number, modulo) {
    if (number === modular_0n || modulo <= modular_0n) {
        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    // Eucledian GCD https://brilliant.org/wiki/extended-euclidean-algorithm/
    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
    let a = mod(number, modulo);
    let b = modulo;
    // prettier-ignore
    let x = modular_0n, y = modular_1n, u = modular_1n, v = modular_0n;
    while (a !== modular_0n) {
        // JIT applies optimization if those two lines follow each other
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        const n = y - v * q;
        // prettier-ignore
        b = a, a = r, x = u, y = v, u = m, v = n;
    }
    const gcd = b;
    if (gcd !== modular_1n)
        throw new Error('invert: does not exist');
    return mod(x, modulo);
}
// Tonelli-Shanks algorithm
// Paper 1: https://eprint.iacr.org/2012/685.pdf (page 12)
// Paper 2: Square Roots from 1; 24, 51, 10 to Dan Shanks
function tonelliShanks(P) {
    // Legendre constant: used to calculate Legendre symbol (a | p),
    // which denotes the value of a^((p-1)/2) (mod p).
    // (a | p) ≡ 1    if a is a square (mod p)
    // (a | p) ≡ -1   if a is not a square (mod p)
    // (a | p) ≡ 0    if a ≡ 0 (mod p)
    const legendreC = (P - modular_1n) / modular_2n;
    let Q, S, Z;
    // Step 1: By factoring out powers of 2 from p - 1,
    // find q and s such that p - 1 = q*(2^s) with q odd
    for (Q = P - modular_1n, S = 0; Q % modular_2n === modular_0n; Q /= modular_2n, S++)
        ;
    // Step 2: Select a non-square z such that (z | p) ≡ -1 and set c ≡ zq
    for (Z = modular_2n; Z < P && pow(Z, legendreC, P) !== P - modular_1n; Z++)
        ;
    // Fast-path
    if (S === 1) {
        const p1div4 = (P + modular_1n) / _4n;
        return function tonelliFast(Fp, n) {
            const root = Fp.pow(n, p1div4);
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Slow-path
    const Q1div2 = (Q + modular_1n) / modular_2n;
    return function tonelliSlow(Fp, n) {
        // Step 0: Check that n is indeed a square: (n | p) should not be ≡ -1
        if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE))
            throw new Error('Cannot find square root');
        let r = S;
        // TODO: will fail at Fp2/etc
        let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q); // will update both x and b
        let x = Fp.pow(n, Q1div2); // first guess at the square root
        let b = Fp.pow(n, Q); // first guess at the fudge factor
        while (!Fp.eql(b, Fp.ONE)) {
            if (Fp.eql(b, Fp.ZERO))
                return Fp.ZERO; // https://en.wikipedia.org/wiki/Tonelli%E2%80%93Shanks_algorithm (4. If t = 0, return r = 0)
            // Find m such b^(2^m)==1
            let m = 1;
            for (let t2 = Fp.sqr(b); m < r; m++) {
                if (Fp.eql(t2, Fp.ONE))
                    break;
                t2 = Fp.sqr(t2); // t2 *= t2
            }
            // NOTE: r-m-1 can be bigger than 32, need to convert to bigint before shift, otherwise there will be overflow
            const ge = Fp.pow(g, modular_1n << BigInt(r - m - 1)); // ge = 2^(r-m-1)
            g = Fp.sqr(ge); // g = ge * ge
            x = Fp.mul(x, ge); // x *= ge
            b = Fp.mul(b, g); // b *= g
            r = m;
        }
        return x;
    };
}
function FpSqrt(P) {
    // NOTE: different algorithms can give different roots, it is up to user to decide which one they want.
    // For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
    // P ≡ 3 (mod 4)
    // √n = n^((P+1)/4)
    if (P % _4n === _3n) {
        // Not all roots possible!
        // const ORDER =
        //   0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        // const NUM = 72057594037927816n;
        const p1div4 = (P + modular_1n) / _4n;
        return function sqrt3mod4(Fp, n) {
            const root = Fp.pow(n, p1div4);
            // Throw if root**2 != n
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Atkin algorithm for q ≡ 5 (mod 8), https://eprint.iacr.org/2012/685.pdf (page 10)
    if (P % _8n === _5n) {
        const c1 = (P - _5n) / _8n;
        return function sqrt5mod8(Fp, n) {
            const n2 = Fp.mul(n, modular_2n);
            const v = Fp.pow(n2, c1);
            const nv = Fp.mul(n, v);
            const i = Fp.mul(Fp.mul(nv, modular_2n), v);
            const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // P ≡ 9 (mod 16)
    if (P % _16n === _9n) {
        // NOTE: tonelli is too slow for bls-Fp2 calculations even on start
        // Means we cannot use sqrt for constants at all!
        //
        // const c1 = Fp.sqrt(Fp.negate(Fp.ONE)); //  1. c1 = sqrt(-1) in F, i.e., (c1^2) == -1 in F
        // const c2 = Fp.sqrt(c1);                //  2. c2 = sqrt(c1) in F, i.e., (c2^2) == c1 in F
        // const c3 = Fp.sqrt(Fp.negate(c1));     //  3. c3 = sqrt(-c1) in F, i.e., (c3^2) == -c1 in F
        // const c4 = (P + _7n) / _16n;           //  4. c4 = (q + 7) / 16        # Integer arithmetic
        // sqrt = (x) => {
        //   let tv1 = Fp.pow(x, c4);             //  1. tv1 = x^c4
        //   let tv2 = Fp.mul(c1, tv1);           //  2. tv2 = c1 * tv1
        //   const tv3 = Fp.mul(c2, tv1);         //  3. tv3 = c2 * tv1
        //   let tv4 = Fp.mul(c3, tv1);           //  4. tv4 = c3 * tv1
        //   const e1 = Fp.equals(Fp.square(tv2), x); //  5.  e1 = (tv2^2) == x
        //   const e2 = Fp.equals(Fp.square(tv3), x); //  6.  e2 = (tv3^2) == x
        //   tv1 = Fp.cmov(tv1, tv2, e1); //  7. tv1 = CMOV(tv1, tv2, e1)  # Select tv2 if (tv2^2) == x
        //   tv2 = Fp.cmov(tv4, tv3, e2); //  8. tv2 = CMOV(tv4, tv3, e2)  # Select tv3 if (tv3^2) == x
        //   const e3 = Fp.equals(Fp.square(tv2), x); //  9.  e3 = (tv2^2) == x
        //   return Fp.cmov(tv1, tv2, e3); //  10.  z = CMOV(tv1, tv2, e3)  # Select the sqrt from tv1 and tv2
        // }
    }
    // Other cases: Tonelli-Shanks algorithm
    return tonelliShanks(P);
}
// Little-endian check for first LE bit (last BE bit);
const isNegativeLE = (num, modulo) => (mod(num, modulo) & modular_1n) === modular_1n;
// prettier-ignore
const FIELD_FIELDS = [
    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
    'eql', 'add', 'sub', 'mul', 'pow', 'div',
    'addN', 'subN', 'mulN', 'sqrN'
];
function validateField(field) {
    const initial = {
        ORDER: 'bigint',
        MASK: 'bigint',
        BYTES: 'isSafeInteger',
        BITS: 'isSafeInteger',
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
        map[val] = 'function';
        return map;
    }, initial);
    return validateObject(field, opts);
}
// Generic field functions
function FpPow(f, num, power) {
    // Should have same speed as pow for bigints
    // TODO: benchmark!
    if (power < modular_0n)
        throw new Error('Expected power > 0');
    if (power === modular_0n)
        return f.ONE;
    if (power === modular_1n)
        return num;
    let p = f.ONE;
    let d = num;
    while (power > modular_0n) {
        if (power & modular_1n)
            p = f.mul(p, d);
        d = f.sqr(d);
        power >>= modular_1n;
    }
    return p;
}
// 0 is non-invertible: non-batched version will throw on 0
function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    // Walk from first to last, multiply them by each other MOD p
    const lastMultiplied = nums.reduce((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = acc;
        return f.mul(acc, num);
    }, f.ONE);
    // Invert last element
    const inverted = f.inv(lastMultiplied);
    // Walk from last to first, multiply them by inverted each other MOD p
    nums.reduceRight((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = f.mul(acc, tmp[i]);
        return f.mul(acc, num);
    }, inverted);
    return tmp;
}
function FpDiv(f, lhs, rhs) {
    return f.mul(lhs, typeof rhs === 'bigint' ? invert(rhs, f.ORDER) : f.inv(rhs));
}
// This function returns True whenever the value x is a square in the field F.
function FpIsSquare(f) {
    const legendreConst = (f.ORDER - modular_1n) / modular_2n; // Integer arithmetic
    return (x) => {
        const p = f.pow(x, legendreConst);
        return f.eql(p, f.ZERO) || f.eql(p, f.ONE);
    };
}
// CURVE.n lengths
function nLength(n, nBitLength) {
    // Bit size, byte size of CURVE.n
    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
}
/**
 * Initializes a galois field over prime. Non-primes are not supported for now.
 * Do not init in loop: slow. Very fragile: always run a benchmark on change.
 * Major performance gains:
 * a) non-normalized operations like mulN instead of mul
 * b) `Object.freeze`
 * c) Same object shape: never add or remove keys
 * @param ORDER prime positive bigint
 * @param bitLen how many bits the field consumes
 * @param isLE (def: false) if encoding / decoding should be in little-endian
 * @param redef optional faster redefinitions of sqrt and other methods
 */
function Field(ORDER, bitLen, isLE = false, redef = {}) {
    if (ORDER <= modular_0n)
        throw new Error(`Expected Fp ORDER > 0, got ${ORDER}`);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
    if (BYTES > 2048)
        throw new Error('Field lengths over 2048 bytes are not supported');
    const sqrtP = FpSqrt(ORDER);
    const f = Object.freeze({
        ORDER,
        BITS,
        BYTES,
        MASK: bitMask(BITS),
        ZERO: modular_0n,
        ONE: modular_1n,
        create: (num) => mod(num, ORDER),
        isValid: (num) => {
            if (typeof num !== 'bigint')
                throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
            return modular_0n <= num && num < ORDER; // 0 is valid element, but it's not invertible
        },
        is0: (num) => num === modular_0n,
        isOdd: (num) => (num & modular_1n) === modular_1n,
        neg: (num) => mod(-num, ORDER),
        eql: (lhs, rhs) => lhs === rhs,
        sqr: (num) => mod(num * num, ORDER),
        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
        pow: (num, power) => FpPow(f, num, power),
        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
        // Same as above, but doesn't normalize
        sqrN: (num) => num * num,
        addN: (lhs, rhs) => lhs + rhs,
        subN: (lhs, rhs) => lhs - rhs,
        mulN: (lhs, rhs) => lhs * rhs,
        inv: (num) => invert(num, ORDER),
        sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
        invertBatch: (lst) => FpInvertBatch(f, lst),
        // TODO: do we really need constant cmov?
        // We don't have const-time bigints anyway, so probably will be not very useful
        cmov: (a, b, c) => (c ? b : a),
        toBytes: (num) => (isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
        fromBytes: (bytes) => {
            if (bytes.length !== BYTES)
                throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes.length}`);
            return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        },
    });
    return Object.freeze(f);
}
function FpSqrtOdd(Fp, elm) {
    if (!Fp.isOdd)
        throw new Error(`Field doesn't have isOdd`);
    const root = Fp.sqrt(elm);
    return Fp.isOdd(root) ? root : Fp.neg(root);
}
function FpSqrtEven(Fp, elm) {
    if (!Fp.isOdd)
        throw new Error(`Field doesn't have isOdd`);
    const root = Fp.sqrt(elm);
    return Fp.isOdd(root) ? Fp.neg(root) : root;
}
/**
 * FIPS 186 B.4.1-compliant "constant-time" private key generation utility.
 * Can take (n+8) or more bytes of uniform input e.g. from CSPRNG or KDF
 * and convert them into private scalar, with the modulo bias being neglible.
 * Needs at least 40 bytes of input for 32-byte private key.
 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
 * @param hash hash output from SHA3 or a similar function
 * @returns valid private scalar
 */
function hashToPrivateScalar(hash, groupOrder, isLE = false) {
    hash = ensureBytes('privateHash', hash);
    const hashLen = hash.length;
    const minLen = nLength(groupOrder).nByteLength + 8;
    if (minLen < 24 || hashLen < minLen || hashLen > 1024)
        throw new Error(`hashToPrivateScalar: expected ${minLen}-1024 bytes of input, got ${hashLen}`);
    const num = isLE ? bytesToNumberLE(hash) : bytesToNumberBE(hash);
    return mod(num, groupOrder - modular_1n) + modular_1n;
}
//# sourceMappingURL=modular.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/abstract/curve.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Abelian group utilities


const curve_0n = BigInt(0);
const curve_1n = BigInt(1);
// Elliptic curve multiplication of Point by scalar. Fragile.
// Scalars should always be less than curve order: this should be checked inside of a curve itself.
// Creates precomputation tables for fast multiplication:
// - private scalar is split by fixed size windows of W bits
// - every window point is collected from window's table & added to accumulator
// - since windows are different, same point inside tables won't be accessed more than once per calc
// - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
// - +1 window is neccessary for wNAF
// - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
// TODO: Research returning 2d JS array of windows, instead of a single window. This would allow
// windows to be in different memory locations
function wNAF(c, bits) {
    const constTimeNegate = (condition, item) => {
        const neg = item.negate();
        return condition ? neg : item;
    };
    const opts = (W) => {
        const windows = Math.ceil(bits / W) + 1; // +1, because
        const windowSize = 2 ** (W - 1); // -1 because we skip zero
        return { windows, windowSize };
    };
    return {
        constTimeNegate,
        // non-const time multiplication ladder
        unsafeLadder(elm, n) {
            let p = c.ZERO;
            let d = elm;
            while (n > curve_0n) {
                if (n & curve_1n)
                    p = p.add(d);
                d = d.double();
                n >>= curve_1n;
            }
            return p;
        },
        /**
         * Creates a wNAF precomputation window. Used for caching.
         * Default window size is set by `utils.precompute()` and is equal to 8.
         * Number of precomputed points depends on the curve size:
         * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
         * - 𝑊 is the window size
         * - 𝑛 is the bitlength of the curve order.
         * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
         * @returns precomputed point tables flattened to a single array
         */
        precomputeWindow(elm, W) {
            const { windows, windowSize } = opts(W);
            const points = [];
            let p = elm;
            let base = p;
            for (let window = 0; window < windows; window++) {
                base = p;
                points.push(base);
                // =1, because we skip zero
                for (let i = 1; i < windowSize; i++) {
                    base = base.add(p);
                    points.push(base);
                }
                p = base.double();
            }
            return points;
        },
        /**
         * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
         * @param W window size
         * @param precomputes precomputed tables
         * @param n scalar (we don't check here, but should be less than curve order)
         * @returns real and fake (for const-time) points
         */
        wNAF(W, precomputes, n) {
            // TODO: maybe check that scalar is less than group order? wNAF behavious is undefined otherwise
            // But need to carefully remove other checks before wNAF. ORDER == bits here
            const { windows, windowSize } = opts(W);
            let p = c.ZERO;
            let f = c.BASE;
            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
            const maxNumber = 2 ** W;
            const shiftBy = BigInt(W);
            for (let window = 0; window < windows; window++) {
                const offset = window * windowSize;
                // Extract W bits.
                let wbits = Number(n & mask);
                // Shift number by W bits.
                n >>= shiftBy;
                // If the bits are bigger than max size, we'll split those.
                // +224 => 256 - 32
                if (wbits > windowSize) {
                    wbits -= maxNumber;
                    n += curve_1n;
                }
                // This code was first written with assumption that 'f' and 'p' will never be infinity point:
                // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
                // there is negate now: it is possible that negated element from low value
                // would be the same as high element, which will create carry into next window.
                // It's not obvious how this can fail, but still worth investigating later.
                // Check if we're onto Zero point.
                // Add random point inside current window to f.
                const offset1 = offset;
                const offset2 = offset + Math.abs(wbits) - 1; // -1 because we skip zero
                const cond1 = window % 2 !== 0;
                const cond2 = wbits < 0;
                if (wbits === 0) {
                    // The most important part for const-time getPublicKey
                    f = f.add(constTimeNegate(cond1, precomputes[offset1]));
                }
                else {
                    p = p.add(constTimeNegate(cond2, precomputes[offset2]));
                }
            }
            // JIT-compiler should not eliminate f here, since it will later be used in normalizeZ()
            // Even if the variable is still unused, there are some checks which will
            // throw an exception, so compiler needs to prove they won't happen, which is hard.
            // At this point there is a way to F be infinity-point even if p is not,
            // which makes it less const-time: around 1 bigint multiply.
            return { p, f };
        },
        wNAFCached(P, precomputesMap, n, transform) {
            // @ts-ignore
            const W = P._WINDOW_SIZE || 1;
            // Calculate precomputes on a first run, reuse them after
            let comp = precomputesMap.get(P);
            if (!comp) {
                comp = this.precomputeWindow(P, W);
                if (W !== 1) {
                    precomputesMap.set(P, transform(comp));
                }
            }
            return this.wNAF(W, comp, n);
        },
    };
}
function validateBasic(curve) {
    validateField(curve.Fp);
    validateObject(curve, {
        n: 'bigint',
        h: 'bigint',
        Gx: 'field',
        Gy: 'field',
    }, {
        nBitLength: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
    });
    // Set defaults
    return Object.freeze({
        ...nLength(curve.n, curve.nBitLength),
        ...curve,
        ...{ p: curve.Fp.ORDER },
    });
}
//# sourceMappingURL=curve.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/abstract/weierstrass.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Short Weierstrass curve. The formula is: y² = x³ + ax + b




function validatePointOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
        a: 'field',
        b: 'field',
    }, {
        allowedPrivateKeyLengths: 'array',
        wrapPrivateKey: 'boolean',
        isTorsionFree: 'function',
        clearCofactor: 'function',
        allowInfinityPoint: 'boolean',
        fromBytes: 'function',
        toBytes: 'function',
    });
    const { endo, Fp, a } = opts;
    if (endo) {
        if (!Fp.eql(a, Fp.ZERO)) {
            throw new Error('Endomorphism can only be defined for Koblitz curves that have a=0');
        }
        if (typeof endo !== 'object' ||
            typeof endo.beta !== 'bigint' ||
            typeof endo.splitScalar !== 'function') {
            throw new Error('Expected endomorphism with beta: bigint and splitScalar: function');
        }
    }
    return Object.freeze({ ...opts });
}
// ASN.1 DER encoding utilities
const { bytesToNumberBE: b2n, hexToBytes: h2b } = abstract_utils_namespaceObject;
const DER = {
    // asn.1 DER encoding utils
    Err: class DERErr extends Error {
        constructor(m = '') {
            super(m);
        }
    },
    _parseInt(data) {
        const { Err: E } = DER;
        if (data.length < 2 || data[0] !== 0x02)
            throw new E('Invalid signature integer tag');
        const len = data[1];
        const res = data.subarray(2, len + 2);
        if (!len || res.length !== len)
            throw new E('Invalid signature integer: wrong length');
        // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
        // since we always use positive integers here. It must always be empty:
        // - add zero byte if exists
        // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
        if (res[0] & 0b10000000)
            throw new E('Invalid signature integer: negative');
        if (res[0] === 0x00 && !(res[1] & 0b10000000))
            throw new E('Invalid signature integer: unnecessary leading zero');
        return { d: b2n(res), l: data.subarray(len + 2) }; // d is data, l is left
    },
    toSig(hex) {
        // parse DER signature
        const { Err: E } = DER;
        const data = typeof hex === 'string' ? h2b(hex) : hex;
        if (!(data instanceof Uint8Array))
            throw new Error('ui8a expected');
        let l = data.length;
        if (l < 2 || data[0] != 0x30)
            throw new E('Invalid signature tag');
        if (data[1] !== l - 2)
            throw new E('Invalid signature: incorrect length');
        const { d: r, l: sBytes } = DER._parseInt(data.subarray(2));
        const { d: s, l: rBytesLeft } = DER._parseInt(sBytes);
        if (rBytesLeft.length)
            throw new E('Invalid signature: left bytes after parsing');
        return { r, s };
    },
    hexFromSig(sig) {
        // Add leading zero if first byte has negative bit enabled. More details in '_parseInt'
        const slice = (s) => (Number.parseInt(s[0], 16) & 0b1000 ? '00' + s : s);
        const h = (num) => {
            const hex = num.toString(16);
            return hex.length & 1 ? `0${hex}` : hex;
        };
        const s = slice(h(sig.s));
        const r = slice(h(sig.r));
        const shl = s.length / 2;
        const rhl = r.length / 2;
        const sl = h(shl);
        const rl = h(rhl);
        return `30${h(rhl + shl + 4)}02${rl}${r}02${sl}${s}`;
    },
};
// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const weierstrass_0n = BigInt(0), weierstrass_1n = BigInt(1), weierstrass_2n = BigInt(2), weierstrass_3n = BigInt(3), weierstrass_4n = BigInt(4);
function weierstrassPoints(opts) {
    const CURVE = validatePointOpts(opts);
    const { Fp } = CURVE; // All curves has same field / group length as for now, but they can differ
    const toBytes = CURVE.toBytes ||
        ((c, point, isCompressed) => {
            const a = point.toAffine();
            return utils_concatBytes(Uint8Array.from([0x04]), Fp.toBytes(a.x), Fp.toBytes(a.y));
        });
    const fromBytes = CURVE.fromBytes ||
        ((bytes) => {
            // const head = bytes[0];
            const tail = bytes.subarray(1);
            // if (head !== 0x04) throw new Error('Only non-compressed encoding is supported');
            const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
            const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
            return { x, y };
        });
    /**
     * y² = x³ + ax + b: Short weierstrass curve formula
     * @returns y²
     */
    function weierstrassEquation(x) {
        const { a, b } = CURVE;
        const x2 = Fp.sqr(x); // x * x
        const x3 = Fp.mul(x2, x); // x2 * x
        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x3 + a * x + b
    }
    // Validate whether the passed curve params are valid.
    // We check if curve equation works for generator point.
    // `assertValidity()` won't work: `isTorsionFree()` is not available at this point in bls12-381.
    // ProjectivePoint class has not been initialized yet.
    if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
        throw new Error('bad generator point: equation left != right');
    // Valid group elements reside in range 1..n-1
    function isWithinCurveOrder(num) {
        return typeof num === 'bigint' && weierstrass_0n < num && num < CURVE.n;
    }
    function assertGE(num) {
        if (!isWithinCurveOrder(num))
            throw new Error('Expected valid bigint: 0 < bigint < curve.n');
    }
    // Validates if priv key is valid and converts it to bigint.
    // Supports options allowedPrivateKeyLengths and wrapPrivateKey.
    function normPrivateKeyToScalar(key) {
        const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n } = CURVE;
        if (lengths && typeof key !== 'bigint') {
            if (key instanceof Uint8Array)
                key = utils_bytesToHex(key);
            // Normalize to hex string, pad. E.g. P521 would norm 130-132 char hex to 132-char bytes
            if (typeof key !== 'string' || !lengths.includes(key.length))
                throw new Error('Invalid key');
            key = key.padStart(nByteLength * 2, '0');
        }
        let num;
        try {
            num =
                typeof key === 'bigint'
                    ? key
                    : bytesToNumberBE(ensureBytes('private key', key, nByteLength));
        }
        catch (error) {
            throw new Error(`private key must be ${nByteLength} bytes, hex or bigint, not ${typeof key}`);
        }
        if (wrapPrivateKey)
            num = mod(num, n); // disabled by default, enabled for BLS
        assertGE(num); // num in range [1..N-1]
        return num;
    }
    const pointPrecomputes = new Map();
    function assertPrjPoint(other) {
        if (!(other instanceof Point))
            throw new Error('ProjectivePoint expected');
    }
    /**
     * Projective Point works in 3d / projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
     * Default Point works in 2d / affine coordinates: (x, y)
     * We're doing calculations in projective, because its operations don't require costly inversion.
     */
    class Point {
        constructor(px, py, pz) {
            this.px = px;
            this.py = py;
            this.pz = pz;
            if (px == null || !Fp.isValid(px))
                throw new Error('x required');
            if (py == null || !Fp.isValid(py))
                throw new Error('y required');
            if (pz == null || !Fp.isValid(pz))
                throw new Error('z required');
        }
        // Does not validate if the point is on-curve.
        // Use fromHex instead, or call assertValidity() later.
        static fromAffine(p) {
            const { x, y } = p || {};
            if (!p || !Fp.isValid(x) || !Fp.isValid(y))
                throw new Error('invalid affine point');
            if (p instanceof Point)
                throw new Error('projective point not allowed');
            const is0 = (i) => Fp.eql(i, Fp.ZERO);
            // fromAffine(x:0, y:0) would produce (x:0, y:0, z:1), but we need (x:0, y:1, z:0)
            if (is0(x) && is0(y))
                return Point.ZERO;
            return new Point(x, y, Fp.ONE);
        }
        get x() {
            return this.toAffine().x;
        }
        get y() {
            return this.toAffine().y;
        }
        /**
         * Takes a bunch of Projective Points but executes only one
         * inversion on all of them. Inversion is very slow operation,
         * so this improves performance massively.
         * Optimization: converts a list of projective points to a list of identical points with Z=1.
         */
        static normalizeZ(points) {
            const toInv = Fp.invertBatch(points.map((p) => p.pz));
            return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
        }
        /**
         * Converts hash string or Uint8Array to Point.
         * @param hex short/long ECDSA hex
         */
        static fromHex(hex) {
            const P = Point.fromAffine(fromBytes(ensureBytes('pointHex', hex)));
            P.assertValidity();
            return P;
        }
        // Multiplies generator point by privateKey.
        static fromPrivateKey(privateKey) {
            return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
        }
        // "Private method", don't use it directly
        _setWindowSize(windowSize) {
            this._WINDOW_SIZE = windowSize;
            pointPrecomputes.delete(this);
        }
        // A point on curve is valid if it conforms to equation.
        assertValidity() {
            // Zero is valid point too!
            if (this.is0()) {
                if (CURVE.allowInfinityPoint)
                    return;
                throw new Error('bad point: ZERO');
            }
            // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
            const { x, y } = this.toAffine();
            // Check if x, y are valid field elements
            if (!Fp.isValid(x) || !Fp.isValid(y))
                throw new Error('bad point: x or y not FE');
            const left = Fp.sqr(y); // y²
            const right = weierstrassEquation(x); // x³ + ax + b
            if (!Fp.eql(left, right))
                throw new Error('bad point: equation left != right');
            if (!this.isTorsionFree())
                throw new Error('bad point: not in prime-order subgroup');
        }
        hasEvenY() {
            const { y } = this.toAffine();
            if (Fp.isOdd)
                return !Fp.isOdd(y);
            throw new Error("Field doesn't support isOdd");
        }
        /**
         * Compare one point to another.
         */
        equals(other) {
            assertPrjPoint(other);
            const { px: X1, py: Y1, pz: Z1 } = this;
            const { px: X2, py: Y2, pz: Z2 } = other;
            const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
            const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
            return U1 && U2;
        }
        /**
         * Flips point to one corresponding to (x, -y) in Affine coordinates.
         */
        negate() {
            return new Point(this.px, Fp.neg(this.py), this.pz);
        }
        // Renes-Costello-Batina exception-free doubling formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 3
        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
        double() {
            const { a, b } = CURVE;
            const b3 = Fp.mul(b, weierstrass_3n);
            const { px: X1, py: Y1, pz: Z1 } = this;
            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
            let t0 = Fp.mul(X1, X1); // step 1
            let t1 = Fp.mul(Y1, Y1);
            let t2 = Fp.mul(Z1, Z1);
            let t3 = Fp.mul(X1, Y1);
            t3 = Fp.add(t3, t3); // step 5
            Z3 = Fp.mul(X1, Z1);
            Z3 = Fp.add(Z3, Z3);
            X3 = Fp.mul(a, Z3);
            Y3 = Fp.mul(b3, t2);
            Y3 = Fp.add(X3, Y3); // step 10
            X3 = Fp.sub(t1, Y3);
            Y3 = Fp.add(t1, Y3);
            Y3 = Fp.mul(X3, Y3);
            X3 = Fp.mul(t3, X3);
            Z3 = Fp.mul(b3, Z3); // step 15
            t2 = Fp.mul(a, t2);
            t3 = Fp.sub(t0, t2);
            t3 = Fp.mul(a, t3);
            t3 = Fp.add(t3, Z3);
            Z3 = Fp.add(t0, t0); // step 20
            t0 = Fp.add(Z3, t0);
            t0 = Fp.add(t0, t2);
            t0 = Fp.mul(t0, t3);
            Y3 = Fp.add(Y3, t0);
            t2 = Fp.mul(Y1, Z1); // step 25
            t2 = Fp.add(t2, t2);
            t0 = Fp.mul(t2, t3);
            X3 = Fp.sub(X3, t0);
            Z3 = Fp.mul(t2, t1);
            Z3 = Fp.add(Z3, Z3); // step 30
            Z3 = Fp.add(Z3, Z3);
            return new Point(X3, Y3, Z3);
        }
        // Renes-Costello-Batina exception-free addition formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 1
        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
        add(other) {
            assertPrjPoint(other);
            const { px: X1, py: Y1, pz: Z1 } = this;
            const { px: X2, py: Y2, pz: Z2 } = other;
            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
            const a = CURVE.a;
            const b3 = Fp.mul(CURVE.b, weierstrass_3n);
            let t0 = Fp.mul(X1, X2); // step 1
            let t1 = Fp.mul(Y1, Y2);
            let t2 = Fp.mul(Z1, Z2);
            let t3 = Fp.add(X1, Y1);
            let t4 = Fp.add(X2, Y2); // step 5
            t3 = Fp.mul(t3, t4);
            t4 = Fp.add(t0, t1);
            t3 = Fp.sub(t3, t4);
            t4 = Fp.add(X1, Z1);
            let t5 = Fp.add(X2, Z2); // step 10
            t4 = Fp.mul(t4, t5);
            t5 = Fp.add(t0, t2);
            t4 = Fp.sub(t4, t5);
            t5 = Fp.add(Y1, Z1);
            X3 = Fp.add(Y2, Z2); // step 15
            t5 = Fp.mul(t5, X3);
            X3 = Fp.add(t1, t2);
            t5 = Fp.sub(t5, X3);
            Z3 = Fp.mul(a, t4);
            X3 = Fp.mul(b3, t2); // step 20
            Z3 = Fp.add(X3, Z3);
            X3 = Fp.sub(t1, Z3);
            Z3 = Fp.add(t1, Z3);
            Y3 = Fp.mul(X3, Z3);
            t1 = Fp.add(t0, t0); // step 25
            t1 = Fp.add(t1, t0);
            t2 = Fp.mul(a, t2);
            t4 = Fp.mul(b3, t4);
            t1 = Fp.add(t1, t2);
            t2 = Fp.sub(t0, t2); // step 30
            t2 = Fp.mul(a, t2);
            t4 = Fp.add(t4, t2);
            t0 = Fp.mul(t1, t4);
            Y3 = Fp.add(Y3, t0);
            t0 = Fp.mul(t5, t4); // step 35
            X3 = Fp.mul(t3, X3);
            X3 = Fp.sub(X3, t0);
            t0 = Fp.mul(t3, t1);
            Z3 = Fp.mul(t5, Z3);
            Z3 = Fp.add(Z3, t0); // step 40
            return new Point(X3, Y3, Z3);
        }
        subtract(other) {
            return this.add(other.negate());
        }
        is0() {
            return this.equals(Point.ZERO);
        }
        wNAF(n) {
            return wnaf.wNAFCached(this, pointPrecomputes, n, (comp) => {
                const toInv = Fp.invertBatch(comp.map((p) => p.pz));
                return comp.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
            });
        }
        /**
         * Non-constant-time multiplication. Uses double-and-add algorithm.
         * It's faster, but should only be used when you don't care about
         * an exposed private key e.g. sig verification, which works over *public* keys.
         */
        multiplyUnsafe(n) {
            const I = Point.ZERO;
            if (n === weierstrass_0n)
                return I;
            assertGE(n); // Will throw on 0
            if (n === weierstrass_1n)
                return this;
            const { endo } = CURVE;
            if (!endo)
                return wnaf.unsafeLadder(this, n);
            // Apply endomorphism
            let { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
            let k1p = I;
            let k2p = I;
            let d = this;
            while (k1 > weierstrass_0n || k2 > weierstrass_0n) {
                if (k1 & weierstrass_1n)
                    k1p = k1p.add(d);
                if (k2 & weierstrass_1n)
                    k2p = k2p.add(d);
                d = d.double();
                k1 >>= weierstrass_1n;
                k2 >>= weierstrass_1n;
            }
            if (k1neg)
                k1p = k1p.negate();
            if (k2neg)
                k2p = k2p.negate();
            k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
            return k1p.add(k2p);
        }
        /**
         * Constant time multiplication.
         * Uses wNAF method. Windowed method may be 10% faster,
         * but takes 2x longer to generate and consumes 2x memory.
         * Uses precomputes when available.
         * Uses endomorphism for Koblitz curves.
         * @param scalar by which the point would be multiplied
         * @returns New point
         */
        multiply(scalar) {
            assertGE(scalar);
            let n = scalar;
            let point, fake; // Fake point is used to const-time mult
            const { endo } = CURVE;
            if (endo) {
                const { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
                let { p: k1p, f: f1p } = this.wNAF(k1);
                let { p: k2p, f: f2p } = this.wNAF(k2);
                k1p = wnaf.constTimeNegate(k1neg, k1p);
                k2p = wnaf.constTimeNegate(k2neg, k2p);
                k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
                point = k1p.add(k2p);
                fake = f1p.add(f2p);
            }
            else {
                const { p, f } = this.wNAF(n);
                point = p;
                fake = f;
            }
            // Normalize `z` for both points, but return only real one
            return Point.normalizeZ([point, fake])[0];
        }
        /**
         * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
         * Not using Strauss-Shamir trick: precomputation tables are faster.
         * The trick could be useful if both P and Q are not G (not in our case).
         * @returns non-zero affine point
         */
        multiplyAndAddUnsafe(Q, a, b) {
            const G = Point.BASE; // No Strauss-Shamir trick: we have 10% faster G precomputes
            const mul = (P, a // Select faster multiply() method
            ) => (a === weierstrass_0n || a === weierstrass_1n || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a));
            const sum = mul(this, a).add(mul(Q, b));
            return sum.is0() ? undefined : sum;
        }
        // Converts Projective point to affine (x, y) coordinates.
        // Can accept precomputed Z^-1 - for example, from invertBatch.
        // (x, y, z) ∋ (x=x/z, y=y/z)
        toAffine(iz) {
            const { px: x, py: y, pz: z } = this;
            const is0 = this.is0();
            // If invZ was 0, we return zero point. However we still want to execute
            // all operations, so we replace invZ with a random number, 1.
            if (iz == null)
                iz = is0 ? Fp.ONE : Fp.inv(z);
            const ax = Fp.mul(x, iz);
            const ay = Fp.mul(y, iz);
            const zz = Fp.mul(z, iz);
            if (is0)
                return { x: Fp.ZERO, y: Fp.ZERO };
            if (!Fp.eql(zz, Fp.ONE))
                throw new Error('invZ was invalid');
            return { x: ax, y: ay };
        }
        isTorsionFree() {
            const { h: cofactor, isTorsionFree } = CURVE;
            if (cofactor === weierstrass_1n)
                return true; // No subgroups, always torsion-free
            if (isTorsionFree)
                return isTorsionFree(Point, this);
            throw new Error('isTorsionFree() has not been declared for the elliptic curve');
        }
        clearCofactor() {
            const { h: cofactor, clearCofactor } = CURVE;
            if (cofactor === weierstrass_1n)
                return this; // Fast-path
            if (clearCofactor)
                return clearCofactor(Point, this);
            return this.multiplyUnsafe(CURVE.h);
        }
        toRawBytes(isCompressed = true) {
            this.assertValidity();
            return toBytes(Point, this, isCompressed);
        }
        toHex(isCompressed = true) {
            return utils_bytesToHex(this.toRawBytes(isCompressed));
        }
    }
    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
    Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
    const _bits = CURVE.nBitLength;
    const wnaf = wNAF(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
    // Validate if generator point is on curve
    return {
        CURVE,
        ProjectivePoint: Point,
        normPrivateKeyToScalar,
        weierstrassEquation,
        isWithinCurveOrder,
    };
}
function validateOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
        hash: 'hash',
        hmac: 'function',
        randomBytes: 'function',
    }, {
        bits2int: 'function',
        bits2int_modN: 'function',
        lowS: 'boolean',
    });
    return Object.freeze({ lowS: true, ...opts });
}
function weierstrass(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { Fp, n: CURVE_ORDER } = CURVE;
    const compressedLen = Fp.BYTES + 1; // e.g. 33 for 32
    const uncompressedLen = 2 * Fp.BYTES + 1; // e.g. 65 for 32
    function isValidFieldElement(num) {
        return weierstrass_0n < num && num < Fp.ORDER; // 0 is banned since it's not invertible FE
    }
    function modN(a) {
        return mod(a, CURVE_ORDER);
    }
    function invN(a) {
        return invert(a, CURVE_ORDER);
    }
    const { ProjectivePoint: Point, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder, } = weierstrassPoints({
        ...CURVE,
        toBytes(c, point, isCompressed) {
            const a = point.toAffine();
            const x = Fp.toBytes(a.x);
            const cat = utils_concatBytes;
            if (isCompressed) {
                return cat(Uint8Array.from([point.hasEvenY() ? 0x02 : 0x03]), x);
            }
            else {
                return cat(Uint8Array.from([0x04]), x, Fp.toBytes(a.y));
            }
        },
        fromBytes(bytes) {
            const len = bytes.length;
            const head = bytes[0];
            const tail = bytes.subarray(1);
            // this.assertValidity() is done inside of fromHex
            if (len === compressedLen && (head === 0x02 || head === 0x03)) {
                const x = bytesToNumberBE(tail);
                if (!isValidFieldElement(x))
                    throw new Error('Point is not on curve');
                const y2 = weierstrassEquation(x); // y² = x³ + ax + b
                let y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
                const isYOdd = (y & weierstrass_1n) === weierstrass_1n;
                // ECDSA
                const isHeadOdd = (head & 1) === 1;
                if (isHeadOdd !== isYOdd)
                    y = Fp.neg(y);
                return { x, y };
            }
            else if (len === uncompressedLen && head === 0x04) {
                const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
                const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
                return { x, y };
            }
            else {
                throw new Error(`Point of length ${len} was invalid. Expected ${compressedLen} compressed bytes or ${uncompressedLen} uncompressed bytes`);
            }
        },
    });
    const numToNByteStr = (num) => utils_bytesToHex(numberToBytesBE(num, CURVE.nByteLength));
    function isBiggerThanHalfOrder(number) {
        const HALF = CURVE_ORDER >> weierstrass_1n;
        return number > HALF;
    }
    function normalizeS(s) {
        return isBiggerThanHalfOrder(s) ? modN(-s) : s;
    }
    // slice bytes num
    const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
    /**
     * ECDSA signature with its (r, s) properties. Supports DER & compact representations.
     */
    class Signature {
        constructor(r, s, recovery) {
            this.r = r;
            this.s = s;
            this.recovery = recovery;
            this.assertValidity();
        }
        // pair (bytes of r, bytes of s)
        static fromCompact(hex) {
            const l = CURVE.nByteLength;
            hex = ensureBytes('compactSignature', hex, l * 2);
            return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
        }
        // DER encoded ECDSA signature
        // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
        static fromDER(hex) {
            const { r, s } = DER.toSig(ensureBytes('DER', hex));
            return new Signature(r, s);
        }
        assertValidity() {
            // can use assertGE here
            if (!isWithinCurveOrder(this.r))
                throw new Error('r must be 0 < r < CURVE.n');
            if (!isWithinCurveOrder(this.s))
                throw new Error('s must be 0 < s < CURVE.n');
        }
        addRecoveryBit(recovery) {
            return new Signature(this.r, this.s, recovery);
        }
        recoverPublicKey(msgHash) {
            const { r, s, recovery: rec } = this;
            const h = bits2int_modN(ensureBytes('msgHash', msgHash)); // Truncate hash
            if (rec == null || ![0, 1, 2, 3].includes(rec))
                throw new Error('recovery id invalid');
            const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
            if (radj >= Fp.ORDER)
                throw new Error('recovery id 2 or 3 invalid');
            const prefix = (rec & 1) === 0 ? '02' : '03';
            const R = Point.fromHex(prefix + numToNByteStr(radj));
            const ir = invN(radj); // r^-1
            const u1 = modN(-h * ir); // -hr^-1
            const u2 = modN(s * ir); // sr^-1
            const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2); // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1)
            if (!Q)
                throw new Error('point at infinify'); // unsafe is fine: no priv data leaked
            Q.assertValidity();
            return Q;
        }
        // Signatures should be low-s, to prevent malleability.
        hasHighS() {
            return isBiggerThanHalfOrder(this.s);
        }
        normalizeS() {
            return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
        }
        // DER-encoded
        toDERRawBytes() {
            return utils_hexToBytes(this.toDERHex());
        }
        toDERHex() {
            return DER.hexFromSig({ r: this.r, s: this.s });
        }
        // padded bytes of r, then padded bytes of s
        toCompactRawBytes() {
            return utils_hexToBytes(this.toCompactHex());
        }
        toCompactHex() {
            return numToNByteStr(this.r) + numToNByteStr(this.s);
        }
    }
    const utils = {
        isValidPrivateKey(privateKey) {
            try {
                normPrivateKeyToScalar(privateKey);
                return true;
            }
            catch (error) {
                return false;
            }
        },
        normPrivateKeyToScalar: normPrivateKeyToScalar,
        /**
         * Produces cryptographically secure private key from random of size (nBitLength+64)
         * as per FIPS 186 B.4.1 with modulo bias being neglible.
         */
        randomPrivateKey: () => {
            const rand = CURVE.randomBytes(Fp.BYTES + 8);
            const num = hashToPrivateScalar(rand, CURVE_ORDER);
            return numberToBytesBE(num, CURVE.nByteLength);
        },
        /**
         * Creates precompute table for an arbitrary EC point. Makes point "cached".
         * Allows to massively speed-up `point.multiply(scalar)`.
         * @returns cached point
         * @example
         * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
         * fast.multiply(privKey); // much faster ECDH now
         */
        precompute(windowSize = 8, point = Point.BASE) {
            point._setWindowSize(windowSize);
            point.multiply(BigInt(3)); // 3 is arbitrary, just need any number here
            return point;
        },
    };
    /**
     * Computes public key for a private key. Checks for validity of the private key.
     * @param privateKey private key
     * @param isCompressed whether to return compact (default), or full key
     * @returns Public key, full when isCompressed=false; short when isCompressed=true
     */
    function getPublicKey(privateKey, isCompressed = true) {
        return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
    }
    /**
     * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
     */
    function isProbPub(item) {
        const arr = item instanceof Uint8Array;
        const str = typeof item === 'string';
        const len = (arr || str) && item.length;
        if (arr)
            return len === compressedLen || len === uncompressedLen;
        if (str)
            return len === 2 * compressedLen || len === 2 * uncompressedLen;
        if (item instanceof Point)
            return true;
        return false;
    }
    /**
     * ECDH (Elliptic Curve Diffie Hellman).
     * Computes shared public key from private key and public key.
     * Checks: 1) private key validity 2) shared key is on-curve.
     * Does NOT hash the result.
     * @param privateA private key
     * @param publicB different public key
     * @param isCompressed whether to return compact (default), or full key
     * @returns shared public key
     */
    function getSharedSecret(privateA, publicB, isCompressed = true) {
        if (isProbPub(privateA))
            throw new Error('first arg must be private key');
        if (!isProbPub(publicB))
            throw new Error('second arg must be public key');
        const b = Point.fromHex(publicB); // check for being on-curve
        return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
    }
    // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
    // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
    // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
    // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
    const bits2int = CURVE.bits2int ||
        function (bytes) {
            // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
            // for some cases, since bytes.length * 8 is not actual bitLength.
            const num = bytesToNumberBE(bytes); // check for == u8 done here
            const delta = bytes.length * 8 - CURVE.nBitLength; // truncate to nBitLength leftmost bits
            return delta > 0 ? num >> BigInt(delta) : num;
        };
    const bits2int_modN = CURVE.bits2int_modN ||
        function (bytes) {
            return modN(bits2int(bytes)); // can't use bytesToNumberBE here
        };
    // NOTE: pads output with zero as per spec
    const ORDER_MASK = bitMask(CURVE.nBitLength);
    /**
     * Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
     */
    function int2octets(num) {
        if (typeof num !== 'bigint')
            throw new Error('bigint expected');
        if (!(weierstrass_0n <= num && num < ORDER_MASK))
            throw new Error(`bigint expected < 2^${CURVE.nBitLength}`);
        // works with order, can have different size than numToField!
        return numberToBytesBE(num, CURVE.nByteLength);
    }
    // Steps A, D of RFC6979 3.2
    // Creates RFC6979 seed; converts msg/privKey to numbers.
    // Used only in sign, not in verify.
    // NOTE: we cannot assume here that msgHash has same amount of bytes as curve order, this will be wrong at least for P521.
    // Also it can be bigger for P224 + SHA256
    function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
        if (['recovered', 'canonical'].some((k) => k in opts))
            throw new Error('sign() legacy options not supported');
        const { hash, randomBytes } = CURVE;
        let { lowS, prehash, extraEntropy: ent } = opts; // generates low-s sigs by default
        if (lowS == null)
            lowS = true; // RFC6979 3.2: we skip step A, because we already provide hash
        msgHash = ensureBytes('msgHash', msgHash);
        if (prehash)
            msgHash = ensureBytes('prehashed msgHash', hash(msgHash));
        // We can't later call bits2octets, since nested bits2int is broken for curves
        // with nBitLength % 8 !== 0. Because of that, we unwrap it here as int2octets call.
        // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
        const h1int = bits2int_modN(msgHash);
        const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
        const seedArgs = [int2octets(d), int2octets(h1int)];
        // extraEntropy. RFC6979 3.6: additional k' (optional).
        if (ent != null) {
            // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
            const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
            seedArgs.push(ensureBytes('extraEntropy', e, Fp.BYTES)); // check for being of size BYTES
        }
        const seed = utils_concatBytes(...seedArgs); // Step D of RFC6979 3.2
        const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
        // Converts signature params into point w r/s, checks result for validity.
        function k2sig(kBytes) {
            // RFC 6979 Section 3.2, step 3: k = bits2int(T)
            const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
            if (!isWithinCurveOrder(k))
                return; // Important: all mod() calls here must be done over N
            const ik = invN(k); // k^-1 mod n
            const q = Point.BASE.multiply(k).toAffine(); // q = Gk
            const r = modN(q.x); // r = q.x mod n
            if (r === weierstrass_0n)
                return;
            // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
            // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
            // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
            const s = modN(ik * modN(m + r * d)); // Not using blinding here
            if (s === weierstrass_0n)
                return;
            let recovery = (q.x === r ? 0 : 2) | Number(q.y & weierstrass_1n); // recovery bit (2 or 3, when q.x > n)
            let normS = s;
            if (lowS && isBiggerThanHalfOrder(s)) {
                normS = normalizeS(s); // if lowS was passed, ensure s is always
                recovery ^= 1; // // in the bottom half of N
            }
            return new Signature(r, normS, recovery); // use normS, not s
        }
        return { seed, k2sig };
    }
    const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
    const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
    /**
     * Signs message hash (not message: you need to hash it by yourself).
     * ```
     * sign(m, d, k) where
     *   (x, y) = G × k
     *   r = x mod n
     *   s = (m + dr)/k mod n
     * ```
     * @param opts `lowS, extraEntropy, prehash`
     */
    function sign(msgHash, privKey, opts = defaultSigOpts) {
        const { seed, k2sig } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
        const drbg = createHmacDrbg(CURVE.hash.outputLen, CURVE.nByteLength, CURVE.hmac);
        return drbg(seed, k2sig); // Steps B, C, D, E, F, G
    }
    // Enable precomputes. Slows down first publicKey computation by 20ms.
    Point.BASE._setWindowSize(8);
    // utils.precompute(8, ProjectivePoint.BASE)
    /**
     * Verifies a signature against message hash and public key.
     * Rejects lowS signatures by default: to override,
     * specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
     *
     * ```
     * verify(r, s, h, P) where
     *   U1 = hs^-1 mod n
     *   U2 = rs^-1 mod n
     *   R = U1⋅G - U2⋅P
     *   mod(R.x, n) == r
     * ```
     */
    function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
        const sg = signature;
        msgHash = ensureBytes('msgHash', msgHash);
        publicKey = ensureBytes('publicKey', publicKey);
        if ('strict' in opts)
            throw new Error('options.strict was renamed to lowS');
        const { lowS, prehash } = opts;
        let _sig = undefined;
        let P;
        try {
            if (typeof sg === 'string' || sg instanceof Uint8Array) {
                // Signature can be represented in 2 ways: compact (2*nByteLength) & DER (variable-length).
                // Since DER can also be 2*nByteLength bytes, we check for it first.
                try {
                    _sig = Signature.fromDER(sg);
                }
                catch (derError) {
                    if (!(derError instanceof DER.Err))
                        throw derError;
                    _sig = Signature.fromCompact(sg);
                }
            }
            else if (typeof sg === 'object' && typeof sg.r === 'bigint' && typeof sg.s === 'bigint') {
                const { r, s } = sg;
                _sig = new Signature(r, s);
            }
            else {
                throw new Error('PARSE');
            }
            P = Point.fromHex(publicKey);
        }
        catch (error) {
            if (error.message === 'PARSE')
                throw new Error(`signature must be Signature instance, Uint8Array or hex string`);
            return false;
        }
        if (lowS && _sig.hasHighS())
            return false;
        if (prehash)
            msgHash = CURVE.hash(msgHash);
        const { r, s } = _sig;
        const h = bits2int_modN(msgHash); // Cannot use fields methods, since it is group element
        const is = invN(s); // s^-1
        const u1 = modN(h * is); // u1 = hs^-1 mod n
        const u2 = modN(r * is); // u2 = rs^-1 mod n
        const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine(); // R = u1⋅G + u2⋅P
        if (!R)
            return false;
        const v = modN(R.x);
        return v === r;
    }
    return {
        CURVE,
        getPublicKey,
        getSharedSecret,
        sign,
        verify,
        ProjectivePoint: Point,
        Signature,
        utils,
    };
}
// Implementation of the Shallue and van de Woestijne method for any Weierstrass curve
// TODO: check if there is a way to merge this with uvRatio in Edwards && move to modular?
// b = True and y = sqrt(u / v) if (u / v) is square in F, and
// b = False and y = sqrt(Z * (u / v)) otherwise.
function SWUFpSqrtRatio(Fp, Z) {
    // Generic implementation
    const q = Fp.ORDER;
    let l = weierstrass_0n;
    for (let o = q - weierstrass_1n; o % weierstrass_2n === weierstrass_0n; o /= weierstrass_2n)
        l += weierstrass_1n;
    const c1 = l; // 1. c1, the largest integer such that 2^c1 divides q - 1.
    const c2 = (q - weierstrass_1n) / weierstrass_2n ** c1; // 2. c2 = (q - 1) / (2^c1)        # Integer arithmetic
    const c3 = (c2 - weierstrass_1n) / weierstrass_2n; // 3. c3 = (c2 - 1) / 2            # Integer arithmetic
    const c4 = weierstrass_2n ** c1 - weierstrass_1n; // 4. c4 = 2^c1 - 1                # Integer arithmetic
    const c5 = weierstrass_2n ** (c1 - weierstrass_1n); // 5. c5 = 2^(c1 - 1)              # Integer arithmetic
    const c6 = Fp.pow(Z, c2); // 6. c6 = Z^c2
    const c7 = Fp.pow(Z, (c2 + weierstrass_1n) / weierstrass_2n); // 7. c7 = Z^((c2 + 1) / 2)
    let sqrtRatio = (u, v) => {
        let tv1 = c6; // 1. tv1 = c6
        let tv2 = Fp.pow(v, c4); // 2. tv2 = v^c4
        let tv3 = Fp.sqr(tv2); // 3. tv3 = tv2^2
        tv3 = Fp.mul(tv3, v); // 4. tv3 = tv3 * v
        let tv5 = Fp.mul(u, tv3); // 5. tv5 = u * tv3
        tv5 = Fp.pow(tv5, c3); // 6. tv5 = tv5^c3
        tv5 = Fp.mul(tv5, tv2); // 7. tv5 = tv5 * tv2
        tv2 = Fp.mul(tv5, v); // 8. tv2 = tv5 * v
        tv3 = Fp.mul(tv5, u); // 9. tv3 = tv5 * u
        let tv4 = Fp.mul(tv3, tv2); // 10. tv4 = tv3 * tv2
        tv5 = Fp.pow(tv4, c5); // 11. tv5 = tv4^c5
        let isQR = Fp.eql(tv5, Fp.ONE); // 12. isQR = tv5 == 1
        tv2 = Fp.mul(tv3, c7); // 13. tv2 = tv3 * c7
        tv5 = Fp.mul(tv4, tv1); // 14. tv5 = tv4 * tv1
        tv3 = Fp.cmov(tv2, tv3, isQR); // 15. tv3 = CMOV(tv2, tv3, isQR)
        tv4 = Fp.cmov(tv5, tv4, isQR); // 16. tv4 = CMOV(tv5, tv4, isQR)
        // 17. for i in (c1, c1 - 1, ..., 2):
        for (let i = c1; i > weierstrass_1n; i--) {
            let tv5 = weierstrass_2n ** (i - weierstrass_2n); // 18.    tv5 = i - 2;    19.    tv5 = 2^tv5
            let tvv5 = Fp.pow(tv4, tv5); // 20.    tv5 = tv4^tv5
            const e1 = Fp.eql(tvv5, Fp.ONE); // 21.    e1 = tv5 == 1
            tv2 = Fp.mul(tv3, tv1); // 22.    tv2 = tv3 * tv1
            tv1 = Fp.mul(tv1, tv1); // 23.    tv1 = tv1 * tv1
            tvv5 = Fp.mul(tv4, tv1); // 24.    tv5 = tv4 * tv1
            tv3 = Fp.cmov(tv2, tv3, e1); // 25.    tv3 = CMOV(tv2, tv3, e1)
            tv4 = Fp.cmov(tvv5, tv4, e1); // 26.    tv4 = CMOV(tv5, tv4, e1)
        }
        return { isValid: isQR, value: tv3 };
    };
    if (Fp.ORDER % weierstrass_4n === weierstrass_3n) {
        // sqrt_ratio_3mod4(u, v)
        const c1 = (Fp.ORDER - weierstrass_3n) / weierstrass_4n; // 1. c1 = (q - 3) / 4     # Integer arithmetic
        const c2 = Fp.sqrt(Fp.neg(Z)); // 2. c2 = sqrt(-Z)
        sqrtRatio = (u, v) => {
            let tv1 = Fp.sqr(v); // 1. tv1 = v^2
            const tv2 = Fp.mul(u, v); // 2. tv2 = u * v
            tv1 = Fp.mul(tv1, tv2); // 3. tv1 = tv1 * tv2
            let y1 = Fp.pow(tv1, c1); // 4. y1 = tv1^c1
            y1 = Fp.mul(y1, tv2); // 5. y1 = y1 * tv2
            const y2 = Fp.mul(y1, c2); // 6. y2 = y1 * c2
            const tv3 = Fp.mul(Fp.sqr(y1), v); // 7. tv3 = y1^2; 8. tv3 = tv3 * v
            const isQR = Fp.eql(tv3, u); // 9. isQR = tv3 == u
            let y = Fp.cmov(y2, y1, isQR); // 10. y = CMOV(y2, y1, isQR)
            return { isValid: isQR, value: y }; // 11. return (isQR, y) isQR ? y : y*c2
        };
    }
    // No curves uses that
    // if (Fp.ORDER % _8n === _5n) // sqrt_ratio_5mod8
    return sqrtRatio;
}
// From draft-irtf-cfrg-hash-to-curve-16
function mapToCurveSimpleSWU(Fp, opts) {
    validateField(Fp);
    if (!Fp.isValid(opts.A) || !Fp.isValid(opts.B) || !Fp.isValid(opts.Z))
        throw new Error('mapToCurveSimpleSWU: invalid opts');
    const sqrtRatio = SWUFpSqrtRatio(Fp, opts.Z);
    if (!Fp.isOdd)
        throw new Error('Fp.isOdd is not implemented!');
    // Input: u, an element of F.
    // Output: (x, y), a point on E.
    return (u) => {
        // prettier-ignore
        let tv1, tv2, tv3, tv4, tv5, tv6, x, y;
        tv1 = Fp.sqr(u); // 1.  tv1 = u^2
        tv1 = Fp.mul(tv1, opts.Z); // 2.  tv1 = Z * tv1
        tv2 = Fp.sqr(tv1); // 3.  tv2 = tv1^2
        tv2 = Fp.add(tv2, tv1); // 4.  tv2 = tv2 + tv1
        tv3 = Fp.add(tv2, Fp.ONE); // 5.  tv3 = tv2 + 1
        tv3 = Fp.mul(tv3, opts.B); // 6.  tv3 = B * tv3
        tv4 = Fp.cmov(opts.Z, Fp.neg(tv2), !Fp.eql(tv2, Fp.ZERO)); // 7.  tv4 = CMOV(Z, -tv2, tv2 != 0)
        tv4 = Fp.mul(tv4, opts.A); // 8.  tv4 = A * tv4
        tv2 = Fp.sqr(tv3); // 9.  tv2 = tv3^2
        tv6 = Fp.sqr(tv4); // 10. tv6 = tv4^2
        tv5 = Fp.mul(tv6, opts.A); // 11. tv5 = A * tv6
        tv2 = Fp.add(tv2, tv5); // 12. tv2 = tv2 + tv5
        tv2 = Fp.mul(tv2, tv3); // 13. tv2 = tv2 * tv3
        tv6 = Fp.mul(tv6, tv4); // 14. tv6 = tv6 * tv4
        tv5 = Fp.mul(tv6, opts.B); // 15. tv5 = B * tv6
        tv2 = Fp.add(tv2, tv5); // 16. tv2 = tv2 + tv5
        x = Fp.mul(tv1, tv3); // 17.   x = tv1 * tv3
        const { isValid, value } = sqrtRatio(tv2, tv6); // 18. (is_gx1_square, y1) = sqrt_ratio(tv2, tv6)
        y = Fp.mul(tv1, u); // 19.   y = tv1 * u  -> Z * u^3 * y1
        y = Fp.mul(y, value); // 20.   y = y * y1
        x = Fp.cmov(x, tv3, isValid); // 21.   x = CMOV(x, tv3, is_gx1_square)
        y = Fp.cmov(y, value, isValid); // 22.   y = CMOV(y, y1, is_gx1_square)
        const e1 = Fp.isOdd(u) === Fp.isOdd(y); // 23.  e1 = sgn0(u) == sgn0(y)
        y = Fp.cmov(Fp.neg(y), y, e1); // 24.   y = CMOV(-y, y, e1)
        x = Fp.div(x, tv4); // 25.   x = x / tv4
        return { x, y };
    };
}
//# sourceMappingURL=weierstrass.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/abstract/hash-to-curve.js


function validateDST(dst) {
    if (dst instanceof Uint8Array)
        return dst;
    if (typeof dst === 'string')
        return utils_utf8ToBytes(dst);
    throw new Error('DST must be Uint8Array or string');
}
// Octet Stream to Integer. "spec" implementation of os2ip is 2.5x slower vs bytesToNumberBE.
const os2ip = bytesToNumberBE;
// Integer to Octet Stream (numberToBytesBE)
function i2osp(value, length) {
    if (value < 0 || value >= 1 << (8 * length)) {
        throw new Error(`bad I2OSP call: value=${value} length=${length}`);
    }
    const res = Array.from({ length }).fill(0);
    for (let i = length - 1; i >= 0; i--) {
        res[i] = value & 0xff;
        value >>>= 8;
    }
    return new Uint8Array(res);
}
function strxor(a, b) {
    const arr = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        arr[i] = a[i] ^ b[i];
    }
    return arr;
}
function isBytes(item) {
    if (!(item instanceof Uint8Array))
        throw new Error('Uint8Array expected');
}
function isNum(item) {
    if (!Number.isSafeInteger(item))
        throw new Error('number expected');
}
// Produces a uniformly random byte string using a cryptographic hash function H that outputs b bits
// https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-11#section-5.4.1
function expand_message_xmd(msg, DST, lenInBytes, H) {
    isBytes(msg);
    isBytes(DST);
    isNum(lenInBytes);
    // https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-16#section-5.3.3
    if (DST.length > 255)
        DST = H(utils_concatBytes(utils_utf8ToBytes('H2C-OVERSIZE-DST-'), DST));
    const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
    const ell = Math.ceil(lenInBytes / b_in_bytes);
    if (ell > 255)
        throw new Error('Invalid xmd length');
    const DST_prime = utils_concatBytes(DST, i2osp(DST.length, 1));
    const Z_pad = i2osp(0, r_in_bytes);
    const l_i_b_str = i2osp(lenInBytes, 2); // len_in_bytes_str
    const b = new Array(ell);
    const b_0 = H(utils_concatBytes(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
    b[0] = H(utils_concatBytes(b_0, i2osp(1, 1), DST_prime));
    for (let i = 1; i <= ell; i++) {
        const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
        b[i] = H(utils_concatBytes(...args));
    }
    const pseudo_random_bytes = utils_concatBytes(...b);
    return pseudo_random_bytes.slice(0, lenInBytes);
}
function expand_message_xof(msg, DST, lenInBytes, k, H) {
    isBytes(msg);
    isBytes(DST);
    isNum(lenInBytes);
    // https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-16#section-5.3.3
    // DST = H('H2C-OVERSIZE-DST-' || a_very_long_DST, Math.ceil((lenInBytes * k) / 8));
    if (DST.length > 255) {
        const dkLen = Math.ceil((2 * k) / 8);
        DST = H.create({ dkLen }).update(utils_utf8ToBytes('H2C-OVERSIZE-DST-')).update(DST).digest();
    }
    if (lenInBytes > 65535 || DST.length > 255)
        throw new Error('expand_message_xof: invalid lenInBytes');
    return (H.create({ dkLen: lenInBytes })
        .update(msg)
        .update(i2osp(lenInBytes, 2))
        // 2. DST_prime = DST || I2OSP(len(DST), 1)
        .update(DST)
        .update(i2osp(DST.length, 1))
        .digest());
}
/**
 * Hashes arbitrary-length byte strings to a list of one or more elements of a finite field F
 * https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-11#section-5.3
 * @param msg a byte string containing the message to hash
 * @param count the number of elements of F to output
 * @param options `{DST: string, p: bigint, m: number, k: number, expand: 'xmd' | 'xof', hash: H}`, see above
 * @returns [u_0, ..., u_(count - 1)], a list of field elements.
 */
function hash_to_field(msg, count, options) {
    validateObject(options, {
        DST: 'string',
        p: 'bigint',
        m: 'isSafeInteger',
        k: 'isSafeInteger',
        hash: 'hash',
    });
    const { p, k, m, hash, expand, DST: _DST } = options;
    isBytes(msg);
    isNum(count);
    const DST = validateDST(_DST);
    const log2p = p.toString(2).length;
    const L = Math.ceil((log2p + k) / 8); // section 5.1 of ietf draft link above
    const len_in_bytes = count * m * L;
    let prb; // pseudo_random_bytes
    if (expand === 'xmd') {
        prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
    }
    else if (expand === 'xof') {
        prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
    }
    else if (expand === '_internal_pass') {
        // for internal tests only
        prb = msg;
    }
    else {
        throw new Error('expand must be "xmd" or "xof"');
    }
    const u = new Array(count);
    for (let i = 0; i < count; i++) {
        const e = new Array(m);
        for (let j = 0; j < m; j++) {
            const elm_offset = L * (j + i * m);
            const tv = prb.subarray(elm_offset, elm_offset + L);
            e[j] = mod(os2ip(tv), p);
        }
        u[i] = e;
    }
    return u;
}
function isogenyMap(field, map) {
    // Make same order as in spec
    const COEFF = map.map((i) => Array.from(i).reverse());
    return (x, y) => {
        const [xNum, xDen, yNum, yDen] = COEFF.map((val) => val.reduce((acc, i) => field.add(field.mul(acc, x), i)));
        x = field.div(xNum, xDen); // xNum / xDen
        y = field.mul(y, field.div(yNum, yDen)); // y * (yNum / yDev)
        return { x, y };
    };
}
function createHasher(Point, mapToCurve, def) {
    if (typeof mapToCurve !== 'function')
        throw new Error('mapToCurve() must be defined');
    return {
        // Encodes byte string to elliptic curve
        // https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-16#section-3
        hashToCurve(msg, options) {
            const u = hash_to_field(msg, 2, { ...def, DST: def.DST, ...options });
            const u0 = Point.fromAffine(mapToCurve(u[0]));
            const u1 = Point.fromAffine(mapToCurve(u[1]));
            const P = u0.add(u1).clearCofactor();
            P.assertValidity();
            return P;
        },
        // https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-hash-to-curve-16#section-3
        encodeToCurve(msg, options) {
            const u = hash_to_field(msg, 1, { ...def, DST: def.encodeDST, ...options });
            const P = Point.fromAffine(mapToCurve(u[0])).clearCofactor();
            P.assertValidity();
            return P;
        },
    };
}
//# sourceMappingURL=hash-to-curve.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/node_modules/@noble/hashes/esm/hmac.js


// HMAC (RFC 2104)
class HMAC extends Hash {
    constructor(hash, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        _assert.hash(hash);
        const key = toBytes(_key);
        this.iHash = hash.create();
        if (typeof this.iHash.update !== 'function')
            throw new TypeError('Expected instance of class which extends utils.Hash');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        _assert.exists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        _assert.exists(this);
        _assert.bytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);
//# sourceMappingURL=hmac.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/_shortw_utils.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */



// connects noble-curves to noble-hashes
function getHash(hash) {
    return {
        hash,
        hmac: (key, ...msgs) => hmac(hash, key, concatBytes(...msgs)),
        randomBytes: randomBytes,
    };
}
function createCurve(curveDef, defHash) {
    const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
    return Object.freeze({ ...create(defHash), create });
}
//# sourceMappingURL=_shortw_utils.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/curves/esm/secp256k1.js
/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */







const secp256k1P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const secp256k1_1n = BigInt(1);
const secp256k1_2n = BigInt(2);
const divNearest = (a, b) => (a + b / secp256k1_2n) / b;
/**
 * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
 * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
 */
function sqrtMod(y) {
    const P = secp256k1P;
    // prettier-ignore
    const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
    // prettier-ignore
    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
    const b2 = (y * y * y) % P; // x^3, 11
    const b3 = (b2 * b2 * y) % P; // x^7
    const b6 = (pow2(b3, _3n, P) * b3) % P;
    const b9 = (pow2(b6, _3n, P) * b3) % P;
    const b11 = (pow2(b9, secp256k1_2n, P) * b2) % P;
    const b22 = (pow2(b11, _11n, P) * b11) % P;
    const b44 = (pow2(b22, _22n, P) * b22) % P;
    const b88 = (pow2(b44, _44n, P) * b44) % P;
    const b176 = (pow2(b88, _88n, P) * b88) % P;
    const b220 = (pow2(b176, _44n, P) * b44) % P;
    const b223 = (pow2(b220, _3n, P) * b3) % P;
    const t1 = (pow2(b223, _23n, P) * b22) % P;
    const t2 = (pow2(t1, _6n, P) * b2) % P;
    const root = pow2(t2, secp256k1_2n, P);
    if (!Fp.eql(Fp.sqr(root), y))
        throw new Error('Cannot find square root');
    return root;
}
const Fp = Field(secp256k1P, undefined, undefined, { sqrt: sqrtMod });
const secp256k1 = createCurve({
    a: BigInt(0),
    b: BigInt(7),
    Fp,
    n: secp256k1N,
    // Base point (x, y) aka generator point
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
    h: BigInt(1),
    lowS: true,
    /**
     * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
     * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
     * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
     * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
     */
    endo: {
        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
        splitScalar: (k) => {
            const n = secp256k1N;
            const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
            const b1 = -secp256k1_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
            const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
            const b2 = a1;
            const POW_2_128 = BigInt('0x100000000000000000000000000000000'); // (2n**128n).toString(16)
            const c1 = divNearest(b2 * k, n);
            const c2 = divNearest(-b1 * k, n);
            let k1 = mod(k - c1 * a1 - c2 * a2, n);
            let k2 = mod(-c1 * b1 - c2 * b2, n);
            const k1neg = k1 > POW_2_128;
            const k2neg = k2 > POW_2_128;
            if (k1neg)
                k1 = n - k1;
            if (k2neg)
                k2 = n - k2;
            if (k1 > POW_2_128 || k2 > POW_2_128) {
                throw new Error('splitScalar: Endomorphism failed, k=' + k);
            }
            return { k1neg, k1, k2neg, k2 };
        },
    },
}, sha256);
// Schnorr signatures are superior to ECDSA from above. Below is Schnorr-specific BIP0340 code.
// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
const secp256k1_0n = BigInt(0);
const fe = (x) => typeof x === 'bigint' && secp256k1_0n < x && x < secp256k1P;
const ge = (x) => typeof x === 'bigint' && secp256k1_0n < x && x < secp256k1N;
/** An object mapping tags to their tagged hash prefix of [SHA256(tag) | SHA256(tag)] */
const TAGGED_HASH_PREFIXES = {};
function taggedHash(tag, ...messages) {
    let tagP = TAGGED_HASH_PREFIXES[tag];
    if (tagP === undefined) {
        const tagH = sha256(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
        tagP = utils_concatBytes(tagH, tagH);
        TAGGED_HASH_PREFIXES[tag] = tagP;
    }
    return sha256(utils_concatBytes(tagP, ...messages));
}
// ECDSA compact points are 33-byte. Schnorr is 32: we strip first byte 0x02 or 0x03
const pointToBytes = (point) => point.toRawBytes(true).slice(1);
const numTo32b = (n) => numberToBytesBE(n, 32);
const modP = (x) => mod(x, secp256k1P);
const modN = (x) => mod(x, secp256k1N);
const Point = secp256k1.ProjectivePoint;
const GmulAdd = (Q, a, b) => Point.BASE.multiplyAndAddUnsafe(Q, a, b);
// Calculate point, scalar and bytes
function schnorrGetExtPubKey(priv) {
    let d_ = secp256k1.utils.normPrivateKeyToScalar(priv); // same method executed in fromPrivateKey
    let p = Point.fromPrivateKey(d_); // P = d'⋅G; 0 < d' < n check is done inside
    const scalar = p.hasEvenY() ? d_ : modN(-d_);
    return { scalar: scalar, bytes: pointToBytes(p) };
}
/**
 * lift_x from BIP340. Convert 32-byte x coordinate to elliptic curve point.
 * @returns valid point checked for being on-curve
 */
function lift_x(x) {
    if (!fe(x))
        throw new Error('bad x: need 0 < x < p'); // Fail if x ≥ p.
    const xx = modP(x * x);
    const c = modP(xx * x + BigInt(7)); // Let c = x³ + 7 mod p.
    let y = sqrtMod(c); // Let y = c^(p+1)/4 mod p.
    if (y % secp256k1_2n !== secp256k1_0n)
        y = modP(-y); // Return the unique point P such that x(P) = x and
    const p = new Point(x, y, secp256k1_1n); // y(P) = y if y mod 2 = 0 or y(P) = p-y otherwise.
    p.assertValidity();
    return p;
}
/**
 * Create tagged hash, convert it to bigint, reduce modulo-n.
 */
function challenge(...args) {
    return modN(bytesToNumberBE(taggedHash('BIP0340/challenge', ...args)));
}
/**
 * Schnorr public key is just `x` coordinate of Point as per BIP340.
 */
function schnorrGetPublicKey(privateKey) {
    return schnorrGetExtPubKey(privateKey).bytes; // d'=int(sk). Fail if d'=0 or d'≥n. Ret bytes(d'⋅G)
}
/**
 * Creates Schnorr signature as per BIP340. Verifies itself before returning anything.
 * auxRand is optional and is not the sole source of k generation: bad CSPRNG won't be dangerous.
 */
function schnorrSign(message, privateKey, auxRand = randomBytes(32)) {
    const m = ensureBytes('message', message);
    const { bytes: px, scalar: d } = schnorrGetExtPubKey(privateKey); // checks for isWithinCurveOrder
    const a = ensureBytes('auxRand', auxRand, 32); // Auxiliary random data a: a 32-byte array
    const t = numTo32b(d ^ bytesToNumberBE(taggedHash('BIP0340/aux', a))); // Let t be the byte-wise xor of bytes(d) and hash/aux(a)
    const rand = taggedHash('BIP0340/nonce', t, px, m); // Let rand = hash/nonce(t || bytes(P) || m)
    const k_ = modN(bytesToNumberBE(rand)); // Let k' = int(rand) mod n
    if (k_ === secp256k1_0n)
        throw new Error('sign failed: k is zero'); // Fail if k' = 0.
    const { bytes: rx, scalar: k } = schnorrGetExtPubKey(k_); // Let R = k'⋅G.
    const e = challenge(rx, px, m); // Let e = int(hash/challenge(bytes(R) || bytes(P) || m)) mod n.
    const sig = new Uint8Array(64); // Let sig = bytes(R) || bytes((k + ed) mod n).
    sig.set(rx, 0);
    sig.set(numTo32b(modN(k + e * d)), 32);
    // If Verify(bytes(P), m, sig) (see below) returns failure, abort
    if (!schnorrVerify(sig, m, px))
        throw new Error('sign: Invalid signature produced');
    return sig;
}
/**
 * Verifies Schnorr signature.
 * Will swallow errors & return false except for initial type validation of arguments.
 */
function schnorrVerify(signature, message, publicKey) {
    const sig = ensureBytes('signature', signature, 64);
    const m = ensureBytes('message', message);
    const pub = ensureBytes('publicKey', publicKey, 32);
    try {
        const P = lift_x(bytesToNumberBE(pub)); // P = lift_x(int(pk)); fail if that fails
        const r = bytesToNumberBE(sig.subarray(0, 32)); // Let r = int(sig[0:32]); fail if r ≥ p.
        if (!fe(r))
            return false;
        const s = bytesToNumberBE(sig.subarray(32, 64)); // Let s = int(sig[32:64]); fail if s ≥ n.
        if (!ge(s))
            return false;
        const e = challenge(numTo32b(r), pointToBytes(P), m); // int(challenge(bytes(r)||bytes(P)||m))%n
        const R = GmulAdd(P, s, modN(-e)); // R = s⋅G - e⋅P
        if (!R || !R.hasEvenY() || R.toAffine().x !== r)
            return false; // -eP == (n-e)P
        return true; // Fail if is_infinite(R) / not has_even_y(R) / x(R) ≠ r.
    }
    catch (error) {
        return false;
    }
}
const schnorr = {
    getPublicKey: schnorrGetPublicKey,
    sign: schnorrSign,
    verify: schnorrVerify,
    utils: {
        randomPrivateKey: secp256k1.utils.randomPrivateKey,
        lift_x,
        pointToBytes,
        numberToBytesBE: numberToBytesBE,
        bytesToNumberBE: bytesToNumberBE,
        taggedHash,
        mod: mod,
    },
};
const isoMap = isogenyMap(Fp, [
    // xNum
    [
        '0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa8c7',
        '0x7d3d4c80bc321d5b9f315cea7fd44c5d595d2fc0bf63b92dfff1044f17c6581',
        '0x534c328d23f234e6e2a413deca25caece4506144037c40314ecbd0b53d9dd262',
        '0x8e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38e38daaaaa88c',
    ],
    // xDen
    [
        '0xd35771193d94918a9ca34ccbb7b640dd86cd409542f8487d9fe6b745781eb49b',
        '0xedadc6f64383dc1df7c4b2d51b54225406d36b641f5e41bbc52a56612a8c6d14',
        '0x0000000000000000000000000000000000000000000000000000000000000001', // LAST 1
    ],
    // yNum
    [
        '0x4bda12f684bda12f684bda12f684bda12f684bda12f684bda12f684b8e38e23c',
        '0xc75e0c32d5cb7c0fa9d0a54b12a0a6d5647ab046d686da6fdffc90fc201d71a3',
        '0x29a6194691f91a73715209ef6512e576722830a201be2018a765e85a9ecee931',
        '0x2f684bda12f684bda12f684bda12f684bda12f684bda12f684bda12f38e38d84',
    ],
    // yDen
    [
        '0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffff93b',
        '0x7a06534bb8bdb49fd5e9e6632722c2989467c1bfc8e8d978dfb425d2685c2573',
        '0x6484aa716545ca2cf3a70c3fa8fe337e0a3d21162f0d6299a7bf8192bfd2a76f',
        '0x0000000000000000000000000000000000000000000000000000000000000001', // LAST 1
    ],
].map((i) => i.map((j) => BigInt(j))));
const mapSWU = mapToCurveSimpleSWU(Fp, {
    A: BigInt('0x3f8731abdd661adca08a5558f0f5d272e953d363cb6f0e5d405447c01a444533'),
    B: BigInt('1771'),
    Z: Fp.create(BigInt('-11')),
});
const { hashToCurve, encodeToCurve } = createHasher(secp256k1.ProjectivePoint, (scalars) => {
    const { x, y } = mapSWU(Fp.create(scalars[0]));
    return isoMap(x, y);
}, {
    DST: 'secp256k1_XMD:SHA-256_SSWU_RO_',
    encodeDST: 'secp256k1_XMD:SHA-256_SSWU_NU_',
    p: Fp.ORDER,
    m: 1,
    k: 128,
    expand: 'xmd',
    hash: sha256,
});
//# sourceMappingURL=secp256k1.js.map
;// CONCATENATED MODULE: ./node_modules/nostr-tools/node_modules/@noble/hashes/esm/crypto.js
const esm_crypto_crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
//# sourceMappingURL=crypto.js.map
;// CONCATENATED MODULE: ./node_modules/nostr-tools/node_modules/@noble/hashes/esm/utils.js
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// We use `globalThis.crypto`, but node.js versions earlier than v19 don't
// declare it in global scope. For node.js, package.json#exports field mapping
// rewrites import from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated, we can just drop the import.

// Cast array to different type
const utils_u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
const utils_u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
// Cast array to view
const utils_createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
// The rotate right (circular right shift) operation for uint32
const utils_rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
const utils_isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!utils_isLE)
    throw new Error('Non little-endian hardware is not supported');
const esm_utils_hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xde, 0xad, 0xbe, 0xef])) // 'deadbeef'
 */
function esm_utils_bytesToHex(uint8a) {
    // pre-caching improves the speed 6x
    if (!(uint8a instanceof Uint8Array))
        throw new Error('Uint8Array expected');
    let hex = '';
    for (let i = 0; i < uint8a.length; i++) {
        hex += esm_utils_hexes[uint8a[i]];
    }
    return hex;
}
/**
 * @example hexToBytes('deadbeef') // Uint8Array.from([0xde, 0xad, 0xbe, 0xef])
 */
function esm_utils_hexToBytes(hex) {
    if (typeof hex !== 'string') {
        throw new TypeError('hexToBytes: expected string, got ' + typeof hex);
    }
    if (hex.length % 2)
        throw new Error('hexToBytes: received invalid unpadded hex');
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
const utils_nextTick = async () => { };
// Returns control to thread each 'tick' ms to avoid blocking
async function utils_asyncLoop(iters, tick, cb) {
    let ts = Date.now();
    for (let i = 0; i < iters; i++) {
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick)
            continue;
        await utils_nextTick();
        ts += diff;
    }
}
function esm_utils_utf8ToBytes(str) {
    if (typeof str !== 'string') {
        throw new TypeError(`utf8ToBytes expected string, got ${typeof str}`);
    }
    return new TextEncoder().encode(str);
}
function utils_toBytes(data) {
    if (typeof data === 'string')
        data = esm_utils_utf8ToBytes(data);
    if (!(data instanceof Uint8Array))
        throw new TypeError(`Expected input type is Uint8Array (got ${typeof data})`);
    return data;
}
/**
 * Concats Uint8Array-s into one; like `Buffer.concat([buf1, buf2])`
 * @example concatBytes(buf1, buf2)
 */
function esm_utils_concatBytes(...arrays) {
    if (!arrays.every((a) => a instanceof Uint8Array))
        throw new Error('Uint8Array list expected');
    if (arrays.length === 1)
        return arrays[0];
    const length = arrays.reduce((a, arr) => a + arr.length, 0);
    const result = new Uint8Array(length);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const arr = arrays[i];
        result.set(arr, pad);
        pad += arr.length;
    }
    return result;
}
// For runtime check if class implements interface
class utils_Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
// Check if object doens't have custom constructor (like Uint8Array/Array)
const utils_isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
function utils_checkOpts(defaults, opts) {
    if (opts !== undefined && (typeof opts !== 'object' || !utils_isPlainObject(opts)))
        throw new TypeError('Options should be object or undefined');
    const merged = Object.assign(defaults, opts);
    return merged;
}
function utils_wrapConstructor(hashConstructor) {
    const hashC = (message) => hashConstructor().update(utils_toBytes(message)).digest();
    const tmp = hashConstructor();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashConstructor();
    return hashC;
}
function utils_wrapConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(utils_toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
/**
 * Secure PRNG. Uses `globalThis.crypto` or node.js crypto module.
 */
function utils_randomBytes(bytesLength = 32) {
    if (esm_crypto_crypto && typeof esm_crypto_crypto.getRandomValues === 'function') {
        return esm_crypto_crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
}
//# sourceMappingURL=utils.js.map
;// CONCATENATED MODULE: ./node_modules/nostr-tools/node_modules/@noble/hashes/esm/_assert.js
function _assert_number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
function _assert_bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`Expected boolean, not ${b}`);
}
function _assert_bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new TypeError('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new TypeError(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
function _assert_hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    _assert_number(hash.outputLen);
    _assert_number(hash.blockLen);
}
function _assert_exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function _assert_output(out, instance) {
    _assert_bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
const _assert_assert = {
    number: _assert_number,
    bool: _assert_bool,
    bytes: _assert_bytes,
    hash: _assert_hash,
    exists: _assert_exists,
    output: _assert_output,
};
/* harmony default export */ const esm_assert = (_assert_assert);
//# sourceMappingURL=_assert.js.map
;// CONCATENATED MODULE: ./node_modules/nostr-tools/node_modules/@noble/hashes/esm/_sha2.js


// Polyfill for Safari 14
function _sha2_setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class _sha2_SHA2 extends utils_Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = utils_createView(this.buffer);
    }
    update(data) {
        esm_assert.exists(this);
        const { view, buffer, blockLen } = this;
        data = utils_toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = utils_createView(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        esm_assert.exists(this);
        esm_assert.output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        _sha2_setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = utils_createView(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
//# sourceMappingURL=_sha2.js.map
;// CONCATENATED MODULE: ./node_modules/nostr-tools/node_modules/@noble/hashes/esm/sha256.js


// Choice: a ? b : c
const sha256_Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const sha256_Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const sha256_SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const sha256_IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const sha256_SHA256_W = new Uint32Array(64);
class sha256_SHA256 extends _sha2_SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = sha256_IV[0] | 0;
        this.B = sha256_IV[1] | 0;
        this.C = sha256_IV[2] | 0;
        this.D = sha256_IV[3] | 0;
        this.E = sha256_IV[4] | 0;
        this.F = sha256_IV[5] | 0;
        this.G = sha256_IV[6] | 0;
        this.H = sha256_IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            sha256_SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = sha256_SHA256_W[i - 15];
            const W2 = sha256_SHA256_W[i - 2];
            const s0 = utils_rotr(W15, 7) ^ utils_rotr(W15, 18) ^ (W15 >>> 3);
            const s1 = utils_rotr(W2, 17) ^ utils_rotr(W2, 19) ^ (W2 >>> 10);
            sha256_SHA256_W[i] = (s1 + sha256_SHA256_W[i - 7] + s0 + sha256_SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = utils_rotr(E, 6) ^ utils_rotr(E, 11) ^ utils_rotr(E, 25);
            const T1 = (H + sigma1 + sha256_Chi(E, F, G) + sha256_SHA256_K[i] + sha256_SHA256_W[i]) | 0;
            const sigma0 = utils_rotr(A, 2) ^ utils_rotr(A, 13) ^ utils_rotr(A, 22);
            const T2 = (sigma0 + sha256_Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        sha256_SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
// Constants from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
class sha256_SHA224 extends sha256_SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
const sha256_sha256 = utils_wrapConstructor(() => new sha256_SHA256());
const sha256_sha224 = utils_wrapConstructor(() => new sha256_SHA224());
//# sourceMappingURL=sha256.js.map
;// CONCATENATED MODULE: ./node_modules/@scure/base/lib/esm/index.js
/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
function assertNumber(n) {
    if (!Number.isSafeInteger(n))
        throw new Error(`Wrong integer: ${n}`);
}
function chain(...args) {
    const wrap = (a, b) => (c) => a(b(c));
    const encode = Array.from(args)
        .reverse()
        .reduce((acc, i) => (acc ? wrap(acc, i.encode) : i.encode), undefined);
    const decode = args.reduce((acc, i) => (acc ? wrap(acc, i.decode) : i.decode), undefined);
    return { encode, decode };
}
function alphabet(alphabet) {
    return {
        encode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('alphabet.encode input should be an array of numbers');
            return digits.map((i) => {
                assertNumber(i);
                if (i < 0 || i >= alphabet.length)
                    throw new Error(`Digit index outside alphabet: ${i} (alphabet: ${alphabet.length})`);
                return alphabet[i];
            });
        },
        decode: (input) => {
            if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                throw new Error('alphabet.decode input should be array of strings');
            return input.map((letter) => {
                if (typeof letter !== 'string')
                    throw new Error(`alphabet.decode: not string element=${letter}`);
                const index = alphabet.indexOf(letter);
                if (index === -1)
                    throw new Error(`Unknown letter: "${letter}". Allowed: ${alphabet}`);
                return index;
            });
        },
    };
}
function join(separator = '') {
    if (typeof separator !== 'string')
        throw new Error('join separator should be string');
    return {
        encode: (from) => {
            if (!Array.isArray(from) || (from.length && typeof from[0] !== 'string'))
                throw new Error('join.encode input should be array of strings');
            for (let i of from)
                if (typeof i !== 'string')
                    throw new Error(`join.encode: non-string input=${i}`);
            return from.join(separator);
        },
        decode: (to) => {
            if (typeof to !== 'string')
                throw new Error('join.decode input should be string');
            return to.split(separator);
        },
    };
}
function padding(bits, chr = '=') {
    assertNumber(bits);
    if (typeof chr !== 'string')
        throw new Error('padding chr should be string');
    return {
        encode(data) {
            if (!Array.isArray(data) || (data.length && typeof data[0] !== 'string'))
                throw new Error('padding.encode input should be array of strings');
            for (let i of data)
                if (typeof i !== 'string')
                    throw new Error(`padding.encode: non-string input=${i}`);
            while ((data.length * bits) % 8)
                data.push(chr);
            return data;
        },
        decode(input) {
            if (!Array.isArray(input) || (input.length && typeof input[0] !== 'string'))
                throw new Error('padding.encode input should be array of strings');
            for (let i of input)
                if (typeof i !== 'string')
                    throw new Error(`padding.decode: non-string input=${i}`);
            let end = input.length;
            if ((end * bits) % 8)
                throw new Error('Invalid padding: string should have whole number of bytes');
            for (; end > 0 && input[end - 1] === chr; end--) {
                if (!(((end - 1) * bits) % 8))
                    throw new Error('Invalid padding: string has too much padding');
            }
            return input.slice(0, end);
        },
    };
}
function normalize(fn) {
    if (typeof fn !== 'function')
        throw new Error('normalize fn should be function');
    return { encode: (from) => from, decode: (to) => fn(to) };
}
function convertRadix(data, from, to) {
    if (from < 2)
        throw new Error(`convertRadix: wrong from=${from}, base cannot be less than 2`);
    if (to < 2)
        throw new Error(`convertRadix: wrong to=${to}, base cannot be less than 2`);
    if (!Array.isArray(data))
        throw new Error('convertRadix: data should be array');
    if (!data.length)
        return [];
    let pos = 0;
    const res = [];
    const digits = Array.from(data);
    digits.forEach((d) => {
        assertNumber(d);
        if (d < 0 || d >= from)
            throw new Error(`Wrong integer: ${d}`);
    });
    while (true) {
        let carry = 0;
        let done = true;
        for (let i = pos; i < digits.length; i++) {
            const digit = digits[i];
            const digitBase = from * carry + digit;
            if (!Number.isSafeInteger(digitBase) ||
                (from * carry) / from !== carry ||
                digitBase - digit !== from * carry) {
                throw new Error('convertRadix: carry overflow');
            }
            carry = digitBase % to;
            digits[i] = Math.floor(digitBase / to);
            if (!Number.isSafeInteger(digits[i]) || digits[i] * to + carry !== digitBase)
                throw new Error('convertRadix: carry overflow');
            if (!done)
                continue;
            else if (!digits[i])
                pos = i;
            else
                done = false;
        }
        res.push(carry);
        if (done)
            break;
    }
    for (let i = 0; i < data.length - 1 && data[i] === 0; i++)
        res.push(0);
    return res.reverse();
}
const gcd = (a, b) => (!b ? a : gcd(b, a % b));
const radix2carry = (from, to) => from + (to - gcd(from, to));
function convertRadix2(data, from, to, padding) {
    if (!Array.isArray(data))
        throw new Error('convertRadix2: data should be array');
    if (from <= 0 || from > 32)
        throw new Error(`convertRadix2: wrong from=${from}`);
    if (to <= 0 || to > 32)
        throw new Error(`convertRadix2: wrong to=${to}`);
    if (radix2carry(from, to) > 32) {
        throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
    }
    let carry = 0;
    let pos = 0;
    const mask = 2 ** to - 1;
    const res = [];
    for (const n of data) {
        assertNumber(n);
        if (n >= 2 ** from)
            throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
        carry = (carry << from) | n;
        if (pos + from > 32)
            throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
        pos += from;
        for (; pos >= to; pos -= to)
            res.push(((carry >> (pos - to)) & mask) >>> 0);
        carry &= 2 ** pos - 1;
    }
    carry = (carry << (to - pos)) & mask;
    if (!padding && pos >= from)
        throw new Error('Excess padding');
    if (!padding && carry)
        throw new Error(`Non-zero padding: ${carry}`);
    if (padding && pos > 0)
        res.push(carry >>> 0);
    return res;
}
function radix(num) {
    assertNumber(num);
    return {
        encode: (bytes) => {
            if (!(bytes instanceof Uint8Array))
                throw new Error('radix.encode input should be Uint8Array');
            return convertRadix(Array.from(bytes), 2 ** 8, num);
        },
        decode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('radix.decode input should be array of strings');
            return Uint8Array.from(convertRadix(digits, num, 2 ** 8));
        },
    };
}
function radix2(bits, revPadding = false) {
    assertNumber(bits);
    if (bits <= 0 || bits > 32)
        throw new Error('radix2: bits should be in (0..32]');
    if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
        throw new Error('radix2: carry overflow');
    return {
        encode: (bytes) => {
            if (!(bytes instanceof Uint8Array))
                throw new Error('radix2.encode input should be Uint8Array');
            return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
        },
        decode: (digits) => {
            if (!Array.isArray(digits) || (digits.length && typeof digits[0] !== 'number'))
                throw new Error('radix2.decode input should be array of strings');
            return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
        },
    };
}
function unsafeWrapper(fn) {
    if (typeof fn !== 'function')
        throw new Error('unsafeWrapper fn should be function');
    return function (...args) {
        try {
            return fn.apply(null, args);
        }
        catch (e) { }
    };
}
function checksum(len, fn) {
    assertNumber(len);
    if (typeof fn !== 'function')
        throw new Error('checksum fn should be function');
    return {
        encode(data) {
            if (!(data instanceof Uint8Array))
                throw new Error('checksum.encode: input should be Uint8Array');
            const checksum = fn(data).slice(0, len);
            const res = new Uint8Array(data.length + len);
            res.set(data);
            res.set(checksum, data.length);
            return res;
        },
        decode(data) {
            if (!(data instanceof Uint8Array))
                throw new Error('checksum.decode: input should be Uint8Array');
            const payload = data.slice(0, -len);
            const newChecksum = fn(payload).slice(0, len);
            const oldChecksum = data.slice(-len);
            for (let i = 0; i < len; i++)
                if (newChecksum[i] !== oldChecksum[i])
                    throw new Error('Invalid checksum');
            return payload;
        },
    };
}
const utils = { alphabet, chain, checksum, radix, radix2, join, padding };
const base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
const base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
const base32hex = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
const base32crockford = chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize((s) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
const base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
const base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
const genBase58 = (abc) => chain(radix(58), alphabet(abc), join(''));
const base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
const base58flickr = genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
const base58xrp = genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const base58xmr = {
    encode(data) {
        let res = '';
        for (let i = 0; i < data.length; i += 8) {
            const block = data.subarray(i, i + 8);
            res += base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
        }
        return res;
    },
    decode(str) {
        let res = [];
        for (let i = 0; i < str.length; i += 11) {
            const slice = str.slice(i, i + 11);
            const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
            const block = base58.decode(slice);
            for (let j = 0; j < block.length - blockLen; j++) {
                if (block[j] !== 0)
                    throw new Error('base58xmr: wrong padding');
            }
            res = res.concat(Array.from(block.slice(block.length - blockLen)));
        }
        return Uint8Array.from(res);
    },
};
const base58check = (sha256) => chain(checksum(4, (data) => sha256(sha256(data))), base58);
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre) {
    const b = pre >> 25;
    let chk = (pre & 0x1ffffff) << 5;
    for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
        if (((b >> i) & 1) === 1)
            chk ^= POLYMOD_GENERATORS[i];
    }
    return chk;
}
function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i = 0; i < len; i++) {
        const c = prefix.charCodeAt(i);
        if (c < 33 || c > 126)
            throw new Error(`Invalid prefix (${prefix})`);
        chk = bech32Polymod(chk) ^ (c >> 5);
    }
    chk = bech32Polymod(chk);
    for (let i = 0; i < len; i++)
        chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f);
    for (let v of words)
        chk = bech32Polymod(chk) ^ v;
    for (let i = 0; i < 6; i++)
        chk = bech32Polymod(chk);
    chk ^= encodingConst;
    return BECH_ALPHABET.encode(convertRadix2([chk % 2 ** 30], 30, 5, false));
}
function genBech32(encoding) {
    const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
    const _words = radix2(5);
    const fromWords = _words.decode;
    const toWords = _words.encode;
    const fromWordsUnsafe = unsafeWrapper(fromWords);
    function encode(prefix, words, limit = 90) {
        if (typeof prefix !== 'string')
            throw new Error(`bech32.encode prefix should be string, not ${typeof prefix}`);
        if (!Array.isArray(words) || (words.length && typeof words[0] !== 'number'))
            throw new Error(`bech32.encode words should be array of numbers, not ${typeof words}`);
        const actualLength = prefix.length + 7 + words.length;
        if (limit !== false && actualLength > limit)
            throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
        prefix = prefix.toLowerCase();
        return `${prefix}1${BECH_ALPHABET.encode(words)}${bechChecksum(prefix, words, ENCODING_CONST)}`;
    }
    function decode(str, limit = 90) {
        if (typeof str !== 'string')
            throw new Error(`bech32.decode input should be string, not ${typeof str}`);
        if (str.length < 8 || (limit !== false && str.length > limit))
            throw new TypeError(`Wrong string length: ${str.length} (${str}). Expected (8..${limit})`);
        const lowered = str.toLowerCase();
        if (str !== lowered && str !== str.toUpperCase())
            throw new Error(`String must be lowercase or uppercase`);
        str = lowered;
        const sepIndex = str.lastIndexOf('1');
        if (sepIndex === 0 || sepIndex === -1)
            throw new Error(`Letter "1" must be present between prefix and data only`);
        const prefix = str.slice(0, sepIndex);
        const _words = str.slice(sepIndex + 1);
        if (_words.length < 6)
            throw new Error('Data must be at least 6 characters long');
        const words = BECH_ALPHABET.decode(_words).slice(0, -6);
        const sum = bechChecksum(prefix, words, ENCODING_CONST);
        if (!_words.endsWith(sum))
            throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
        return { prefix, words };
    }
    const decodeUnsafe = unsafeWrapper(decode);
    function decodeToBytes(str) {
        const { prefix, words } = decode(str, false);
        return { prefix, words, bytes: fromWords(words) };
    }
    return { encode, decode, decodeToBytes, decodeUnsafe, fromWords, fromWordsUnsafe, toWords };
}
const bech32 = genBech32('bech32');
const bech32m = genBech32('bech32m');
const utf8 = {
    encode: (data) => new TextDecoder().decode(data),
    decode: (str) => new TextEncoder().encode(str),
};
const hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize((s) => {
    if (typeof s !== 'string' || s.length % 2)
        throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
}));
const CODERS = {
    utf8, hex, base16, base32, base64, base64url, base58, base58xmr
};
const coderTypeError = (/* unused pure expression or super */ null && (`Invalid encoding type. Available types: ${Object.keys(CODERS).join(', ')}`));
const bytesToString = (type, bytes) => {
    if (typeof type !== 'string' || !CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (!(bytes instanceof Uint8Array))
        throw new TypeError('bytesToString() expects Uint8Array');
    return CODERS[type].encode(bytes);
};
const str = (/* unused pure expression or super */ null && (bytesToString));
const stringToBytes = (type, str) => {
    if (!CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (typeof str !== 'string')
        throw new TypeError('stringToBytes() expects string');
    return CODERS[type].decode(str);
};
const esm_bytes = (/* unused pure expression or super */ null && (stringToBytes));

// EXTERNAL MODULE: ./node_modules/@scure/bip39/wordlists/english.js
var english = __webpack_require__(1083);
// EXTERNAL MODULE: ./node_modules/@scure/bip39/index.js
var bip39 = __webpack_require__(7286);
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/_assert.js
function esm_assert_number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
function esm_assert_bool(b) {
    if (typeof b !== 'boolean')
        throw new Error(`Expected boolean, not ${b}`);
}
function esm_assert_bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new Error('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
function esm_assert_hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    esm_assert_number(hash.outputLen);
    esm_assert_number(hash.blockLen);
}
function esm_assert_exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function esm_assert_output(out, instance) {
    esm_assert_bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}
const esm_assert_assert = {
    number: esm_assert_number,
    bool: esm_assert_bool,
    bytes: esm_assert_bytes,
    hash: esm_assert_hash,
    exists: esm_assert_exists,
    output: esm_assert_output,
};
/* harmony default export */ const hashes_esm_assert = (esm_assert_assert);
//# sourceMappingURL=_assert.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/crypto.js
const hashes_esm_crypto_crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
//# sourceMappingURL=crypto.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/utils.js
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated, we can just drop the import.

const utils_u8a = (a) => a instanceof Uint8Array;
// Cast array to different type
const esm_utils_u8 = (arr) => new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
const esm_utils_u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
// Cast array to view
const esm_utils_createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
// The rotate right (circular right shift) operation for uint32
const esm_utils_rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
const esm_utils_isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!esm_utils_isLE)
    throw new Error('Non little-endian hardware is not supported');
const hashes_esm_utils_hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function hashes_esm_utils_bytesToHex(bytes) {
    if (!utils_u8a(bytes))
        throw new Error('Uint8Array expected');
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hashes_esm_utils_hexes[bytes[i]];
    }
    return hex;
}
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hashes_esm_utils_hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const len = hex.length;
    if (len % 2)
        throw new Error('padded hex string expected, got unpadded hex of length ' + len);
    const array = new Uint8Array(len / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
// There is no setImmediate in browser and setTimeout is slow.
// call of async fn will return Promise, which will be fullfiled only on
// next scheduler queue processing step and this is exactly what we need.
const esm_utils_nextTick = async () => { };
// Returns control to thread each 'tick' ms to avoid blocking
async function esm_utils_asyncLoop(iters, tick, cb) {
    let ts = Date.now();
    for (let i = 0; i < iters; i++) {
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick)
            continue;
        await esm_utils_nextTick();
        ts += diff;
    }
}
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function hashes_esm_utils_utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function esm_utils_toBytes(data) {
    if (typeof data === 'string')
        data = hashes_esm_utils_utf8ToBytes(data);
    if (!utils_u8a(data))
        throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
}
/**
 * Copies several Uint8Arrays into one.
 */
function hashes_esm_utils_concatBytes(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0; // walk through each item, ensure they have proper type
    arrays.forEach((a) => {
        if (!utils_u8a(a))
            throw new Error('Uint8Array expected');
        r.set(a, pad);
        pad += a.length;
    });
    return r;
}
// For runtime check if class implements interface
class esm_utils_Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
// Check if object doens't have custom constructor (like Uint8Array/Array)
const esm_utils_isPlainObject = (obj) => Object.prototype.toString.call(obj) === '[object Object]' && obj.constructor === Object;
function esm_utils_checkOpts(defaults, opts) {
    if (opts !== undefined && (typeof opts !== 'object' || !esm_utils_isPlainObject(opts)))
        throw new Error('Options should be object or undefined');
    const merged = Object.assign(defaults, opts);
    return merged;
}
function esm_utils_wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(esm_utils_toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
}
function esm_utils_wrapConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(esm_utils_toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
function wrapXOFConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(esm_utils_toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
function esm_utils_randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === 'function') {
        return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
}
//# sourceMappingURL=utils.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/hmac.js


// HMAC (RFC 2104)
class hmac_HMAC extends esm_utils_Hash {
    constructor(hash, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        hashes_esm_assert.hash(hash);
        const key = esm_utils_toBytes(_key);
        this.iHash = hash.create();
        if (typeof this.iHash.update !== 'function')
            throw new Error('Expected instance of class which extends utils.Hash');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        hashes_esm_assert.exists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        hashes_esm_assert.exists(this);
        hashes_esm_assert.bytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */
const hmac_hmac = (hash, key, message) => new hmac_HMAC(hash, key).update(message).digest();
hmac_hmac.create = (hash, key) => new hmac_HMAC(hash, key);
//# sourceMappingURL=hmac.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/_sha2.js


// Polyfill for Safari 14
function esm_sha2_setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class esm_sha2_SHA2 extends esm_utils_Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = esm_utils_createView(this.buffer);
    }
    update(data) {
        hashes_esm_assert.exists(this);
        const { view, buffer, blockLen } = this;
        data = esm_utils_toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = esm_utils_createView(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        hashes_esm_assert.exists(this);
        hashes_esm_assert.output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        esm_sha2_setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = esm_utils_createView(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}
//# sourceMappingURL=_sha2.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/ripemd160.js


// https://homes.esat.kuleuven.be/~bosselae/ripemd160.html
// https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf
const Rho = new Uint8Array([7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8]);
const Id = Uint8Array.from({ length: 16 }, (_, i) => i);
const Pi = Id.map((i) => (9 * i + 5) % 16);
let idxL = [Id];
let idxR = [Pi];
for (let i = 0; i < 4; i++)
    for (let j of [idxL, idxR])
        j.push(j[i].map((k) => Rho[k]));
const shifts = [
    [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
    [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
    [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
    [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
    [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
].map((i) => new Uint8Array(i));
const shiftsL = idxL.map((idx, i) => idx.map((j) => shifts[i][j]));
const shiftsR = idxR.map((idx, i) => idx.map((j) => shifts[i][j]));
const Kl = new Uint32Array([0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e]);
const Kr = new Uint32Array([0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000]);
// The rotate left (circular left shift) operation for uint32
const rotl = (word, shift) => (word << shift) | (word >>> (32 - shift));
// It's called f() in spec.
function f(group, x, y, z) {
    if (group === 0)
        return x ^ y ^ z;
    else if (group === 1)
        return (x & y) | (~x & z);
    else if (group === 2)
        return (x | ~y) ^ z;
    else if (group === 3)
        return (x & z) | (y & ~z);
    else
        return x ^ (y | ~z);
}
// Temporary buffer, not used to store anything between runs
const BUF = new Uint32Array(16);
class RIPEMD160 extends esm_sha2_SHA2 {
    constructor() {
        super(64, 20, 8, true);
        this.h0 = 0x67452301 | 0;
        this.h1 = 0xefcdab89 | 0;
        this.h2 = 0x98badcfe | 0;
        this.h3 = 0x10325476 | 0;
        this.h4 = 0xc3d2e1f0 | 0;
    }
    get() {
        const { h0, h1, h2, h3, h4 } = this;
        return [h0, h1, h2, h3, h4];
    }
    set(h0, h1, h2, h3, h4) {
        this.h0 = h0 | 0;
        this.h1 = h1 | 0;
        this.h2 = h2 | 0;
        this.h3 = h3 | 0;
        this.h4 = h4 | 0;
    }
    process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
            BUF[i] = view.getUint32(offset, true);
        // prettier-ignore
        let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
        // Instead of iterating 0 to 80, we split it into 5 groups
        // And use the groups in constants, functions, etc. Much simpler
        for (let group = 0; group < 5; group++) {
            const rGroup = 4 - group;
            const hbl = Kl[group], hbr = Kr[group]; // prettier-ignore
            const rl = idxL[group], rr = idxR[group]; // prettier-ignore
            const sl = shiftsL[group], sr = shiftsR[group]; // prettier-ignore
            for (let i = 0; i < 16; i++) {
                const tl = (rotl(al + f(group, bl, cl, dl) + BUF[rl[i]] + hbl, sl[i]) + el) | 0;
                al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl; // prettier-ignore
            }
            // 2 loops are 10% faster
            for (let i = 0; i < 16; i++) {
                const tr = (rotl(ar + f(rGroup, br, cr, dr) + BUF[rr[i]] + hbr, sr[i]) + er) | 0;
                ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr; // prettier-ignore
            }
        }
        // Add the compressed chunk to the current hash value
        this.set((this.h1 + cl + dr) | 0, (this.h2 + dl + er) | 0, (this.h3 + el + ar) | 0, (this.h4 + al + br) | 0, (this.h0 + bl + cr) | 0);
    }
    roundClean() {
        BUF.fill(0);
    }
    destroy() {
        this.destroyed = true;
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0);
    }
}
/**
 * RIPEMD-160 - a hash function from 1990s.
 * @param message - msg that would be hashed
 */
const ripemd160 = esm_utils_wrapConstructor(() => new RIPEMD160());
//# sourceMappingURL=ripemd160.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/sha256.js


// Choice: a ? b : c
const esm_sha256_Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const esm_sha256_Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const esm_sha256_SHA256_K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const esm_sha256_IV = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const esm_sha256_SHA256_W = new Uint32Array(64);
class esm_sha256_SHA256 extends esm_sha2_SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = esm_sha256_IV[0] | 0;
        this.B = esm_sha256_IV[1] | 0;
        this.C = esm_sha256_IV[2] | 0;
        this.D = esm_sha256_IV[3] | 0;
        this.E = esm_sha256_IV[4] | 0;
        this.F = esm_sha256_IV[5] | 0;
        this.G = esm_sha256_IV[6] | 0;
        this.H = esm_sha256_IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            esm_sha256_SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = esm_sha256_SHA256_W[i - 15];
            const W2 = esm_sha256_SHA256_W[i - 2];
            const s0 = esm_utils_rotr(W15, 7) ^ esm_utils_rotr(W15, 18) ^ (W15 >>> 3);
            const s1 = esm_utils_rotr(W2, 17) ^ esm_utils_rotr(W2, 19) ^ (W2 >>> 10);
            esm_sha256_SHA256_W[i] = (s1 + esm_sha256_SHA256_W[i - 7] + s0 + esm_sha256_SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = esm_utils_rotr(E, 6) ^ esm_utils_rotr(E, 11) ^ esm_utils_rotr(E, 25);
            const T1 = (H + sigma1 + esm_sha256_Chi(E, F, G) + esm_sha256_SHA256_K[i] + esm_sha256_SHA256_W[i]) | 0;
            const sigma0 = esm_utils_rotr(A, 2) ^ esm_utils_rotr(A, 13) ^ esm_utils_rotr(A, 22);
            const T2 = (sigma0 + esm_sha256_Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        esm_sha256_SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
// Constants from https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf
class esm_sha256_SHA224 extends esm_sha256_SHA256 {
    constructor() {
        super();
        this.A = 0xc1059ed8 | 0;
        this.B = 0x367cd507 | 0;
        this.C = 0x3070dd17 | 0;
        this.D = 0xf70e5939 | 0;
        this.E = 0xffc00b31 | 0;
        this.F = 0x68581511 | 0;
        this.G = 0x64f98fa7 | 0;
        this.H = 0xbefa4fa4 | 0;
        this.outputLen = 28;
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
const esm_sha256_sha256 = esm_utils_wrapConstructor(() => new esm_sha256_SHA256());
const esm_sha256_sha224 = esm_utils_wrapConstructor(() => new esm_sha256_SHA224());
//# sourceMappingURL=sha256.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/_u64.js
const U32_MASK64 = BigInt(2 ** 32 - 1);
const _32n = BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
// for Shift in [0, 32)
const shrSH = (h, l, s) => h >>> s;
const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in [1, 32)
const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (h, l) => l;
const rotr32L = (h, l) => h;
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
// Removing "export" has 5% perf penalty -_-
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
// Addition with more than 2 elements
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
// prettier-ignore
const u64 = {
    fromBig, split, toBig,
    shrSH, shrSL,
    rotrSH, rotrSL, rotrBH, rotrBL,
    rotr32H, rotr32L,
    rotlSH, rotlSL, rotlBH, rotlBL,
    add, add3L, add3H, add4L, add4H, add5H, add5L,
};
/* harmony default export */ const _u64 = (u64);
//# sourceMappingURL=_u64.js.map
;// CONCATENATED MODULE: ./node_modules/@noble/hashes/esm/sha512.js



// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
// prettier-ignore
const [SHA512_Kh, SHA512_Kl] = _u64.split([
    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
].map(n => BigInt(n)));
// Temporary buffer, not used to store anything between runs
const SHA512_W_H = new Uint32Array(80);
const SHA512_W_L = new Uint32Array(80);
class SHA512 extends esm_sha2_SHA2 {
    constructor() {
        super(128, 64, 16, false);
        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
        // Also looks cleaner and easier to verify with spec.
        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x6a09e667 | 0;
        this.Al = 0xf3bcc908 | 0;
        this.Bh = 0xbb67ae85 | 0;
        this.Bl = 0x84caa73b | 0;
        this.Ch = 0x3c6ef372 | 0;
        this.Cl = 0xfe94f82b | 0;
        this.Dh = 0xa54ff53a | 0;
        this.Dl = 0x5f1d36f1 | 0;
        this.Eh = 0x510e527f | 0;
        this.El = 0xade682d1 | 0;
        this.Fh = 0x9b05688c | 0;
        this.Fl = 0x2b3e6c1f | 0;
        this.Gh = 0x1f83d9ab | 0;
        this.Gl = 0xfb41bd6b | 0;
        this.Hh = 0x5be0cd19 | 0;
        this.Hl = 0x137e2179 | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32((offset += 4));
        }
        for (let i = 16; i < 80; i++) {
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = _u64.rotrSH(W15h, W15l, 1) ^ _u64.rotrSH(W15h, W15l, 8) ^ _u64.shrSH(W15h, W15l, 7);
            const s0l = _u64.rotrSL(W15h, W15l, 1) ^ _u64.rotrSL(W15h, W15l, 8) ^ _u64.shrSL(W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = _u64.rotrSH(W2h, W2l, 19) ^ _u64.rotrBH(W2h, W2l, 61) ^ _u64.shrSH(W2h, W2l, 6);
            const s1l = _u64.rotrSL(W2h, W2l, 19) ^ _u64.rotrBL(W2h, W2l, 61) ^ _u64.shrSL(W2h, W2l, 6);
            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
            const SUMl = _u64.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = _u64.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for (let i = 0; i < 80; i++) {
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = _u64.rotrSH(Eh, El, 14) ^ _u64.rotrSH(Eh, El, 18) ^ _u64.rotrBH(Eh, El, 41);
            const sigma1l = _u64.rotrSL(Eh, El, 14) ^ _u64.rotrSL(Eh, El, 18) ^ _u64.rotrBL(Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
            const CHIl = (El & Fl) ^ (~El & Gl);
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = _u64.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = _u64.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = _u64.rotrSH(Ah, Al, 28) ^ _u64.rotrBH(Ah, Al, 34) ^ _u64.rotrBH(Ah, Al, 39);
            const sigma0l = _u64.rotrSL(Ah, Al, 28) ^ _u64.rotrBL(Ah, Al, 34) ^ _u64.rotrBL(Ah, Al, 39);
            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = _u64.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = _u64.add3L(T1l, sigma0l, MAJl);
            Ah = _u64.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = _u64.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = _u64.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = _u64.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = _u64.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = _u64.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = _u64.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = _u64.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = _u64.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        SHA512_W_H.fill(0);
        SHA512_W_L.fill(0);
    }
    destroy() {
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
class SHA512_224 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x8c3d37c8 | 0;
        this.Al = 0x19544da2 | 0;
        this.Bh = 0x73e19966 | 0;
        this.Bl = 0x89dcd4d6 | 0;
        this.Ch = 0x1dfab7ae | 0;
        this.Cl = 0x32ff9c82 | 0;
        this.Dh = 0x679dd514 | 0;
        this.Dl = 0x582f9fcf | 0;
        this.Eh = 0x0f6d2b69 | 0;
        this.El = 0x7bd44da8 | 0;
        this.Fh = 0x77e36f73 | 0;
        this.Fl = 0x04c48942 | 0;
        this.Gh = 0x3f9d85a8 | 0;
        this.Gl = 0x6a1d36c8 | 0;
        this.Hh = 0x1112e6ad | 0;
        this.Hl = 0x91d692a1 | 0;
        this.outputLen = 28;
    }
}
class SHA512_256 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x22312194 | 0;
        this.Al = 0xfc2bf72c | 0;
        this.Bh = 0x9f555fa3 | 0;
        this.Bl = 0xc84c64c2 | 0;
        this.Ch = 0x2393b86b | 0;
        this.Cl = 0x6f53b151 | 0;
        this.Dh = 0x96387719 | 0;
        this.Dl = 0x5940eabd | 0;
        this.Eh = 0x96283ee2 | 0;
        this.El = 0xa88effe3 | 0;
        this.Fh = 0xbe5e1e25 | 0;
        this.Fl = 0x53863992 | 0;
        this.Gh = 0x2b0199fc | 0;
        this.Gl = 0x2c85b8aa | 0;
        this.Hh = 0x0eb72ddc | 0;
        this.Hl = 0x81c52ca2 | 0;
        this.outputLen = 32;
    }
}
class SHA384 extends SHA512 {
    constructor() {
        super();
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0xcbbb9d5d | 0;
        this.Al = 0xc1059ed8 | 0;
        this.Bh = 0x629a292a | 0;
        this.Bl = 0x367cd507 | 0;
        this.Ch = 0x9159015a | 0;
        this.Cl = 0x3070dd17 | 0;
        this.Dh = 0x152fecd8 | 0;
        this.Dl = 0xf70e5939 | 0;
        this.Eh = 0x67332667 | 0;
        this.El = 0xffc00b31 | 0;
        this.Fh = 0x8eb44a87 | 0;
        this.Fl = 0x68581511 | 0;
        this.Gh = 0xdb0c2e0d | 0;
        this.Gl = 0x64f98fa7 | 0;
        this.Hh = 0x47b5481d | 0;
        this.Hl = 0xbefa4fa4 | 0;
        this.outputLen = 48;
    }
}
const sha512 = esm_utils_wrapConstructor(() => new SHA512());
const sha512_224 = esm_utils_wrapConstructor(() => new SHA512_224());
const sha512_256 = esm_utils_wrapConstructor(() => new SHA512_256());
const sha384 = esm_utils_wrapConstructor(() => new SHA384());
//# sourceMappingURL=sha512.js.map
;// CONCATENATED MODULE: ./node_modules/@scure/bip32/lib/esm/index.js









const esm_Point = secp256k1.ProjectivePoint;
const esm_base58check = base58check(esm_sha256_sha256);
function bytesToNumber(bytes) {
    return BigInt(`0x${hashes_esm_utils_bytesToHex(bytes)}`);
}
function numberToBytes(num) {
    return hashes_esm_utils_hexToBytes(num.toString(16).padStart(64, '0'));
}
const MASTER_SECRET = hashes_esm_utils_utf8ToBytes('Bitcoin seed');
const BITCOIN_VERSIONS = { private: 0x0488ade4, public: 0x0488b21e };
const HARDENED_OFFSET = 0x80000000;
const hash160 = (data) => ripemd160(esm_sha256_sha256(data));
const fromU32 = (data) => esm_utils_createView(data).getUint32(0, false);
const toU32 = (n) => {
    if (!Number.isSafeInteger(n) || n < 0 || n > 2 ** 32 - 1) {
        throw new Error(`Invalid number=${n}. Should be from 0 to 2 ** 32 - 1`);
    }
    const buf = new Uint8Array(4);
    esm_utils_createView(buf).setUint32(0, n, false);
    return buf;
};
class HDKey {
    get fingerprint() {
        if (!this.pubHash) {
            throw new Error('No publicKey set!');
        }
        return fromU32(this.pubHash);
    }
    get identifier() {
        return this.pubHash;
    }
    get pubKeyHash() {
        return this.pubHash;
    }
    get privateKey() {
        return this.privKeyBytes || null;
    }
    get publicKey() {
        return this.pubKey || null;
    }
    get privateExtendedKey() {
        const priv = this.privateKey;
        if (!priv) {
            throw new Error('No private key');
        }
        return esm_base58check.encode(this.serialize(this.versions.private, hashes_esm_utils_concatBytes(new Uint8Array([0]), priv)));
    }
    get publicExtendedKey() {
        if (!this.pubKey) {
            throw new Error('No public key');
        }
        return esm_base58check.encode(this.serialize(this.versions.public, this.pubKey));
    }
    static fromMasterSeed(seed, versions = BITCOIN_VERSIONS) {
        esm_assert_bytes(seed);
        if (8 * seed.length < 128 || 8 * seed.length > 512) {
            throw new Error(`HDKey: wrong seed length=${seed.length}. Should be between 128 and 512 bits; 256 bits is advised)`);
        }
        const I = hmac_hmac(sha512, MASTER_SECRET, seed);
        return new HDKey({
            versions,
            chainCode: I.slice(32),
            privateKey: I.slice(0, 32),
        });
    }
    static fromExtendedKey(base58key, versions = BITCOIN_VERSIONS) {
        const keyBuffer = esm_base58check.decode(base58key);
        const keyView = esm_utils_createView(keyBuffer);
        const version = keyView.getUint32(0, false);
        const opt = {
            versions,
            depth: keyBuffer[4],
            parentFingerprint: keyView.getUint32(5, false),
            index: keyView.getUint32(9, false),
            chainCode: keyBuffer.slice(13, 45),
        };
        const key = keyBuffer.slice(45);
        const isPriv = key[0] === 0;
        if (version !== versions[isPriv ? 'private' : 'public']) {
            throw new Error('Version mismatch');
        }
        if (isPriv) {
            return new HDKey({ ...opt, privateKey: key.slice(1) });
        }
        else {
            return new HDKey({ ...opt, publicKey: key });
        }
    }
    static fromJSON(json) {
        return HDKey.fromExtendedKey(json.xpriv);
    }
    constructor(opt) {
        this.depth = 0;
        this.index = 0;
        this.chainCode = null;
        this.parentFingerprint = 0;
        if (!opt || typeof opt !== 'object') {
            throw new Error('HDKey.constructor must not be called directly');
        }
        this.versions = opt.versions || BITCOIN_VERSIONS;
        this.depth = opt.depth || 0;
        this.chainCode = opt.chainCode;
        this.index = opt.index || 0;
        this.parentFingerprint = opt.parentFingerprint || 0;
        if (!this.depth) {
            if (this.parentFingerprint || this.index) {
                throw new Error('HDKey: zero depth with non-zero index/parent fingerprint');
            }
        }
        if (opt.publicKey && opt.privateKey) {
            throw new Error('HDKey: publicKey and privateKey at same time.');
        }
        if (opt.privateKey) {
            if (!secp256k1.utils.isValidPrivateKey(opt.privateKey)) {
                throw new Error('Invalid private key');
            }
            this.privKey =
                typeof opt.privateKey === 'bigint' ? opt.privateKey : bytesToNumber(opt.privateKey);
            this.privKeyBytes = numberToBytes(this.privKey);
            this.pubKey = secp256k1.getPublicKey(opt.privateKey, true);
        }
        else if (opt.publicKey) {
            this.pubKey = esm_Point.fromHex(opt.publicKey).toRawBytes(true);
        }
        else {
            throw new Error('HDKey: no public or private key provided');
        }
        this.pubHash = hash160(this.pubKey);
    }
    derive(path) {
        if (!/^[mM]'?/.test(path)) {
            throw new Error('Path must start with "m" or "M"');
        }
        if (/^[mM]'?$/.test(path)) {
            return this;
        }
        const parts = path.replace(/^[mM]'?\//, '').split('/');
        let child = this;
        for (const c of parts) {
            const m = /^(\d+)('?)$/.exec(c);
            if (!m || m.length !== 3) {
                throw new Error(`Invalid child index: ${c}`);
            }
            let idx = +m[1];
            if (!Number.isSafeInteger(idx) || idx >= HARDENED_OFFSET) {
                throw new Error('Invalid index');
            }
            if (m[2] === "'") {
                idx += HARDENED_OFFSET;
            }
            child = child.deriveChild(idx);
        }
        return child;
    }
    deriveChild(index) {
        if (!this.pubKey || !this.chainCode) {
            throw new Error('No publicKey or chainCode set');
        }
        let data = toU32(index);
        if (index >= HARDENED_OFFSET) {
            const priv = this.privateKey;
            if (!priv) {
                throw new Error('Could not derive hardened child key');
            }
            data = hashes_esm_utils_concatBytes(new Uint8Array([0]), priv, data);
        }
        else {
            data = hashes_esm_utils_concatBytes(this.pubKey, data);
        }
        const I = hmac_hmac(sha512, this.chainCode, data);
        const childTweak = bytesToNumber(I.slice(0, 32));
        const chainCode = I.slice(32);
        if (!secp256k1.utils.isValidPrivateKey(childTweak)) {
            throw new Error('Tweak bigger than curve order');
        }
        const opt = {
            versions: this.versions,
            chainCode,
            depth: this.depth + 1,
            parentFingerprint: this.fingerprint,
            index,
        };
        try {
            if (this.privateKey) {
                const added = mod(this.privKey + childTweak, secp256k1.CURVE.n);
                if (!secp256k1.utils.isValidPrivateKey(added)) {
                    throw new Error('The tweak was out of range or the resulted private key is invalid');
                }
                opt.privateKey = added;
            }
            else {
                const added = esm_Point.fromHex(this.pubKey).add(esm_Point.fromPrivateKey(childTweak));
                if (added.equals(esm_Point.ZERO)) {
                    throw new Error('The tweak was equal to negative P, which made the result key invalid');
                }
                opt.publicKey = added.toRawBytes(true);
            }
            return new HDKey(opt);
        }
        catch (err) {
            return this.deriveChild(index + 1);
        }
    }
    sign(hash) {
        if (!this.privateKey) {
            throw new Error('No privateKey set!');
        }
        esm_assert_bytes(hash, 32);
        return secp256k1.sign(hash, this.privKey).toCompactRawBytes();
    }
    verify(hash, signature) {
        esm_assert_bytes(hash, 32);
        esm_assert_bytes(signature, 64);
        if (!this.publicKey) {
            throw new Error('No publicKey set!');
        }
        let sig;
        try {
            sig = secp256k1.Signature.fromCompact(signature);
        }
        catch (error) {
            return false;
        }
        return secp256k1.verify(sig, hash, this.publicKey);
    }
    wipePrivateData() {
        this.privKey = undefined;
        if (this.privKeyBytes) {
            this.privKeyBytes.fill(0);
            this.privKeyBytes = undefined;
        }
        return this;
    }
    toJSON() {
        return {
            xpriv: this.privateExtendedKey,
            xpub: this.publicExtendedKey,
        };
    }
    serialize(version, key) {
        if (!this.chainCode) {
            throw new Error('No chainCode set');
        }
        esm_assert_bytes(key, 33);
        return hashes_esm_utils_concatBytes(toU32(version), new Uint8Array([this.depth]), toU32(this.parentFingerprint), toU32(this.index), this.chainCode, key);
    }
}
//# sourceMappingURL=index.js.map
;// CONCATENATED MODULE: ./node_modules/nostr-tools/lib/esm/nostr.mjs
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// keys.ts


function generatePrivateKey() {
  return esm_utils_bytesToHex(schnorr.utils.randomPrivateKey());
}
function getPublicKey(privateKey) {
  return esm_utils_bytesToHex(schnorr.getPublicKey(privateKey));
}

// event.ts




// utils.ts
var utils_exports = {};
__export(utils_exports, {
  MessageNode: () => MessageNode,
  MessageQueue: () => MessageQueue,
  insertEventIntoAscendingList: () => insertEventIntoAscendingList,
  insertEventIntoDescendingList: () => insertEventIntoDescendingList,
  normalizeURL: () => normalizeURL,
  utf8Decoder: () => utf8Decoder,
  utf8Encoder: () => utf8Encoder
});
var utf8Decoder = new TextDecoder("utf-8");
var utf8Encoder = new TextEncoder();
function normalizeURL(url) {
  let p = new URL(url);
  p.pathname = p.pathname.replace(/\/+/g, "/");
  if (p.pathname.endsWith("/"))
    p.pathname = p.pathname.slice(0, -1);
  if (p.port === "80" && p.protocol === "ws:" || p.port === "443" && p.protocol === "wss:")
    p.port = "";
  p.searchParams.sort();
  p.hash = "";
  return p.toString();
}
function insertEventIntoDescendingList(sortedArray, event) {
  let start = 0;
  let end = sortedArray.length - 1;
  let midPoint;
  let position = start;
  if (end < 0) {
    position = 0;
  } else if (event.created_at < sortedArray[end].created_at) {
    position = end + 1;
  } else if (event.created_at >= sortedArray[start].created_at) {
    position = start;
  } else
    while (true) {
      if (end <= start + 1) {
        position = end;
        break;
      }
      midPoint = Math.floor(start + (end - start) / 2);
      if (sortedArray[midPoint].created_at > event.created_at) {
        start = midPoint;
      } else if (sortedArray[midPoint].created_at < event.created_at) {
        end = midPoint;
      } else {
        position = midPoint;
        break;
      }
    }
  if (sortedArray[position]?.id !== event.id) {
    return [
      ...sortedArray.slice(0, position),
      event,
      ...sortedArray.slice(position)
    ];
  }
  return sortedArray;
}
function insertEventIntoAscendingList(sortedArray, event) {
  let start = 0;
  let end = sortedArray.length - 1;
  let midPoint;
  let position = start;
  if (end < 0) {
    position = 0;
  } else if (event.created_at > sortedArray[end].created_at) {
    position = end + 1;
  } else if (event.created_at <= sortedArray[start].created_at) {
    position = start;
  } else
    while (true) {
      if (end <= start + 1) {
        position = end;
        break;
      }
      midPoint = Math.floor(start + (end - start) / 2);
      if (sortedArray[midPoint].created_at < event.created_at) {
        start = midPoint;
      } else if (sortedArray[midPoint].created_at > event.created_at) {
        end = midPoint;
      } else {
        position = midPoint;
        break;
      }
    }
  if (sortedArray[position]?.id !== event.id) {
    return [
      ...sortedArray.slice(0, position),
      event,
      ...sortedArray.slice(position)
    ];
  }
  return sortedArray;
}
var MessageNode = class {
  _value;
  _next;
  get value() {
    return this._value;
  }
  set value(message) {
    this._value = message;
  }
  get next() {
    return this._next;
  }
  set next(node) {
    this._next = node;
  }
  constructor(message) {
    this._value = message;
    this._next = null;
  }
};
var MessageQueue = class {
  _first;
  _last;
  get first() {
    return this._first;
  }
  set first(messageNode) {
    this._first = messageNode;
  }
  get last() {
    return this._last;
  }
  set last(messageNode) {
    this._last = messageNode;
  }
  _size;
  get size() {
    return this._size;
  }
  set size(v) {
    this._size = v;
  }
  constructor() {
    this._first = null;
    this._last = null;
    this._size = 0;
  }
  enqueue(message) {
    const newNode = new MessageNode(message);
    if (this._size === 0 || !this._last) {
      this._first = newNode;
      this._last = newNode;
    } else {
      this._last.next = newNode;
      this._last = newNode;
    }
    this._size++;
    return true;
  }
  dequeue() {
    if (this._size === 0 || !this._first)
      return null;
    let prev = this._first;
    this._first = prev.next;
    prev.next = null;
    this._size--;
    return prev.value;
  }
};

// event.ts
var Kind = /* @__PURE__ */ ((Kind3) => {
  Kind3[Kind3["Metadata"] = 0] = "Metadata";
  Kind3[Kind3["Text"] = 1] = "Text";
  Kind3[Kind3["RecommendRelay"] = 2] = "RecommendRelay";
  Kind3[Kind3["Contacts"] = 3] = "Contacts";
  Kind3[Kind3["EncryptedDirectMessage"] = 4] = "EncryptedDirectMessage";
  Kind3[Kind3["EventDeletion"] = 5] = "EventDeletion";
  Kind3[Kind3["Repost"] = 6] = "Repost";
  Kind3[Kind3["Reaction"] = 7] = "Reaction";
  Kind3[Kind3["BadgeAward"] = 8] = "BadgeAward";
  Kind3[Kind3["ChannelCreation"] = 40] = "ChannelCreation";
  Kind3[Kind3["ChannelMetadata"] = 41] = "ChannelMetadata";
  Kind3[Kind3["ChannelMessage"] = 42] = "ChannelMessage";
  Kind3[Kind3["ChannelHideMessage"] = 43] = "ChannelHideMessage";
  Kind3[Kind3["ChannelMuteUser"] = 44] = "ChannelMuteUser";
  Kind3[Kind3["Blank"] = 255] = "Blank";
  Kind3[Kind3["Report"] = 1984] = "Report";
  Kind3[Kind3["ZapRequest"] = 9734] = "ZapRequest";
  Kind3[Kind3["Zap"] = 9735] = "Zap";
  Kind3[Kind3["RelayList"] = 10002] = "RelayList";
  Kind3[Kind3["ClientAuth"] = 22242] = "ClientAuth";
  Kind3[Kind3["HttpAuth"] = 27235] = "HttpAuth";
  Kind3[Kind3["ProfileBadge"] = 30008] = "ProfileBadge";
  Kind3[Kind3["BadgeDefinition"] = 30009] = "BadgeDefinition";
  Kind3[Kind3["Article"] = 30023] = "Article";
  return Kind3;
})(Kind || {});
function getBlankEvent(kind = 255 /* Blank */) {
  return {
    kind,
    content: "",
    tags: [],
    created_at: 0
  };
}
function finishEvent(t, privateKey) {
  let event = t;
  event.pubkey = getPublicKey(privateKey);
  event.id = getEventHash(event);
  event.sig = getSignature(event, privateKey);
  return event;
}
function serializeEvent(evt) {
  if (!validateEvent(evt))
    throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([
    0,
    evt.pubkey,
    evt.created_at,
    evt.kind,
    evt.tags,
    evt.content
  ]);
}
function getEventHash(event) {
  let eventHash = sha256_sha256(utf8Encoder.encode(serializeEvent(event)));
  return esm_utils_bytesToHex(eventHash);
}
var isRecord = (obj) => obj instanceof Object;
function validateEvent(event) {
  if (!isRecord(event))
    return false;
  if (typeof event.kind !== "number")
    return false;
  if (typeof event.content !== "string")
    return false;
  if (typeof event.created_at !== "number")
    return false;
  if (typeof event.pubkey !== "string")
    return false;
  if (!event.pubkey.match(/^[a-f0-9]{64}$/))
    return false;
  if (!Array.isArray(event.tags))
    return false;
  for (let i = 0; i < event.tags.length; i++) {
    let tag = event.tags[i];
    if (!Array.isArray(tag))
      return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] === "object")
        return false;
    }
  }
  return true;
}
function nostr_verifySignature(event) {
  try {
    return schnorr.verify(event.sig, getEventHash(event), event.pubkey);
  } catch (err) {
    return false;
  }
}
function signEvent(event, key) {
  console.warn(
    "nostr-tools: `signEvent` is deprecated and will be removed or changed in the future. Please use `getSignature` instead."
  );
  return getSignature(event, key);
}
function getSignature(event, key) {
  return esm_utils_bytesToHex(schnorr.sign(getEventHash(event), key));
}

// filter.ts
function matchFilter(filter, event) {
  if (filter.ids && filter.ids.indexOf(event.id) === -1) {
    if (!filter.ids.some((prefix) => event.id.startsWith(prefix))) {
      return false;
    }
  }
  if (filter.kinds && filter.kinds.indexOf(event.kind) === -1)
    return false;
  if (filter.authors && filter.authors.indexOf(event.pubkey) === -1) {
    if (!filter.authors.some((prefix) => event.pubkey.startsWith(prefix))) {
      return false;
    }
  }
  for (let f in filter) {
    if (f[0] === "#") {
      let tagName = f.slice(1);
      let values = filter[`#${tagName}`];
      if (values && !event.tags.find(
        ([t, v]) => t === f.slice(1) && values.indexOf(v) !== -1
      ))
        return false;
    }
  }
  if (filter.since && event.created_at < filter.since)
    return false;
  if (filter.until && event.created_at > filter.until)
    return false;
  return true;
}
function matchFilters(filters, event) {
  for (let i = 0; i < filters.length; i++) {
    if (matchFilter(filters[i], event))
      return true;
  }
  return false;
}
function mergeFilters(...filters) {
  let result = {};
  for (let i = 0; i < filters.length; i++) {
    let filter = filters[i];
    Object.entries(filter).forEach(([property, values]) => {
      if (property === "kinds" || property === "ids" || property === "authors" || property[0] === "#") {
        result[property] = result[property] || [];
        for (let v = 0; v < values.length; v++) {
          let value = values[v];
          if (!result[property].includes(value))
            result[property].push(value);
        }
      }
    });
    if (filter.limit && (!result.limit || filter.limit > result.limit))
      result.limit = filter.limit;
    if (filter.until && (!result.until || filter.until > result.until))
      result.until = filter.until;
    if (filter.since && (!result.since || filter.since < result.since))
      result.since = filter.since;
  }
  return result;
}

// fakejson.ts
var fakejson_exports = {};
__export(fakejson_exports, {
  getHex64: () => getHex64,
  getInt: () => getInt,
  getSubscriptionId: () => getSubscriptionId,
  matchEventId: () => matchEventId,
  matchEventKind: () => matchEventKind,
  matchEventPubkey: () => matchEventPubkey
});
function getHex64(json, field) {
  let len = field.length + 3;
  let idx = json.indexOf(`"${field}":`) + len;
  let s = json.slice(idx).indexOf(`"`) + idx + 1;
  return json.slice(s, s + 64);
}
function getInt(json, field) {
  let len = field.length;
  let idx = json.indexOf(`"${field}":`) + len + 3;
  let sliced = json.slice(idx);
  let end = Math.min(sliced.indexOf(","), sliced.indexOf("}"));
  return parseInt(sliced.slice(0, end), 10);
}
function getSubscriptionId(json) {
  let idx = json.slice(0, 22).indexOf(`"EVENT"`);
  if (idx === -1)
    return null;
  let pstart = json.slice(idx + 7 + 1).indexOf(`"`);
  if (pstart === -1)
    return null;
  let start = idx + 7 + 1 + pstart;
  let pend = json.slice(start + 1, 80).indexOf(`"`);
  if (pend === -1)
    return null;
  let end = start + 1 + pend;
  return json.slice(start + 1, end);
}
function matchEventId(json, id) {
  return id === getHex64(json, "id");
}
function matchEventPubkey(json, pubkey) {
  return pubkey === getHex64(json, "pubkey");
}
function matchEventKind(json, kind) {
  return kind === getInt(json, "kind");
}

// relay.ts
var newListeners = () => ({
  connect: [],
  disconnect: [],
  error: [],
  notice: [],
  auth: []
});
function relayInit(url, options = {}) {
  let { listTimeout = 3e3, getTimeout = 3e3, countTimeout = 3e3 } = options;
  var ws;
  var openSubs = {};
  var listeners = newListeners();
  var subListeners = {};
  var pubListeners = {};
  var connectionPromise;
  async function connectRelay() {
    if (connectionPromise)
      return connectionPromise;
    connectionPromise = new Promise((resolve, reject) => {
      try {
        ws = new WebSocket(url);
      } catch (err) {
        reject(err);
      }
      ws.onopen = () => {
        listeners.connect.forEach((cb) => cb());
        resolve();
      };
      ws.onerror = () => {
        connectionPromise = void 0;
        listeners.error.forEach((cb) => cb());
        reject();
      };
      ws.onclose = async () => {
        connectionPromise = void 0;
        listeners.disconnect.forEach((cb) => cb());
      };
      let incomingMessageQueue = new MessageQueue();
      let handleNextInterval;
      ws.onmessage = (e) => {
        incomingMessageQueue.enqueue(e.data);
        if (!handleNextInterval) {
          handleNextInterval = setInterval(handleNext, 0);
        }
      };
      function handleNext() {
        if (incomingMessageQueue.size === 0) {
          clearInterval(handleNextInterval);
          handleNextInterval = null;
          return;
        }
        var json = incomingMessageQueue.dequeue();
        if (!json)
          return;
        let subid = getSubscriptionId(json);
        if (subid) {
          let so = openSubs[subid];
          if (so && so.alreadyHaveEvent && so.alreadyHaveEvent(getHex64(json, "id"), url)) {
            return;
          }
        }
        try {
          let data = JSON.parse(json);
          switch (data[0]) {
            case "EVENT": {
              let id2 = data[1];
              let event = data[2];
              if (validateEvent(event) && openSubs[id2] && (openSubs[id2].skipVerification || nostr_verifySignature(event)) && matchFilters(openSubs[id2].filters, event)) {
                openSubs[id2];
                (subListeners[id2]?.event || []).forEach((cb) => cb(event));
              }
              return;
            }
            case "COUNT":
              let id = data[1];
              let payload = data[2];
              if (openSubs[id]) {
                ;
                (subListeners[id]?.count || []).forEach((cb) => cb(payload));
              }
              return;
            case "EOSE": {
              let id2 = data[1];
              if (id2 in subListeners) {
                subListeners[id2].eose.forEach((cb) => cb());
                subListeners[id2].eose = [];
              }
              return;
            }
            case "OK": {
              let id2 = data[1];
              let ok = data[2];
              let reason = data[3] || "";
              if (id2 in pubListeners) {
                if (ok)
                  pubListeners[id2].ok.forEach((cb) => cb());
                else
                  pubListeners[id2].failed.forEach((cb) => cb(reason));
                pubListeners[id2].ok = [];
                pubListeners[id2].failed = [];
              }
              return;
            }
            case "NOTICE":
              let notice = data[1];
              listeners.notice.forEach((cb) => cb(notice));
              return;
            case "AUTH": {
              let challenge = data[1];
              listeners.auth?.forEach((cb) => cb(challenge));
              return;
            }
          }
        } catch (err) {
          return;
        }
      }
    });
    return connectionPromise;
  }
  function connected() {
    return ws?.readyState === 1;
  }
  async function connect() {
    if (connected())
      return;
    await connectRelay();
  }
  async function trySend(params) {
    let msg = JSON.stringify(params);
    if (!connected()) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      if (!connected()) {
        return;
      }
    }
    try {
      ws.send(msg);
    } catch (err) {
      console.log(err);
    }
  }
  const sub = (filters, {
    verb = "REQ",
    skipVerification = false,
    alreadyHaveEvent = null,
    id = Math.random().toString().slice(2)
  } = {}) => {
    let subid = id;
    openSubs[subid] = {
      id: subid,
      filters,
      skipVerification,
      alreadyHaveEvent
    };
    trySend([verb, subid, ...filters]);
    return {
      sub: (newFilters, newOpts = {}) => sub(newFilters || filters, {
        skipVerification: newOpts.skipVerification || skipVerification,
        alreadyHaveEvent: newOpts.alreadyHaveEvent || alreadyHaveEvent,
        id: subid
      }),
      unsub: () => {
        delete openSubs[subid];
        delete subListeners[subid];
        trySend(["CLOSE", subid]);
      },
      on: (type, cb) => {
        subListeners[subid] = subListeners[subid] || {
          event: [],
          count: [],
          eose: []
        };
        subListeners[subid][type].push(cb);
      },
      off: (type, cb) => {
        let listeners2 = subListeners[subid];
        let idx = listeners2[type].indexOf(cb);
        if (idx >= 0)
          listeners2[type].splice(idx, 1);
      }
    };
  };
  function _publishEvent(event, type) {
    if (!event.id)
      throw new Error(`event ${event} has no id`);
    let id = event.id;
    trySend([type, event]);
    return {
      on: (type2, cb) => {
        pubListeners[id] = pubListeners[id] || {
          ok: [],
          failed: []
        };
        pubListeners[id][type2].push(cb);
      },
      off: (type2, cb) => {
        let listeners2 = pubListeners[id];
        if (!listeners2)
          return;
        let idx = listeners2[type2].indexOf(cb);
        if (idx >= 0)
          listeners2[type2].splice(idx, 1);
      }
    };
  }
  return {
    url,
    sub,
    on: (type, cb) => {
      listeners[type].push(cb);
      if (type === "connect" && ws?.readyState === 1) {
        ;
        cb();
      }
    },
    off: (type, cb) => {
      let index = listeners[type].indexOf(cb);
      if (index !== -1)
        listeners[type].splice(index, 1);
    },
    list: (filters, opts) => new Promise((resolve) => {
      let s = sub(filters, opts);
      let events = [];
      let timeout = setTimeout(() => {
        s.unsub();
        resolve(events);
      }, listTimeout);
      s.on("eose", () => {
        s.unsub();
        clearTimeout(timeout);
        resolve(events);
      });
      s.on("event", (event) => {
        events.push(event);
      });
    }),
    get: (filter, opts) => new Promise((resolve) => {
      let s = sub([filter], opts);
      let timeout = setTimeout(() => {
        s.unsub();
        resolve(null);
      }, getTimeout);
      s.on("event", (event) => {
        s.unsub();
        clearTimeout(timeout);
        resolve(event);
      });
    }),
    count: (filters) => new Promise((resolve) => {
      let s = sub(filters, { ...sub, verb: "COUNT" });
      let timeout = setTimeout(() => {
        s.unsub();
        resolve(null);
      }, countTimeout);
      s.on("count", (event) => {
        s.unsub();
        clearTimeout(timeout);
        resolve(event);
      });
    }),
    publish(event) {
      return _publishEvent(event, "EVENT");
    },
    auth(event) {
      return _publishEvent(event, "AUTH");
    },
    connect,
    close() {
      listeners = newListeners();
      subListeners = {};
      pubListeners = {};
      if (ws.readyState === WebSocket.OPEN) {
        ws?.close();
      }
    },
    get status() {
      return ws?.readyState ?? 3;
    }
  };
}

// pool.ts
var SimplePool = class {
  _conn;
  _seenOn = {};
  eoseSubTimeout;
  getTimeout;
  seenOnEnabled = true;
  constructor(options = {}) {
    this._conn = {};
    this.eoseSubTimeout = options.eoseSubTimeout || 3400;
    this.getTimeout = options.getTimeout || 3400;
    this.seenOnEnabled = options.seenOnEnabled !== false;
  }
  close(relays) {
    relays.forEach((url) => {
      let relay = this._conn[normalizeURL(url)];
      if (relay)
        relay.close();
    });
  }
  async ensureRelay(url) {
    const nm = normalizeURL(url);
    if (!this._conn[nm]) {
      this._conn[nm] = relayInit(nm, {
        getTimeout: this.getTimeout * 0.9,
        listTimeout: this.getTimeout * 0.9
      });
    }
    const relay = this._conn[nm];
    await relay.connect();
    return relay;
  }
  sub(relays, filters, opts) {
    let _knownIds = /* @__PURE__ */ new Set();
    let modifiedOpts = { ...opts || {} };
    modifiedOpts.alreadyHaveEvent = (id, url) => {
      if (opts?.alreadyHaveEvent?.(id, url)) {
        return true;
      }
      if (this.seenOnEnabled) {
        let set = this._seenOn[id] || /* @__PURE__ */ new Set();
        set.add(url);
        this._seenOn[id] = set;
      }
      return _knownIds.has(id);
    };
    let subs = [];
    let eventListeners = /* @__PURE__ */ new Set();
    let eoseListeners = /* @__PURE__ */ new Set();
    let eosesMissing = relays.length;
    let eoseSent = false;
    let eoseTimeout = setTimeout(() => {
      eoseSent = true;
      for (let cb of eoseListeners.values())
        cb();
    }, this.eoseSubTimeout);
    relays.forEach(async (relay) => {
      let r;
      try {
        r = await this.ensureRelay(relay);
      } catch (err) {
        handleEose();
        return;
      }
      if (!r)
        return;
      let s = r.sub(filters, modifiedOpts);
      s.on("event", (event) => {
        _knownIds.add(event.id);
        for (let cb of eventListeners.values())
          cb(event);
      });
      s.on("eose", () => {
        if (eoseSent)
          return;
        handleEose();
      });
      subs.push(s);
      function handleEose() {
        eosesMissing--;
        if (eosesMissing === 0) {
          clearTimeout(eoseTimeout);
          for (let cb of eoseListeners.values())
            cb();
        }
      }
    });
    let greaterSub = {
      sub(filters2, opts2) {
        subs.forEach((sub) => sub.sub(filters2, opts2));
        return greaterSub;
      },
      unsub() {
        subs.forEach((sub) => sub.unsub());
      },
      on(type, cb) {
        if (type === "event") {
          eventListeners.add(cb);
        } else if (type === "eose") {
          eoseListeners.add(cb);
        }
      },
      off(type, cb) {
        if (type === "event") {
          eventListeners.delete(cb);
        } else if (type === "eose")
          eoseListeners.delete(cb);
      }
    };
    return greaterSub;
  }
  get(relays, filter, opts) {
    return new Promise((resolve) => {
      let sub = this.sub(relays, [filter], opts);
      let timeout = setTimeout(() => {
        sub.unsub();
        resolve(null);
      }, this.getTimeout);
      sub.on("event", (event) => {
        resolve(event);
        clearTimeout(timeout);
        sub.unsub();
      });
    });
  }
  list(relays, filters, opts) {
    return new Promise((resolve) => {
      let events = [];
      let sub = this.sub(relays, filters, opts);
      sub.on("event", (event) => {
        events.push(event);
      });
      sub.on("eose", () => {
        sub.unsub();
        resolve(events);
      });
    });
  }
  publish(relays, event) {
    const pubPromises = relays.map(async (relay) => {
      let r;
      try {
        r = await this.ensureRelay(relay);
        return r.publish(event);
      } catch (_) {
        return { on() {
        }, off() {
        } };
      }
    });
    const callbackMap = /* @__PURE__ */ new Map();
    return {
      on(type, cb) {
        relays.forEach(async (relay, i) => {
          let pub = await pubPromises[i];
          let callback = () => cb(relay);
          callbackMap.set(cb, callback);
          pub.on(type, callback);
        });
      },
      off(type, cb) {
        relays.forEach(async (_, i) => {
          let callback = callbackMap.get(cb);
          if (callback) {
            let pub = await pubPromises[i];
            pub.off(type, callback);
          }
        });
      }
    };
  }
  seenOn(id) {
    return Array.from(this._seenOn[id]?.values?.() || []);
  }
};

// nip19.ts
var nip19_exports = {};
__export(nip19_exports, {
  BECH32_REGEX: () => BECH32_REGEX,
  decode: () => nostr_decode,
  naddrEncode: () => naddrEncode,
  neventEncode: () => neventEncode,
  noteEncode: () => noteEncode,
  nprofileEncode: () => nprofileEncode,
  npubEncode: () => npubEncode,
  nrelayEncode: () => nrelayEncode,
  nsecEncode: () => nsecEncode
});


var Bech32MaxSize = 5e3;
var BECH32_REGEX = /[\x21-\x7E]{1,83}1[023456789acdefghjklmnpqrstuvwxyz]{6,}/;
function nostr_decode(nip19) {
  let { prefix, words } = bech32.decode(nip19, Bech32MaxSize);
  let data = new Uint8Array(bech32.fromWords(words));
  switch (prefix) {
    case "nprofile": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nprofile");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      return {
        type: "nprofile",
        data: {
          pubkey: esm_utils_bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nevent": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nevent");
      if (tlv[0][0].length !== 32)
        throw new Error("TLV 0 should be 32 bytes");
      if (tlv[2] && tlv[2][0].length !== 32)
        throw new Error("TLV 2 should be 32 bytes");
      return {
        type: "nevent",
        data: {
          id: esm_utils_bytesToHex(tlv[0][0]),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : [],
          author: tlv[2]?.[0] ? esm_utils_bytesToHex(tlv[2][0]) : void 0
        }
      };
    }
    case "naddr": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for naddr");
      if (!tlv[2]?.[0])
        throw new Error("missing TLV 2 for naddr");
      if (tlv[2][0].length !== 32)
        throw new Error("TLV 2 should be 32 bytes");
      if (!tlv[3]?.[0])
        throw new Error("missing TLV 3 for naddr");
      if (tlv[3][0].length !== 4)
        throw new Error("TLV 3 should be 4 bytes");
      return {
        type: "naddr",
        data: {
          identifier: utf8Decoder.decode(tlv[0][0]),
          pubkey: esm_utils_bytesToHex(tlv[2][0]),
          kind: parseInt(esm_utils_bytesToHex(tlv[3][0]), 16),
          relays: tlv[1] ? tlv[1].map((d) => utf8Decoder.decode(d)) : []
        }
      };
    }
    case "nrelay": {
      let tlv = parseTLV(data);
      if (!tlv[0]?.[0])
        throw new Error("missing TLV 0 for nrelay");
      return {
        type: "nrelay",
        data: utf8Decoder.decode(tlv[0][0])
      };
    }
    case "nsec":
    case "npub":
    case "note":
      return { type: prefix, data: esm_utils_bytesToHex(data) };
    default:
      throw new Error(`unknown prefix ${prefix}`);
  }
}
function parseTLV(data) {
  let result = {};
  let rest = data;
  while (rest.length > 0) {
    let t = rest[0];
    let l = rest[1];
    if (!l)
      throw new Error(`malformed TLV ${t}`);
    let v = rest.slice(2, 2 + l);
    rest = rest.slice(2 + l);
    if (v.length < l)
      throw new Error(`not enough data to read on TLV ${t}`);
    result[t] = result[t] || [];
    result[t].push(v);
  }
  return result;
}
function nsecEncode(hex) {
  return encodeBytes("nsec", hex);
}
function npubEncode(hex) {
  return encodeBytes("npub", hex);
}
function noteEncode(hex) {
  return encodeBytes("note", hex);
}
function encodeBech32(prefix, data) {
  let words = bech32.toWords(data);
  return bech32.encode(prefix, words, Bech32MaxSize);
}
function encodeBytes(prefix, hex) {
  let data = esm_utils_hexToBytes(hex);
  return encodeBech32(prefix, data);
}
function nprofileEncode(profile) {
  let data = encodeTLV({
    0: [esm_utils_hexToBytes(profile.pubkey)],
    1: (profile.relays || []).map((url) => utf8Encoder.encode(url))
  });
  return encodeBech32("nprofile", data);
}
function neventEncode(event) {
  let data = encodeTLV({
    0: [esm_utils_hexToBytes(event.id)],
    1: (event.relays || []).map((url) => utf8Encoder.encode(url)),
    2: event.author ? [esm_utils_hexToBytes(event.author)] : []
  });
  return encodeBech32("nevent", data);
}
function naddrEncode(addr) {
  let kind = new ArrayBuffer(4);
  new DataView(kind).setUint32(0, addr.kind, false);
  let data = encodeTLV({
    0: [utf8Encoder.encode(addr.identifier)],
    1: (addr.relays || []).map((url) => utf8Encoder.encode(url)),
    2: [esm_utils_hexToBytes(addr.pubkey)],
    3: [new Uint8Array(kind)]
  });
  return encodeBech32("naddr", data);
}
function nrelayEncode(url) {
  let data = encodeTLV({
    0: [utf8Encoder.encode(url)]
  });
  return encodeBech32("nrelay", data);
}
function encodeTLV(tlv) {
  let entries = [];
  Object.entries(tlv).forEach(([t, vs]) => {
    vs.forEach((v) => {
      let entry = new Uint8Array(v.length + 2);
      entry.set([parseInt(t)], 0);
      entry.set([v.length], 1);
      entry.set(v, 2);
      entries.push(entry);
    });
  });
  return esm_utils_concatBytes(...entries);
}

// references.ts
var mentionRegex = /\bnostr:((note|npub|naddr|nevent|nprofile)1\w+)\b|#\[(\d+)\]/g;
function parseReferences(evt) {
  let references = [];
  for (let ref of evt.content.matchAll(mentionRegex)) {
    if (ref[2]) {
      try {
        let { type, data } = nostr_decode(ref[1]);
        switch (type) {
          case "npub": {
            references.push({
              text: ref[0],
              profile: { pubkey: data, relays: [] }
            });
            break;
          }
          case "nprofile": {
            references.push({
              text: ref[0],
              profile: data
            });
            break;
          }
          case "note": {
            references.push({
              text: ref[0],
              event: { id: data, relays: [] }
            });
            break;
          }
          case "nevent": {
            references.push({
              text: ref[0],
              event: data
            });
            break;
          }
          case "naddr": {
            references.push({
              text: ref[0],
              address: data
            });
            break;
          }
        }
      } catch (err) {
      }
    } else if (ref[3]) {
      let idx = parseInt(ref[3], 10);
      let tag = evt.tags[idx];
      if (!tag)
        continue;
      switch (tag[0]) {
        case "p": {
          references.push({
            text: ref[0],
            profile: { pubkey: tag[1], relays: tag[2] ? [tag[2]] : [] }
          });
          break;
        }
        case "e": {
          references.push({
            text: ref[0],
            event: { id: tag[1], relays: tag[2] ? [tag[2]] : [] }
          });
          break;
        }
        case "a": {
          try {
            let [kind, pubkey, identifier] = tag[1].split(":");
            references.push({
              text: ref[0],
              address: {
                identifier,
                pubkey,
                kind: parseInt(kind, 10),
                relays: tag[2] ? [tag[2]] : []
              }
            });
          } catch (err) {
          }
          break;
        }
      }
    }
  }
  return references;
}

// nip04.ts
var nip04_exports = {};
__export(nip04_exports, {
  decrypt: () => decrypt,
  encrypt: () => encrypt
});



if (typeof crypto !== "undefined" && !crypto.subtle && crypto.webcrypto) {
  crypto.subtle = crypto.webcrypto.subtle;
}
async function encrypt(privkey, pubkey, text) {
  const key = secp256k1.getSharedSecret(privkey, "02" + pubkey);
  const normalizedKey = getNormalizedX(key);
  let iv = Uint8Array.from(utils_randomBytes(16));
  let plaintext = utf8Encoder.encode(text);
  let cryptoKey = await crypto.subtle.importKey(
    "raw",
    normalizedKey,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );
  let ciphertext = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    plaintext
  );
  let ctb64 = base64.encode(new Uint8Array(ciphertext));
  let ivb64 = base64.encode(new Uint8Array(iv.buffer));
  return `${ctb64}?iv=${ivb64}`;
}
async function decrypt(privkey, pubkey, data) {
  let [ctb64, ivb64] = data.split("?iv=");
  let key = secp256k1.getSharedSecret(privkey, "02" + pubkey);
  let normalizedKey = getNormalizedX(key);
  let cryptoKey = await crypto.subtle.importKey(
    "raw",
    normalizedKey,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  let ciphertext = base64.decode(ctb64);
  let iv = base64.decode(ivb64);
  let plaintext = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    ciphertext
  );
  let text = utf8Decoder.decode(plaintext);
  return text;
}
function getNormalizedX(key) {
  return key.slice(1, 33);
}

// nip05.ts
var nip05_exports = {};
__export(nip05_exports, {
  NIP05_REGEX: () => NIP05_REGEX,
  queryProfile: () => queryProfile,
  searchDomain: () => searchDomain,
  useFetchImplementation: () => useFetchImplementation
});
var NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w.-]+)$/;
var _fetch;
try {
  _fetch = fetch;
} catch {
}
function useFetchImplementation(fetchImplementation) {
  _fetch = fetchImplementation;
}
async function searchDomain(domain, query = "") {
  try {
    let res = await (await _fetch(`https://${domain}/.well-known/nostr.json?name=${query}`)).json();
    return res.names;
  } catch (_) {
    return {};
  }
}
async function queryProfile(fullname) {
  const match = fullname.match(NIP05_REGEX);
  if (!match)
    return null;
  const [_, name = "_", domain] = match;
  try {
    const res = await _fetch(`https://${domain}/.well-known/nostr.json?name=${name}`);
    const { names, relays } = parseNIP05Result(await res.json());
    const pubkey = names[name];
    return pubkey ? { pubkey, relays: relays?.[pubkey] } : null;
  } catch (_e) {
    return null;
  }
}
function parseNIP05Result(json) {
  const result = {
    names: {}
  };
  for (const [name, pubkey] of Object.entries(json.names)) {
    if (typeof name === "string" && typeof pubkey === "string") {
      result.names[name] = pubkey;
    }
  }
  if (json.relays) {
    result.relays = {};
    for (const [pubkey, relays] of Object.entries(json.relays)) {
      if (typeof pubkey === "string" && Array.isArray(relays)) {
        result.relays[pubkey] = relays.filter((relay) => typeof relay === "string");
      }
    }
  }
  return result;
}

// nip06.ts
var nip06_exports = {};
__export(nip06_exports, {
  generateSeedWords: () => generateSeedWords,
  privateKeyFromSeedWords: () => privateKeyFromSeedWords,
  validateWords: () => validateWords
});




function privateKeyFromSeedWords(mnemonic, passphrase) {
  let root = HDKey.fromMasterSeed((0,bip39/* mnemonicToSeedSync */.Z1)(mnemonic, passphrase));
  let privateKey = root.derive(`m/44'/1237'/0'/0/0`).privateKey;
  if (!privateKey)
    throw new Error("could not derive private key");
  return esm_utils_bytesToHex(privateKey);
}
function generateSeedWords() {
  return (0,bip39/* generateMnemonic */.OF)(english/* wordlist */.U);
}
function validateWords(words) {
  return (0,bip39/* validateMnemonic */._I)(words, english/* wordlist */.U);
}

// nip10.ts
var nip10_exports = {};
__export(nip10_exports, {
  parse: () => parse
});
function parse(event) {
  const result = {
    reply: void 0,
    root: void 0,
    mentions: [],
    profiles: []
  };
  const eTags = [];
  for (const tag of event.tags) {
    if (tag[0] === "e" && tag[1]) {
      eTags.push(tag);
    }
    if (tag[0] === "p" && tag[1]) {
      result.profiles.push({
        pubkey: tag[1],
        relays: tag[2] ? [tag[2]] : []
      });
    }
  }
  for (let eTagIndex = 0; eTagIndex < eTags.length; eTagIndex++) {
    const eTag = eTags[eTagIndex];
    const [_, eTagEventId, eTagRelayUrl, eTagMarker] = eTag;
    const eventPointer = {
      id: eTagEventId,
      relays: eTagRelayUrl ? [eTagRelayUrl] : []
    };
    const isFirstETag = eTagIndex === 0;
    const isLastETag = eTagIndex === eTags.length - 1;
    if (eTagMarker === "root") {
      result.root = eventPointer;
      continue;
    }
    if (eTagMarker === "reply") {
      result.reply = eventPointer;
      continue;
    }
    if (eTagMarker === "mention") {
      result.mentions.push(eventPointer);
      continue;
    }
    if (isFirstETag) {
      result.root = eventPointer;
      continue;
    }
    if (isLastETag) {
      result.reply = eventPointer;
      continue;
    }
    result.mentions.push(eventPointer);
  }
  return result;
}

// nip13.ts
var nip13_exports = {};
__export(nip13_exports, {
  getPow: () => getPow
});

function getPow(id) {
  return getLeadingZeroBits(esm_utils_hexToBytes(id));
}
function getLeadingZeroBits(hash) {
  let total, i, bits;
  for (i = 0, total = 0; i < hash.length; i++) {
    bits = msb(hash[i]);
    total += bits;
    if (bits !== 8) {
      break;
    }
  }
  return total;
}
function msb(b) {
  let n = 0;
  if (b === 0) {
    return 8;
  }
  while (b >>= 1) {
    n++;
  }
  return 7 - n;
}

// nip18.ts
var nip18_exports = {};
__export(nip18_exports, {
  finishRepostEvent: () => finishRepostEvent,
  getRepostedEvent: () => getRepostedEvent,
  getRepostedEventPointer: () => getRepostedEventPointer
});
function finishRepostEvent(t, reposted, relayUrl, privateKey) {
  return finishEvent({
    kind: 6 /* Repost */,
    tags: [
      ...t.tags ?? [],
      ["e", reposted.id, relayUrl],
      ["p", reposted.pubkey]
    ],
    content: t.content === "" ? "" : JSON.stringify(reposted),
    created_at: t.created_at
  }, privateKey);
}
function getRepostedEventPointer(event) {
  if (event.kind !== 6 /* Repost */) {
    return void 0;
  }
  let lastETag;
  let lastPTag;
  for (let i = event.tags.length - 1; i >= 0 && (lastETag === void 0 || lastPTag === void 0); i--) {
    const tag = event.tags[i];
    if (tag.length >= 2) {
      if (tag[0] === "e" && lastETag === void 0) {
        lastETag = tag;
      } else if (tag[0] === "p" && lastPTag === void 0) {
        lastPTag = tag;
      }
    }
  }
  if (lastETag === void 0) {
    return void 0;
  }
  return {
    id: lastETag[1],
    relays: [lastETag[2], lastPTag?.[2]].filter((x) => typeof x === "string"),
    author: lastPTag?.[1]
  };
}
function getRepostedEvent(event, { skipVerification } = {}) {
  const pointer = getRepostedEventPointer(event);
  if (pointer === void 0 || event.content === "") {
    return void 0;
  }
  let repostedEvent;
  try {
    repostedEvent = JSON.parse(event.content);
  } catch (error) {
    return void 0;
  }
  if (repostedEvent.id !== pointer.id) {
    return void 0;
  }
  if (!skipVerification && !nostr_verifySignature(repostedEvent)) {
    return void 0;
  }
  return repostedEvent;
}

// nip21.ts
var nip21_exports = {};
__export(nip21_exports, {
  NOSTR_URI_REGEX: () => NOSTR_URI_REGEX,
  parse: () => parse2,
  test: () => test
});
var NOSTR_URI_REGEX = new RegExp(`nostr:(${BECH32_REGEX.source})`);
function test(value) {
  return typeof value === "string" && new RegExp(`^${NOSTR_URI_REGEX.source}$`).test(value);
}
function parse2(uri) {
  const match = uri.match(new RegExp(`^${NOSTR_URI_REGEX.source}$`));
  if (!match)
    throw new Error(`Invalid Nostr URI: ${uri}`);
  return {
    uri: match[0],
    value: match[1],
    decoded: nostr_decode(match[1])
  };
}

// nip25.ts
var nip25_exports = {};
__export(nip25_exports, {
  finishReactionEvent: () => finishReactionEvent,
  getReactedEventPointer: () => getReactedEventPointer
});
function finishReactionEvent(t, reacted, privateKey) {
  const inheritedTags = reacted.tags.filter(
    (tag) => tag.length >= 2 && (tag[0] === "e" || tag[0] === "p")
  );
  return finishEvent({
    ...t,
    kind: 7 /* Reaction */,
    tags: [
      ...t.tags ?? [],
      ...inheritedTags,
      ["e", reacted.id],
      ["p", reacted.pubkey]
    ],
    content: t.content ?? "+"
  }, privateKey);
}
function getReactedEventPointer(event) {
  if (event.kind !== 7 /* Reaction */) {
    return void 0;
  }
  let lastETag;
  let lastPTag;
  for (let i = event.tags.length - 1; i >= 0 && (lastETag === void 0 || lastPTag === void 0); i--) {
    const tag = event.tags[i];
    if (tag.length >= 2) {
      if (tag[0] === "e" && lastETag === void 0) {
        lastETag = tag;
      } else if (tag[0] === "p" && lastPTag === void 0) {
        lastPTag = tag;
      }
    }
  }
  if (lastETag === void 0 || lastPTag === void 0) {
    return void 0;
  }
  return {
    id: lastETag[1],
    relays: [lastETag[2], lastPTag[2]].filter((x) => x !== void 0),
    author: lastPTag[1]
  };
}

// nip26.ts
var nip26_exports = {};
__export(nip26_exports, {
  createDelegation: () => createDelegation,
  getDelegator: () => getDelegator
});



function createDelegation(privateKey, parameters) {
  let conditions = [];
  if ((parameters.kind || -1) >= 0)
    conditions.push(`kind=${parameters.kind}`);
  if (parameters.until)
    conditions.push(`created_at<${parameters.until}`);
  if (parameters.since)
    conditions.push(`created_at>${parameters.since}`);
  let cond = conditions.join("&");
  if (cond === "")
    throw new Error("refusing to create a delegation without any conditions");
  let sighash = sha256_sha256(
    utf8Encoder.encode(`nostr:delegation:${parameters.pubkey}:${cond}`)
  );
  let sig = esm_utils_bytesToHex(
    schnorr.sign(sighash, privateKey)
  );
  return {
    from: getPublicKey(privateKey),
    to: parameters.pubkey,
    cond,
    sig
  };
}
function getDelegator(event) {
  let tag = event.tags.find((tag2) => tag2[0] === "delegation" && tag2.length >= 4);
  if (!tag)
    return null;
  let pubkey = tag[1];
  let cond = tag[2];
  let sig = tag[3];
  let conditions = cond.split("&");
  for (let i = 0; i < conditions.length; i++) {
    let [key, operator, value] = conditions[i].split(/\b/);
    if (key === "kind" && operator === "=" && event.kind === parseInt(value))
      continue;
    else if (key === "created_at" && operator === "<" && event.created_at < parseInt(value))
      continue;
    else if (key === "created_at" && operator === ">" && event.created_at > parseInt(value))
      continue;
    else
      return null;
  }
  let sighash = sha256_sha256(
    utf8Encoder.encode(`nostr:delegation:${event.pubkey}:${cond}`)
  );
  if (!schnorr.verify(sig, sighash, pubkey))
    return null;
  return pubkey;
}

// nip27.ts
var nip27_exports = {};
__export(nip27_exports, {
  matchAll: () => matchAll,
  regex: () => regex,
  replaceAll: () => replaceAll
});
var regex = () => new RegExp(`\\b${NOSTR_URI_REGEX.source}\\b`, "g");
function* matchAll(content) {
  const matches = content.matchAll(regex());
  for (const match of matches) {
    try {
      const [uri, value] = match;
      yield {
        uri,
        value,
        decoded: nostr_decode(value),
        start: match.index,
        end: match.index + uri.length
      };
    } catch (_e) {
    }
  }
}
function replaceAll(content, replacer) {
  return content.replaceAll(regex(), (uri, value) => {
    return replacer({
      uri,
      value,
      decoded: nostr_decode(value)
    });
  });
}

// nip39.ts
var nip39_exports = {};
__export(nip39_exports, {
  useFetchImplementation: () => useFetchImplementation2,
  validateGithub: () => validateGithub
});
var _fetch2;
try {
  _fetch2 = fetch;
} catch {
}
function useFetchImplementation2(fetchImplementation) {
  _fetch2 = fetchImplementation;
}
async function validateGithub(pubkey, username, proof) {
  try {
    let res = await (await _fetch2(`https://gist.github.com/${username}/${proof}/raw`)).text();
    return res === `Verifying that I control the following Nostr public key: ${pubkey}`;
  } catch (_) {
    return false;
  }
}

// nip42.ts
var nip42_exports = {};
__export(nip42_exports, {
  authenticate: () => authenticate
});
var authenticate = async ({
  challenge,
  relay,
  sign
}) => {
  const e = {
    kind: 22242 /* ClientAuth */,
    created_at: Math.floor(Date.now() / 1e3),
    tags: [
      ["relay", relay.url],
      ["challenge", challenge]
    ],
    content: ""
  };
  const pub = relay.auth(await sign(e));
  return new Promise((resolve, reject) => {
    pub.on("ok", function ok() {
      pub.off("ok", ok);
      resolve();
    });
    pub.on("failed", function fail(reason) {
      pub.off("failed", fail);
      reject(reason);
    });
  });
};

// nip57.ts
var nip57_exports = {};
__export(nip57_exports, {
  getZapEndpoint: () => getZapEndpoint,
  makeZapReceipt: () => makeZapReceipt,
  makeZapRequest: () => makeZapRequest,
  useFetchImplementation: () => useFetchImplementation3,
  validateZapRequest: () => validateZapRequest
});

var _fetch3;
try {
  _fetch3 = fetch;
} catch {
}
function useFetchImplementation3(fetchImplementation) {
  _fetch3 = fetchImplementation;
}
async function getZapEndpoint(metadata) {
  try {
    let lnurl = "";
    let { lud06, lud16 } = JSON.parse(metadata.content);
    if (lud06) {
      let { words } = bech32.decode(lud06, 1e3);
      let data = bech32.fromWords(words);
      lnurl = utf8Decoder.decode(data);
    } else if (lud16) {
      let [name, domain] = lud16.split("@");
      lnurl = `https://${domain}/.well-known/lnurlp/${name}`;
    } else {
      return null;
    }
    let res = await _fetch3(lnurl);
    let body = await res.json();
    if (body.allowsNostr && body.nostrPubkey) {
      return body.callback;
    }
  } catch (err) {
  }
  return null;
}
function makeZapRequest({
  profile,
  event,
  amount,
  relays,
  comment = ""
}) {
  if (!amount)
    throw new Error("amount not given");
  if (!profile)
    throw new Error("profile not given");
  let zr = {
    kind: 9734,
    created_at: Math.round(Date.now() / 1e3),
    content: comment,
    tags: [
      ["p", profile],
      ["amount", amount.toString()],
      ["relays", ...relays]
    ]
  };
  if (event) {
    zr.tags.push(["e", event]);
  }
  return zr;
}
function validateZapRequest(zapRequestString) {
  let zapRequest;
  try {
    zapRequest = JSON.parse(zapRequestString);
  } catch (err) {
    return "Invalid zap request JSON.";
  }
  if (!validateEvent(zapRequest))
    return "Zap request is not a valid Nostr event.";
  if (!nostr_verifySignature(zapRequest))
    return "Invalid signature on zap request.";
  let p = zapRequest.tags.find(([t, v]) => t === "p" && v);
  if (!p)
    return "Zap request doesn't have a 'p' tag.";
  if (!p[1].match(/^[a-f0-9]{64}$/))
    return "Zap request 'p' tag is not valid hex.";
  let e = zapRequest.tags.find(([t, v]) => t === "e" && v);
  if (e && !e[1].match(/^[a-f0-9]{64}$/))
    return "Zap request 'e' tag is not valid hex.";
  let relays = zapRequest.tags.find(([t, v]) => t === "relays" && v);
  if (!relays)
    return "Zap request doesn't have a 'relays' tag.";
  return null;
}
function makeZapReceipt({
  zapRequest,
  preimage,
  bolt11,
  paidAt
}) {
  let zr = JSON.parse(zapRequest);
  let tagsFromZapRequest = zr.tags.filter(
    ([t]) => t === "e" || t === "p" || t === "a"
  );
  let zap = {
    kind: 9735,
    created_at: Math.round(paidAt.getTime() / 1e3),
    content: "",
    tags: [
      ...tagsFromZapRequest,
      ["bolt11", bolt11],
      ["description", zapRequest]
    ]
  };
  if (preimage) {
    zap.tags.push(["preimage", preimage]);
  }
  return zap;
}

// nip98.ts
var nip98_exports = {};
__export(nip98_exports, {
  getToken: () => getToken,
  validateToken: () => validateToken
});

var _authorizationScheme = "Nostr ";
async function getToken(loginUrl, httpMethod, sign, includeAuthorizationScheme = false) {
  if (!loginUrl || !httpMethod)
    throw new Error("Missing loginUrl or httpMethod");
  if (httpMethod !== "get" /* Get */ && httpMethod !== "post" /* Post */)
    throw new Error("Unknown httpMethod");
  const event = getBlankEvent(27235 /* HttpAuth */);
  event.tags = [
    ["u", loginUrl],
    ["method", httpMethod]
  ];
  event.created_at = Math.round(new Date().getTime() / 1e3);
  const signedEvent = await sign(event);
  const authorizationScheme = includeAuthorizationScheme ? _authorizationScheme : "";
  return authorizationScheme + base64.encode(utf8Encoder.encode(JSON.stringify(signedEvent)));
}
async function validateToken(token, url, method) {
  if (!token) {
    throw new Error("Missing token");
  }
  token = token.replace(_authorizationScheme, "");
  const eventB64 = utf8Decoder.decode(base64.decode(token));
  if (!eventB64 || eventB64.length === 0 || !eventB64.startsWith("{")) {
    throw new Error("Invalid token");
  }
  const event = JSON.parse(eventB64);
  if (!event) {
    throw new Error("Invalid nostr event");
  }
  if (!nostr_verifySignature(event)) {
    throw new Error("Invalid nostr event, signature invalid");
  }
  if (event.kind !== 27235 /* HttpAuth */) {
    throw new Error("Invalid nostr event, kind invalid");
  }
  if (!event.created_at) {
    throw new Error("Invalid nostr event, created_at invalid");
  }
  if (Math.round(new Date().getTime() / 1e3) - event.created_at > 60) {
    throw new Error("Invalid nostr event, expired");
  }
  const urlTag = event.tags.find((t) => t[0] === "u");
  if (urlTag?.length !== 1 && urlTag?.[1] !== url) {
    throw new Error("Invalid nostr event, url tag invalid");
  }
  const methodTag = event.tags.find((t) => t[0] === "method");
  if (methodTag?.length !== 1 && methodTag?.[1].toLowerCase() !== method.toLowerCase()) {
    throw new Error("Invalid nostr event, method tag invalid");
  }
  return true;
}


// EXTERNAL MODULE: ./node_modules/websocket-polyfill/lib/index.js
var lib = __webpack_require__(6445);
// EXTERNAL MODULE: ./node_modules/light-bolt11-decoder/bolt11.js
var bolt11 = __webpack_require__(2632);
;// CONCATENATED MODULE: ./node_modules/@nostr-dev-kit/ndk/dist/index.mjs
// src/index.ts



// src/events/dedup.ts
function dedup(event1, event2) {
  if (event1.created_at > event2.created_at) {
    return event1;
  }
  return event2;
}

// src/events/index.ts



// src/zap/index.ts



var DEFAULT_RELAYS = [
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://relay.f7z.io",
  "wss://relay.damus.io",
  "wss://nostr.mom",
  "wss://no.str.cr"
];
var Zap = class extends node_modules_eventemitter3 {
  ndk;
  zappedEvent;
  zappedUser;
  constructor(args) {
    super();
    this.ndk = args.ndk;
    this.zappedEvent = args.zappedEvent;
    this.zappedUser = args.zappedUser || this.ndk.getUser({ hexpubkey: this.zappedEvent.pubkey });
  }
  async getZapEndpoint() {
    let lud06;
    let lud16;
    let zapEndpoint;
    let zapEndpointCallback;
    if (this.zappedEvent) {
      const zapTag = (await this.zappedEvent.getMatchingTags("zap"))[0];
      if (zapTag) {
        switch (zapTag[2]) {
          case "lud06":
            lud06 = zapTag[1];
            break;
          case "lud16":
            lud16 = zapTag[1];
            break;
          default:
            throw new Error(`Unknown zap tag ${zapTag}`);
        }
      }
    }
    if (this.zappedUser && !lud06 && !lud16) {
      if (!this.zappedUser.profile) {
        await this.zappedUser.fetchProfile();
      }
      lud06 = (this.zappedUser.profile || {}).lud06;
      lud16 = (this.zappedUser.profile || {}).lud16;
    }
    if (lud16) {
      const [name, domain] = lud16.split("@");
      zapEndpoint = `https://${domain}/.well-known/lnurlp/${name}`;
    } else if (lud06) {
      const { words } = bech32.decode(lud06, 1e3);
      const data = bech32.fromWords(words);
      const utf8Decoder = new TextDecoder("utf-8");
      zapEndpoint = utf8Decoder.decode(data);
    }
    if (!zapEndpoint) {
      throw new Error("No zap endpoint found");
    }
    const response = await fetch(zapEndpoint);
    const body = await response.json();
    if (body?.allowsNostr && (body?.nostrPubkey || body?.nostrPubKey)) {
      zapEndpointCallback = body.callback;
    }
    return zapEndpointCallback;
  }
  /**
   * Generates a kind:9734 zap request and returns the payment request
   * @param amount amount to zap in millisatoshis
   * @param comment optional comment to include in the zap request
   * @param extraTags optional extra tags to include in the zap request
   * @param relays optional relays to ask zapper to publish the zap to
   * @returns the payment request
   */
  async createZapRequest(amount, comment, extraTags, relays) {
    const zapEndpoint = await this.getZapEndpoint();
    if (!zapEndpoint) {
      throw new Error("No zap endpoint found");
    }
    if (!this.zappedEvent)
      throw new Error("No zapped event found");
    const zapRequest = nip57_exports.makeZapRequest({
      profile: this.zappedUser.hexpubkey(),
      // set the event to null since nostr-tools doesn't support nip-33 zaps
      event: null,
      amount,
      comment: comment || "",
      relays: relays ?? this.relays()
    });
    if (this.zappedEvent) {
      const tag = this.zappedEvent.tagReference();
      if (tag) {
        zapRequest.tags.push(tag);
      }
    }
    zapRequest.tags.push(["lnurl", zapEndpoint]);
    const zapRequestEvent = new NDKEvent(this.ndk, zapRequest);
    if (extraTags) {
      zapRequestEvent.tags = zapRequestEvent.tags.concat(extraTags);
    }
    await zapRequestEvent.sign();
    const zapRequestNostrEvent = await zapRequestEvent.toNostrEvent();
    const response = await fetch(
      `${zapEndpoint}?` + new URLSearchParams({
        amount: amount.toString(),
        nostr: JSON.stringify(zapRequestNostrEvent)
      })
    );
    const body = await response.json();
    return body.pr;
  }
  /**
   * @returns the relays to use for the zap request
   */
  relays() {
    let r = [];
    if (this.ndk?.pool?.relays) {
      r = this.ndk.pool.urls();
    }
    if (!r.length) {
      r = DEFAULT_RELAYS;
    }
    return r;
  }
};

// src/events/content-tagger.ts

function generateContentTags(content, tags = []) {
  const tagRegex = /(@|nostr:)(npub|nprofile|note|nevent)[a-zA-Z0-9]+/g;
  content = content.replace(tagRegex, (tag) => {
    try {
      const entity = tag.split(/(@|nostr:)/)[2];
      const { type, data } = nip19_exports.decode(entity);
      let t;
      switch (type) {
        case "npub":
          t = ["p", data];
          break;
        case "nprofile":
          t = ["p", data.pubkey];
          break;
        case "nevent":
          t = ["e", data.id];
          break;
        case "note":
          t = ["e", data];
          break;
        default:
          return tag;
      }
      if (!tags.find((t2) => t2[0] === t[0] && t2[1] === t[1])) {
        tags.push(t);
      }
      return `nostr:${entity}`;
    } catch (error) {
      return tag;
    }
  });
  return { content, tags };
}

// src/events/kind.ts
function isReplaceable() {
  if (this.kind === void 0)
    throw new Error("Kind not set");
  return this.kind >= 1e4 && this.kind < 2e4;
}
function isParamReplaceable() {
  if (this.kind === void 0)
    throw new Error("Kind not set");
  return this.kind >= 3e4 && this.kind < 4e4;
}

// src/events/kinds/index.ts
var NDKKind = /* @__PURE__ */ ((NDKKind2) => {
  NDKKind2[NDKKind2["Metadata"] = 0] = "Metadata";
  NDKKind2[NDKKind2["Text"] = 1] = "Text";
  NDKKind2[NDKKind2["RecommendRelay"] = 2] = "RecommendRelay";
  NDKKind2[NDKKind2["Contacts"] = 3] = "Contacts";
  NDKKind2[NDKKind2["EncryptedDirectMessage"] = 4] = "EncryptedDirectMessage";
  NDKKind2[NDKKind2["EventDeletion"] = 5] = "EventDeletion";
  NDKKind2[NDKKind2["Repost"] = 6] = "Repost";
  NDKKind2[NDKKind2["Reaction"] = 7] = "Reaction";
  NDKKind2[NDKKind2["BadgeAward"] = 8] = "BadgeAward";
  NDKKind2[NDKKind2["GenericRepost"] = 16] = "GenericRepost";
  NDKKind2[NDKKind2["ChannelCreation"] = 40] = "ChannelCreation";
  NDKKind2[NDKKind2["ChannelMetadata"] = 41] = "ChannelMetadata";
  NDKKind2[NDKKind2["ChannelMessage"] = 42] = "ChannelMessage";
  NDKKind2[NDKKind2["ChannelHideMessage"] = 43] = "ChannelHideMessage";
  NDKKind2[NDKKind2["ChannelMuteUser"] = 44] = "ChannelMuteUser";
  NDKKind2[NDKKind2["Report"] = 1984] = "Report";
  NDKKind2[NDKKind2["ZapRequest"] = 9734] = "ZapRequest";
  NDKKind2[NDKKind2["Zap"] = 9735] = "Zap";
  NDKKind2[NDKKind2["MuteList"] = 1e4] = "MuteList";
  NDKKind2[NDKKind2["PinList"] = 10001] = "PinList";
  NDKKind2[NDKKind2["RelayList"] = 10002] = "RelayList";
  NDKKind2[NDKKind2["ClientAuth"] = 22242] = "ClientAuth";
  NDKKind2[NDKKind2["NostrConnect"] = 24133] = "NostrConnect";
  NDKKind2[NDKKind2["CategorizedPeopleList"] = 3e4] = "CategorizedPeopleList";
  NDKKind2[NDKKind2["CategorizedBookmarkList"] = 30001] = "CategorizedBookmarkList";
  NDKKind2[NDKKind2["CategorizedRelayList"] = 30022] = "CategorizedRelayList";
  NDKKind2[NDKKind2["ProfileBadge"] = 30008] = "ProfileBadge";
  NDKKind2[NDKKind2["BadgeDefinition"] = 30009] = "BadgeDefinition";
  NDKKind2[NDKKind2["Article"] = 30023] = "Article";
  NDKKind2[NDKKind2["AppSpecificData"] = 30078] = "AppSpecificData";
  return NDKKind2;
})(NDKKind || {});

// src/user/index.ts


// src/user/follows.ts

async function follows() {
  if (!this.ndk)
    throw new Error("NDK not set");
  const contactListEvents = await this.ndk.fetchEvents({
    kinds: [3],
    authors: [this.hexpubkey()]
  });
  if (contactListEvents) {
    const npubs = /* @__PURE__ */ new Set();
    contactListEvents.forEach((event) => {
      event.tags.forEach((tag) => {
        if (tag[0] === "p") {
          try {
            const npub = nip19_exports.npubEncode(tag[1]);
            npubs.add(npub);
          } catch (e) {
          }
        }
      });
    });
    return [...npubs].reduce((acc, npub) => {
      const user = new NDKUser({ npub });
      user.ndk = this.ndk;
      acc.add(user);
      return acc;
    }, /* @__PURE__ */ new Set());
  }
  return /* @__PURE__ */ new Set();
}

// src/user/profile.ts
function mergeEvent(event, profile) {
  const payload = JSON.parse(event.content);
  Object.keys(payload).forEach((key) => {
    switch (key) {
      case "name":
        profile.name = payload.name;
        break;
      case "display_name":
      case "displayName":
        profile.displayName = payload.displayName || payload.display_name;
        break;
      case "image":
      case "picture":
        profile.image = payload.image || payload.picture;
        break;
      case "banner":
        profile.banner = payload.banner;
        break;
      case "bio":
        profile.bio = payload.bio;
        break;
      case "nip05":
        profile.nip05 = payload.nip05;
        break;
      case "lud06":
        profile.lud06 = payload.lud06;
        break;
      case "lud16":
        profile.lud16 = payload.lud16;
        break;
      case "about":
        profile.about = payload.about;
        break;
      case "zapService":
        profile.zapService = payload.zapService;
        break;
      case "website":
        profile.website = payload.website;
        break;
      default:
        profile[key] = payload[key];
        break;
    }
  });
  return profile;
}

// src/user/index.ts
var NDKUser = class {
  ndk;
  profile;
  npub = "";
  relayUrls = [];
  constructor(opts) {
    if (opts.npub)
      this.npub = opts.npub;
    if (opts.hexpubkey) {
      this.npub = nip19_exports.npubEncode(opts.hexpubkey);
    }
    if (opts.relayUrls) {
      this.relayUrls = opts.relayUrls;
    }
  }
  /**
   * Instantiate an NDKUser from a NIP-05 string
   * @param nip05Id {string} The user's NIP-05
   * @returns {NDKUser | undefined} An NDKUser if one is found for the given NIP-05, undefined otherwise.
   */
  static async fromNip05(nip05Id) {
    const profile = await nip05_exports.queryProfile(nip05Id);
    if (profile) {
      return new NDKUser({
        hexpubkey: profile.pubkey,
        relayUrls: profile.relays
      });
    }
  }
  /**
   * Get the hexpubkey for a user
   * @returns {string} The user's hexpubkey
   */
  hexpubkey() {
    return nip19_exports.decode(this.npub).data;
  }
  /**
   * Fetch a user's kind 0 metadata events and merge the events in a single up-to-date profile
   * @param opts {NDKFilterOptions} A set of NDKFilterOptions
   * @returns {Promise<Set<Event>>} A set of all NDKEvents events returned for the given user
   */
  async fetchProfile(opts) {
    if (!this.ndk)
      throw new Error("NDK not set");
    if (!this.profile)
      this.profile = {};
    const setMetadataEvents = await this.ndk.fetchEvents(
      {
        kinds: [0],
        authors: [this.hexpubkey()]
      },
      opts
    );
    if (setMetadataEvents) {
      const sortedSetMetadataEvents = Array.from(setMetadataEvents).sort(
        (a, b) => a.created_at - b.created_at
      );
      sortedSetMetadataEvents.forEach((event) => {
        try {
          this.profile = mergeEvent(event, this.profile);
        } catch (e) {
        }
      });
    }
    return setMetadataEvents;
  }
  /**
   * Returns a set of users that this user follows.
   */
  follows = follows.bind(this);
  /**
   * Returns a set of relay list events for a user.
   * @returns {Promise<Set<Event>>} A set of NDKEvents returned for the given user.
   */
  async relayList() {
    if (!this.ndk)
      throw new Error("NDK not set");
    const relayListEvents = await this.ndk.fetchEvents({
      kinds: [10002],
      authors: [this.hexpubkey()]
    });
    if (relayListEvents) {
      return relayListEvents;
    }
    return /* @__PURE__ */ new Set();
  }
  /**
   * Get the tag that can be used to reference this user in an event
   * @returns {NDKTag} an NDKTag
   */
  tagReference() {
    return ["p", this.hexpubkey()];
  }
  /**
   * Publishes the current profile.
   */
  async publish() {
    if (!this.ndk)
      throw new Error("No NDK instance found");
    this.ndk.assertSigner();
    const event = new NDKEvent(this.ndk, {
      kind: 0,
      content: JSON.stringify(this.profile)
    });
    await event.publish();
  }
  /**
   * Add a follow to this user's contact list
   *
   * @param newFollow {NDKUser} The user to follow
   * @param currentFollowList {Set<NDKUser>} The current follow list
   * @returns {Promise<boolean>} True if the follow was added, false if the follow already exists
   */
  async follow(newFollow, currentFollowList) {
    if (!this.ndk)
      throw new Error("No NDK instance found");
    this.ndk.assertSigner();
    if (!currentFollowList) {
      currentFollowList = await this.follows();
    }
    if (currentFollowList.has(newFollow)) {
      return false;
    }
    currentFollowList.add(newFollow);
    const event = new NDKEvent(this.ndk, { kind: 3 /* Contacts */ });
    for (const follow of currentFollowList) {
      event.tag(follow);
    }
    await event.publish();
    return true;
  }
};

// src/events/nip04.ts
async function dist_encrypt(recipient, signer) {
  if (!signer) {
    if (!this.ndk) {
      throw new Error("No signer available");
    }
    await this.ndk.assertSigner();
    signer = this.ndk.signer;
  }
  if (!recipient) {
    const pTags = this.getMatchingTags("p");
    if (pTags.length !== 1) {
      throw new Error("No recipient could be determined and no explicit recipient was provided");
    }
    recipient = new NDKUser({ hexpubkey: pTags[0][1] });
    recipient.ndk = this.ndk;
  }
  this.content = await signer.encrypt(recipient, this.content);
}
async function dist_decrypt(sender, signer) {
  if (!signer) {
    if (!this.ndk) {
      throw new Error("No signer available");
    }
    await this.ndk.assertSigner();
    signer = this.ndk.signer;
  }
  if (!sender) {
    sender = this.author;
  }
  this.content = await signer.decrypt(sender, this.content);
}

// src/events/nip19.ts

function encode() {
  if (this.isParamReplaceable()) {
    return nip19_exports.naddrEncode({
      kind: this.kind,
      pubkey: this.pubkey,
      identifier: this.replaceableDTag()
    });
  } else {
    return nip19_exports.noteEncode(this.tagId());
  }
}

// src/events/repost.ts
async function repost(publish = true, signer) {
  if (!signer) {
    if (!this.ndk)
      throw new Error("No NDK instance found");
    this.ndk.assertSigner();
    signer = this.ndk.signer;
  }
  if (!signer) {
    throw new Error("No signer available");
  }
  const user = await signer.user();
  const e = new NDKEvent(this.ndk, {
    kind: getKind(this),
    content: "",
    pubkey: user.hexpubkey()
  });
  e.tag(this);
  if (e.kind === 16 /* GenericRepost */) {
    e.tags.push(["k", `${this.kind}`]);
  }
  await e.sign(signer);
  if (publish)
    await e.publish();
  return e;
}
function getKind(event) {
  if (event.kind === 1) {
    return 6 /* Repost */;
  }
  return 16 /* GenericRepost */;
}

// src/events/index.ts
var NDKEvent = class extends node_modules_eventemitter3 {
  ndk;
  created_at;
  content = "";
  tags = [];
  kind;
  id = "";
  sig;
  pubkey = "";
  /**
   * The relay that this event was first received from.
   */
  relay;
  constructor(ndk, event) {
    super();
    this.ndk = ndk;
    this.created_at = event?.created_at;
    this.content = event?.content || "";
    this.tags = event?.tags || [];
    this.id = event?.id || "";
    this.sig = event?.sig;
    this.pubkey = event?.pubkey || "";
    this.kind = event?.kind;
  }
  /**
   * Returns the event as is.
   */
  rawEvent() {
    return {
      created_at: this.created_at,
      content: this.content,
      tags: this.tags,
      kind: this.kind,
      pubkey: this.pubkey,
      id: this.id,
      sig: this.sig
    };
  }
  set author(user) {
    this.pubkey = user.hexpubkey();
  }
  /**
   * Returns an NDKUser for the author of the event.
   */
  get author() {
    const user = new NDKUser({ hexpubkey: this.pubkey });
    user.ndk = this.ndk;
    return user;
  }
  tag(userOrEvent, marker) {
    const tag = userOrEvent.tagReference();
    if (marker)
      tag.push(marker);
    this.tags.push(tag);
    if (userOrEvent instanceof NDKEvent) {
      const tagEventAuthor = userOrEvent.author;
      if (tagEventAuthor && this.pubkey !== tagEventAuthor.hexpubkey()) {
        this.tag(tagEventAuthor);
      }
      for (const pTag of userOrEvent.getMatchingTags("p")) {
        if (pTag[1] === this.pubkey)
          continue;
        if (this.tags.find((t) => t[0] === "p" && t[1] === pTag[1]))
          continue;
        this.tags.push(["p", pTag[1]]);
      }
    }
  }
  /**
   * Return a NostrEvent object, trying to fill in missing fields
   * when possible, adding tags when necessary.
   * @param pubkey {string} The pubkey of the user who the event belongs to.
   * @returns {Promise<NostrEvent>} A promise that resolves to a NostrEvent.
   */
  async toNostrEvent(pubkey) {
    if (!pubkey && this.pubkey === "") {
      const user = await this.ndk?.signer?.user();
      this.pubkey = user?.hexpubkey() || "";
    }
    if (!this.created_at)
      this.created_at = Math.floor(Date.now() / 1e3);
    const nostrEvent = this.rawEvent();
    const { content, tags } = this.generateTags();
    nostrEvent.content = content || "";
    nostrEvent.tags = tags;
    try {
      this.id = getEventHash(nostrEvent);
    } catch (e) {
    }
    if (this.id)
      nostrEvent.id = this.id;
    if (this.sig)
      nostrEvent.sig = this.sig;
    return nostrEvent;
  }
  isReplaceable = isReplaceable.bind(this);
  isParamReplaceable = isParamReplaceable.bind(this);
  encode = encode.bind(this);
  encrypt = dist_encrypt.bind(this);
  decrypt = dist_decrypt.bind(this);
  /**
   * Get all tags with the given name
   * @param tagName {string} The name of the tag to search for
   * @returns {NDKTag[]} An array of the matching tags
   */
  getMatchingTags(tagName) {
    return this.tags.filter((tag) => tag[0] === tagName);
  }
  /**
   * Get the first tag with the given name
   * @param tagName Tag name to search for
   * @returns The value of the first tag with the given name, or undefined if no such tag exists
   */
  tagValue(tagName) {
    const tags = this.getMatchingTags(tagName);
    if (tags.length === 0)
      return void 0;
    return tags[0][1];
  }
  /**
   * Remove all tags with the given name (e.g. "d", "a", "p")
   * @param tagName Tag name to search for and remove
   * @returns {void}
   */
  removeTag(tagName) {
    this.tags = this.tags.filter((tag) => tag[0] !== tagName);
  }
  /**
   * Sign the event if a signer is present.
   *
   * It will generate tags.
   * Repleacable events will have their created_at field set to the current time.
   * @param signer {NDKSigner} The NDKSigner to use to sign the event
   * @returns {Promise<string>} A Promise that resolves to the signature of the signed event.
   */
  async sign(signer) {
    if (!signer) {
      this.ndk?.assertSigner();
      signer = this.ndk.signer;
    }
    await this.generateTags();
    if (this.isReplaceable()) {
      this.created_at = Math.floor(Date.now() / 1e3);
    }
    const nostrEvent = await this.toNostrEvent();
    this.sig = await signer.sign(nostrEvent);
    return this.sig;
  }
  /**
   * Attempt to sign and then publish an NDKEvent to a given relaySet.
   * If no relaySet is provided, the relaySet will be calculated by NDK.
   * @param relaySet {NDKRelaySet} The relaySet to publish the even to.
   * @returns A promise that resolves to the relays the event was published to.
   */
  async publish(relaySet, timeoutMs) {
    if (!this.sig)
      await this.sign();
    if (!this.ndk)
      throw new Error("NDKEvent must be associated with an NDK instance to publish");
    return this.ndk.publish(this, relaySet, timeoutMs);
  }
  /**
   * Generates tags for users, notes, and other events tagged in content.
   * Will also generate random "d" tag for parameterized replaceable events where needed.
   * @returns {ContentTag} The tags and content of the event.
   */
  generateTags() {
    let tags = [];
    const g = generateContentTags(this.content, this.tags);
    const content = g.content;
    tags = g.tags;
    if (this.kind && this.kind >= 3e4 && this.kind <= 4e4) {
      const dTag = this.getMatchingTags("d")[0];
      if (!dTag) {
        const str = [...Array(16)].map(() => Math.random().toString(36)[2]).join("");
        tags.push(["d", str]);
      }
    }
    return { content: content || "", tags };
  }
  /**
   * Returns the "d" tag of a parameterized replaceable event or throws an error if the event isn't
   * a parameterized replaceable event.
   * @returns {string} the "d" tag of the event.
   */
  replaceableDTag() {
    if (this.kind && this.kind >= 3e4 && this.kind <= 4e4) {
      const dTag = this.getMatchingTags("d")[0];
      const dTagId = dTag ? dTag[1] : "";
      return dTagId;
    }
    throw new Error("Event is not a parameterized replaceable event");
  }
  /**
   * Returns the id of the event or, if it's a parameterized event, the generated id of the event using "d" tag, pubkey, and kind.
   * @returns {string} The id
   */
  tagId() {
    if (this.kind && this.kind >= 3e4 && this.kind <= 4e4) {
      const dTagId = this.replaceableDTag();
      return `${this.kind}:${this.pubkey}:${dTagId}`;
    }
    return this.id;
  }
  /**
   * Get the tag that can be used to reference this event from another event
   * @example
   *     event = new NDKEvent(ndk, { kind: 30000, pubkey: 'pubkey', tags: [ ["d", "d-code"] ] });
   *     event.tagReference(); // ["a", "30000:pubkey:d-code"]
   *
   *     event = new NDKEvent(ndk, { kind: 1, pubkey: 'pubkey', id: "eventid" });
   *     event.tagReference(); // ["e", "eventid"]
   * @returns {NDKTag} The NDKTag object referencing this event
   */
  tagReference() {
    if (this.isParamReplaceable()) {
      return ["a", this.tagId()];
    }
    return ["e", this.tagId()];
  }
  /**
   * Provides the filter that will return matching events for this event.
   *
   * @example
   *    event = new NDKEvent(ndk, { kind: 30000, pubkey: 'pubkey', tags: [ ["d", "d-code"] ] });
   *    event.filter(); // { "#a": ["30000:pubkey:d-code"] }
   * @example
   *    event = new NDKEvent(ndk, { kind: 1, pubkey: 'pubkey', id: "eventid" });
   *    event.filter(); // { "#e": ["eventid"] }
   *
   * @returns The filter that will return matching events for this event
   */
  filter() {
    if (this.isParamReplaceable()) {
      return { "#a": [this.tagId()] };
    } else {
      return { "#e": [this.tagId()] };
    }
  }
  /**
   * Create a zap request for an existing event
   *
   * @param amount The amount to zap in millisatoshis
   * @param comment A comment to add to the zap request
   * @param extraTags Extra tags to add to the zap request
   */
  async zap(amount, comment, extraTags) {
    if (!this.ndk)
      throw new Error("No NDK instance found");
    this.ndk.assertSigner();
    const zap = new Zap({
      ndk: this.ndk,
      zappedEvent: this
    });
    const paymentRequest = await zap.createZapRequest(amount, comment, extraTags);
    return paymentRequest;
  }
  /**
   * Generates a deletion event of the current event
   *
   * @param reason The reason for the deletion
   * @returns The deletion event
   */
  async delete(reason) {
    if (!this.ndk)
      throw new Error("No NDK instance found");
    this.ndk.assertSigner();
    const e = new NDKEvent(this.ndk, {
      kind: 5 /* EventDeletion */,
      content: reason || ""
    });
    e.tag(this);
    await e.publish();
    return e;
  }
  /**
   * NIP-18 reposting event.
   *
   * @param publish Whether to publish the reposted event automatically
   * @param signer The signer to use for signing the reposted event
   * @returns The reposted event
   *
   * @function
   */
  repost = repost.bind(this);
};

// src/relay/pool/index.ts


// src/relay/index.ts




var NDKRelayStatus = /* @__PURE__ */ ((NDKRelayStatus2) => {
  NDKRelayStatus2[NDKRelayStatus2["CONNECTING"] = 0] = "CONNECTING";
  NDKRelayStatus2[NDKRelayStatus2["CONNECTED"] = 1] = "CONNECTED";
  NDKRelayStatus2[NDKRelayStatus2["DISCONNECTING"] = 2] = "DISCONNECTING";
  NDKRelayStatus2[NDKRelayStatus2["DISCONNECTED"] = 3] = "DISCONNECTED";
  NDKRelayStatus2[NDKRelayStatus2["RECONNECTING"] = 4] = "RECONNECTING";
  NDKRelayStatus2[NDKRelayStatus2["FLAPPING"] = 5] = "FLAPPING";
  return NDKRelayStatus2;
})(NDKRelayStatus || {});
var NDKRelay2 = class extends node_modules_eventemitter3 {
  url;
  scores;
  relay;
  _status;
  connectedAt;
  _connectionStats = { attempts: 0, success: 0, durations: [] };
  complaining = false;
  debug;
  /**
   * Active subscriptions this relay is connected to
   */
  activeSubscriptions = /* @__PURE__ */ new Set();
  constructor(url) {
    super();
    this.url = url;
    this.relay = relayInit(url);
    this.scores = /* @__PURE__ */ new Map();
    this._status = 3 /* DISCONNECTED */;
    this.debug = browser(`ndk:relay:${url}`);
    this.relay.on("connect", () => {
      this.updateConnectionStats.connected();
      this._status = 1 /* CONNECTED */;
      this.emit("connect");
    });
    this.relay.on("disconnect", () => {
      this.updateConnectionStats.disconnected();
      if (this._status === 1 /* CONNECTED */) {
        this._status = 3 /* DISCONNECTED */;
        this.handleReconnection();
      }
      this.emit("disconnect");
    });
    this.relay.on("notice", (notice) => this.handleNotice(notice));
  }
  /**
   * Evaluates the connection stats to determine if the relay is flapping.
   */
  isFlapping() {
    const durations = this._connectionStats.durations;
    if (durations.length < 10)
      return false;
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const variance = durations.map((x) => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    const isFlapping = stdDev < 1e3;
    return isFlapping;
  }
  /**
   * Called when the relay is unexpectedly disconnected.
   */
  handleReconnection() {
    if (this.isFlapping()) {
      this.emit("flapping", this, this._connectionStats);
      this._status = 5 /* FLAPPING */;
    }
    if (this.connectedAt && Date.now() - this.connectedAt < 5e3) {
      setTimeout(() => this.connect(), 6e4);
    } else {
      this.connect();
    }
  }
  get status() {
    return this._status;
  }
  /**
   * Connects to the relay.
   */
  async connect() {
    try {
      this.updateConnectionStats.attempt();
      this._status = 0 /* CONNECTING */;
      await this.relay.connect();
    } catch (e) {
      this.debug("Failed to connect", e);
      this._status = 3 /* DISCONNECTED */;
      throw e;
    }
  }
  /**
   * Disconnects from the relay.
   */
  disconnect() {
    this._status = 2 /* DISCONNECTING */;
    this.relay.close();
  }
  async handleNotice(notice) {
    if (notice.includes("oo many") || notice.includes("aximum")) {
      this.disconnect();
      setTimeout(() => this.connect(), 2e3);
      this.debug(this.relay.url, "Relay complaining?", notice);
    }
    this.emit("notice", this, notice);
  }
  /**
   * Subscribes to a subscription.
   */
  subscribe(subscription) {
    const { filter } = subscription;
    const sub = this.relay.sub([filter], {
      id: subscription.subId
    });
    this.debug(`Subscribed to ${JSON.stringify(filter)}`);
    sub.on("event", (event) => {
      const e = new NDKEvent(void 0, event);
      e.relay = this;
      subscription.eventReceived(e, this);
    });
    sub.on("eose", () => {
      subscription.eoseReceived(this);
    });
    const unsub = sub.unsub;
    sub.unsub = () => {
      this.debug(`Unsubscribing from ${JSON.stringify(filter)}`);
      this.activeSubscriptions.delete(subscription);
      unsub();
    };
    this.activeSubscriptions.add(subscription);
    subscription.on("close", () => {
      this.activeSubscriptions.delete(subscription);
    });
    return sub;
  }
  /**
   * Publishes an event to the relay with an optional timeout.
   *
   * If the relay is not connected, the event will be published when the relay connects,
   * unless the timeout is reached before the relay connects.
   *
   * @param event The event to publish
   * @param timeoutMs The timeout for the publish operation in milliseconds
   * @returns A promise that resolves when the event has been published or rejects if the operation times out
   */
  async publish(event, timeoutMs = 2500) {
    if (this.status === 1 /* CONNECTED */) {
      return this.publishEvent(event, timeoutMs);
    } else {
      this.once("connect", () => {
        this.publishEvent(event, timeoutMs);
      });
      return true;
    }
  }
  async publishEvent(event, timeoutMs) {
    const nostrEvent = await event.toNostrEvent();
    const a = this.relay.publish(nostrEvent);
    let publishTimeout;
    const publishPromise = new Promise((resolve, reject) => {
      a.on("failed", (err) => {
        clearTimeout(publishTimeout);
        this.debug("Publish failed", err, event.id);
        this.emit("publish:failed", event, err);
        reject(err);
      });
      a.on("ok", () => {
        clearTimeout(publishTimeout);
        this.emit("published", event);
        resolve(true);
      });
    });
    if (!timeoutMs) {
      return publishPromise;
    }
    const timeoutPromise = new Promise((_, reject) => {
      publishTimeout = setTimeout(() => {
        this.debug("Publish timed out", event.rawEvent());
        this.emit("publish:failed", event, "Timeout");
        reject(new Error("Publish operation timed out"));
      }, timeoutMs);
    });
    return Promise.race([publishPromise, timeoutPromise]);
  }
  /**
   * Called when this relay has responded with an event but
   * wasn't the fastest one.
   * @param timeDiffInMs The time difference in ms between the fastest and this relay in milliseconds
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  scoreSlowerEvent(timeDiffInMs) {
  }
  /**
   * Utility functions to update the connection stats.
   */
  updateConnectionStats = {
    connected: () => {
      this._connectionStats.success++;
      this._connectionStats.connectedAt = Date.now();
    },
    disconnected: () => {
      if (this._connectionStats.connectedAt) {
        this._connectionStats.durations.push(
          Date.now() - this._connectionStats.connectedAt
        );
        if (this._connectionStats.durations.length > 100) {
          this._connectionStats.durations.shift();
        }
      }
      this._connectionStats.connectedAt = void 0;
    },
    attempt: () => {
      this._connectionStats.attempts++;
    }
  };
  /**
   * Returns the connection stats.
   */
  get connectionStats() {
    return this._connectionStats;
  }
  tagReference(marker) {
    const tag = ["r", this.relay.url];
    if (marker) {
      tag.push(marker);
    }
    return tag;
  }
};

// src/relay/pool/index.ts
var NDKPool = class extends node_modules_eventemitter3 {
  relays = /* @__PURE__ */ new Map();
  debug;
  constructor(relayUrls = [], ndk) {
    super();
    this.debug = ndk.debug.extend("pool");
    for (const relayUrl of relayUrls) {
      const relay = new NDKRelay2(relayUrl);
      relay.on("notice", (relay2, notice) => this.emit("notice", relay2, notice));
      relay.on("connect", () => this.handleRelayConnect(relayUrl));
      relay.on("disconnect", () => this.emit("relay:disconnect", relay));
      relay.on("flapping", () => this.handleFlapping(relay));
      this.relays.set(relayUrl, relay);
    }
  }
  handleRelayConnect(relayUrl) {
    this.debug(`Relay ${relayUrl} connected`);
    this.emit("relay:connect", this.relays.get(relayUrl));
    if (this.stats().connected === this.relays.size) {
      this.emit("connect");
    }
  }
  /**
   * Attempts to establish a connection to each relay in the pool.
   *
   * @async
   * @param {number} [timeoutMs] - Optional timeout in milliseconds for each connection attempt.
   * @returns {Promise<void>} A promise that resolves when all connection attempts have completed.
   * @throws {Error} If any of the connection attempts result in an error or timeout.
   */
  async connect(timeoutMs) {
    const promises = [];
    this.debug(
      `Connecting to ${this.relays.size} relays${timeoutMs ? `, timeout ${timeoutMs}...` : ""}`
    );
    for (const relay of this.relays.values()) {
      if (timeoutMs) {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(`Timed out after ${timeoutMs}ms`), timeoutMs);
        });
        promises.push(
          Promise.race([relay.connect(), timeoutPromise]).catch((e) => {
            this.debug(`Failed to connect to relay ${relay.url}: ${e}`);
          })
        );
      } else {
        promises.push(relay.connect());
      }
    }
    if (timeoutMs) {
      setTimeout(() => {
        const allConnected = this.stats().connected === this.relays.size;
        const someConnected = this.stats().connected > 0;
        if (!allConnected && someConnected) {
          this.emit("connect");
        }
      }, timeoutMs);
    }
    await Promise.all(promises);
  }
  handleFlapping(relay) {
    this.debug(`Relay ${relay.url} is flapping`);
    this.relays.delete(relay.url);
    this.emit("flapping", relay);
  }
  size() {
    return this.relays.size;
  }
  /**
   * Returns the status of each relay in the pool.
   * @returns {NDKPoolStats} An object containing the number of relays in each status.
   */
  stats() {
    const stats = {
      total: 0,
      connected: 0,
      disconnected: 0,
      connecting: 0
    };
    for (const relay of this.relays.values()) {
      stats.total++;
      if (relay.status === 1 /* CONNECTED */) {
        stats.connected++;
      } else if (relay.status === 3 /* DISCONNECTED */) {
        stats.disconnected++;
      } else if (relay.status === 0 /* CONNECTING */) {
        stats.connecting++;
      }
    }
    return stats;
  }
  /**
   * Get a list of all relay urls in the pool.
   */
  urls() {
    return Array.from(this.relays.keys());
  }
};

// src/relay/sets/index.ts



// src/subscription/index.ts



// src/subscription/utils.ts
function queryFullyFilled(subscription) {
  if (filterIncludesIds(subscription.filter)) {
    if (resultHasAllRequestedIds(subscription)) {
      return true;
    }
  }
  return false;
}
function filterIncludesIds(filter) {
  return !!filter["ids"];
}
function resultHasAllRequestedIds(subscription) {
  const ids = subscription.filter["ids"];
  return !!ids && ids.length === subscription.eventFirstSeen.size;
}

// src/subscription/index.ts
var NDKSubscriptionCacheUsage = /* @__PURE__ */ ((NDKSubscriptionCacheUsage2) => {
  NDKSubscriptionCacheUsage2["ONLY_CACHE"] = "ONLY_CACHE";
  NDKSubscriptionCacheUsage2["CACHE_FIRST"] = "CACHE_FIRST";
  NDKSubscriptionCacheUsage2["PARALLEL"] = "PARALLEL";
  NDKSubscriptionCacheUsage2["ONLY_RELAY"] = "ONLY_RELAY";
  return NDKSubscriptionCacheUsage2;
})(NDKSubscriptionCacheUsage || {});
var defaultOpts = {
  closeOnEose: true,
  cacheUsage: "CACHE_FIRST" /* CACHE_FIRST */,
  groupable: true,
  groupableDelay: 100
};
var NDKSubscription = class extends node_modules_eventemitter3 {
  subId;
  filter;
  opts;
  relaySet;
  ndk;
  relaySubscriptions;
  debug;
  /**
   * Events that have been seen by the subscription, with the time they were first seen.
   */
  eventFirstSeen = /* @__PURE__ */ new Map();
  /**
   * Relays that have sent an EOSE.
   */
  eosesSeen = /* @__PURE__ */ new Set();
  /**
   * Events that have been seen by the subscription per relay.
   */
  eventsPerRelay = /* @__PURE__ */ new Map();
  constructor(ndk, filter, opts, relaySet, subId) {
    super();
    this.ndk = ndk;
    this.opts = { ...defaultOpts, ...opts || {} };
    this.subId = subId || opts?.subId || generateFilterId(filter);
    this.filter = filter;
    this.relaySet = relaySet;
    this.relaySubscriptions = /* @__PURE__ */ new Map();
    this.debug = ndk.debug.extend(`subscription:${this.subId}`);
    if (this.opts.cacheUsage === "ONLY_CACHE" /* ONLY_CACHE */ && !this.opts.closeOnEose) {
      throw new Error("Cannot use cache-only options with a persistent subscription");
    }
  }
  /**
   * Calculates the groupable ID for this subscription.
   *
   * @returns The groupable ID, or null if the subscription is not groupable.
   */
  groupableId() {
    if (!this.opts?.groupable) {
      return null;
    }
    const hasKind = (this.filter.kinds?.length || 0) > 0;
    const noTimeConstraints = !this.filter.since && !this.filter.until;
    const noLimit = !this.filter.limit;
    if (hasKind && noTimeConstraints && noLimit) {
      let id = this.filter.kinds.join(",");
      const keys = Object.keys(this.filter || {}).sort().join("-");
      id += `-${keys}`;
      return id;
    }
    return null;
  }
  shouldQueryCache() {
    return this.opts?.cacheUsage !== "ONLY_RELAY" /* ONLY_RELAY */;
  }
  shouldQueryRelays() {
    return this.opts?.cacheUsage !== "ONLY_CACHE" /* ONLY_CACHE */;
  }
  shouldWaitForCache() {
    return (
      // Must want to close on EOSE; subscriptions
      // that want to receive further updates must
      // always hit the relay
      this.opts.closeOnEose && // Cache adapter must claim to be fast
      !!this.ndk.cacheAdapter?.locking && // If we don't have to query relays there's no need
      // to wait for the cache
      this.shouldQueryRelays() && // If explicitly told to run in parallel, then
      // we should not wait for the cache
      this.opts.cacheUsage !== "PARALLEL" /* PARALLEL */
    );
  }
  /**
   * Start the subscription. This is the main method that should be called
   * after creating a subscription.
   */
  async start() {
    let cachePromise;
    if (this.shouldQueryCache()) {
      cachePromise = this.startWithCache();
      if (this.shouldWaitForCache()) {
        await cachePromise;
        if (queryFullyFilled(this)) {
          this.debug("cache hit, fully filled: skipping relay query");
          this.emit("eose", this);
          return;
        }
      }
    }
    if (this.shouldQueryRelays()) {
      this.startWithRelaySet();
    }
    return;
  }
  stop() {
    this.relaySubscriptions.forEach((sub) => sub.unsub());
    this.relaySubscriptions.clear();
    this.emit("close", this);
  }
  async startWithCache() {
    if (this.ndk.cacheAdapter?.query) {
      const promise = this.ndk.cacheAdapter.query(this);
      if (this.ndk.cacheAdapter.locking) {
        await promise;
      }
    }
  }
  startWithRelaySet() {
    if (!this.relaySet) {
      this.relaySet = calculateRelaySetFromFilter(this.ndk, this.filter);
    }
    if (this.relaySet) {
      this.relaySet.subscribe(this);
    }
  }
  // EVENT handling
  /**
   * Called when an event is received from a relay or the cache
   * @param event
   * @param relay
   * @param fromCache Whether the event was received from the cache
   */
  eventReceived(event, relay, fromCache = false) {
    if (!fromCache && relay) {
      let events = this.eventsPerRelay.get(relay);
      if (!events) {
        events = /* @__PURE__ */ new Set();
        this.eventsPerRelay.set(relay, events);
      }
      events.add(event.id);
      const eventAlreadySeen = this.eventFirstSeen.has(event.id);
      if (eventAlreadySeen) {
        const timeSinceFirstSeen = Date.now() - (this.eventFirstSeen.get(event.id) || 0);
        relay.scoreSlowerEvent(timeSinceFirstSeen);
        this.emit("event:dup", event, relay, timeSinceFirstSeen, this);
        return;
      }
      if (this.ndk.cacheAdapter) {
        this.ndk.cacheAdapter.setEvent(event, this.filter);
      }
      this.eventFirstSeen.set(`${event.id}`, Date.now());
    } else {
      this.eventFirstSeen.set(`${event.id}`, 0);
    }
    this.emit("event", event, relay, this);
  }
  // EOSE handling
  eoseTimeout;
  eoseReceived(relay) {
    if (this.opts?.closeOnEose) {
      this.relaySubscriptions.get(relay)?.unsub();
      this.relaySubscriptions.delete(relay);
      if (this.relaySubscriptions.size === 0) {
        this.emit("close", this);
      }
    }
    this.eosesSeen.add(relay);
    const hasSeenAllEoses = this.eosesSeen.size === this.relaySet?.size();
    if (hasSeenAllEoses) {
      this.emit("eose");
    } else {
      if (this.eoseTimeout) {
        clearTimeout(this.eoseTimeout);
      }
      this.eoseTimeout = setTimeout(() => {
        this.emit("eose");
      }, 500);
    }
  }
};
var NDKSubscriptionGroup = class extends NDKSubscription {
  subscriptions;
  constructor(ndk, subscriptions) {
    const debug4 = ndk.debug.extend("subscription-group");
    const filters = dist_mergeFilters(subscriptions.map((s) => s.filter));
    super(
      ndk,
      filters,
      subscriptions[0].opts,
      // TODO: This should be merged
      subscriptions[0].relaySet
      // TODO: This should be merged
    );
    this.subscriptions = subscriptions;
    debug4("merged filters", {
      count: subscriptions.length,
      mergedFilters: this.filter
    });
    this.on("event", this.forwardEvent);
    this.on("event:dup", this.forwardEventDup);
    this.on("eose", this.forwardEose);
    this.on("close", this.forwardClose);
  }
  isEventForSubscription(event, subscription) {
    const { filter } = subscription;
    if (!filter)
      return false;
    return matchFilter(filter, event.rawEvent());
  }
  forwardEvent(event, relay) {
    for (const subscription of this.subscriptions) {
      if (!this.isEventForSubscription(event, subscription)) {
        continue;
      }
      subscription.emit("event", event, relay, subscription);
    }
  }
  forwardEventDup(event, relay, timeSinceFirstSeen) {
    for (const subscription of this.subscriptions) {
      if (!this.isEventForSubscription(event, subscription)) {
        continue;
      }
      subscription.emit("event:dup", event, relay, timeSinceFirstSeen, subscription);
    }
  }
  forwardEose() {
    for (const subscription of this.subscriptions) {
      subscription.emit("eose", subscription);
    }
  }
  forwardClose() {
    for (const subscription of this.subscriptions) {
      subscription.emit("close", subscription);
    }
  }
};
function dist_mergeFilters(filters) {
  const result = {};
  filters.forEach((filter) => {
    Object.entries(filter).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (result[key] === void 0) {
          result[key] = [...value];
        } else {
          result[key] = Array.from(/* @__PURE__ */ new Set([...result[key], ...value]));
        }
      } else {
        result[key] = value;
      }
    });
  });
  return result;
}
function filterFromId(id) {
  let decoded;
  try {
    decoded = nip19_exports.decode(id);
    switch (decoded.type) {
      case "nevent":
        return { ids: [decoded.data.id] };
      case "note":
        return { ids: [decoded.data] };
      case "naddr":
        return {
          authors: [decoded.data.pubkey],
          "#d": [decoded.data.identifier],
          kinds: [decoded.data.kind]
        };
    }
  } catch (e) {
  }
  return { ids: [id] };
}
function generateFilterId(filter) {
  const keys = Object.keys(filter) || [];
  const subId = [];
  for (const key of keys) {
    if (key === "kinds") {
      const v = [key, filter.kinds.join(",")];
      subId.push(v.join(":"));
    } else {
      subId.push(key);
    }
  }
  subId.push(Math.floor(Math.random() * 999999999).toString());
  return subId.join("-");
}

// src/relay/sets/index.ts
var NDKRelaySet2 = class {
  relays;
  debug;
  ndk;
  constructor(relays, ndk) {
    this.relays = relays;
    this.ndk = ndk;
    this.debug = ndk.debug.extend("relayset");
  }
  /**
   * Creates a relay set from a list of relay URLs.
   *
   * This is useful for testing in development to pass a local relay
   * to publish methods.
   *
   * @param relayUrls - list of relay URLs to include in this set
   * @param ndk
   * @returns NDKRelaySet
   */
  static fromRelayUrls(relayUrls, ndk) {
    const relays = /* @__PURE__ */ new Set();
    for (const url of relayUrls) {
      const relay = ndk.pool.relays.get(url);
      if (relay) {
        relays.add(relay);
      }
    }
    return new NDKRelaySet2(new Set(relays), ndk);
  }
  subscribeOnRelay(relay, subscription) {
    const sub = relay.subscribe(subscription);
    subscription.relaySubscriptions.set(relay, sub);
  }
  /**
   * Calculates an ID of this specific combination of relays.
   */
  getId() {
    const urls = Array.from(this.relays).map((r) => r.url);
    const urlString = urls.sort().join(",");
    return hashes_esm_utils_bytesToHex(esm_sha256_sha256(urlString));
  }
  /**
   * Add a subscription to this relay set
   */
  subscribe(subscription) {
    const subGroupableId = subscription.groupableId();
    const groupableId = `${this.getId()}:${subGroupableId}`;
    if (!subGroupableId) {
      this.executeSubscription(subscription);
      return subscription;
    }
    const delayedSubscription = this.ndk.delayedSubscriptions.get(groupableId);
    if (delayedSubscription) {
      delayedSubscription.push(subscription);
    } else {
      setTimeout(() => {
        this.executeDelayedSubscription(groupableId);
      }, subscription.opts.groupableDelay);
      this.ndk.delayedSubscriptions.set(groupableId, [subscription]);
    }
    return subscription;
  }
  executeDelayedSubscription(groupableId) {
    const subscriptions = this.ndk.delayedSubscriptions.get(groupableId);
    this.ndk.delayedSubscriptions.delete(groupableId);
    if (subscriptions) {
      if (subscriptions.length > 1) {
        this.executeSubscriptions(subscriptions);
      } else {
        this.executeSubscription(subscriptions[0]);
      }
    }
  }
  /**
   * This function takes a similar group of subscriptions, merges the filters
   * and sends a single subscription to the relay.
   */
  executeSubscriptions(subscriptions) {
    const ndk = subscriptions[0].ndk;
    const subGroup = new NDKSubscriptionGroup(ndk, subscriptions);
    this.executeSubscription(subGroup);
  }
  executeSubscription(subscription) {
    this.debug("subscribing", { filter: subscription.filter });
    for (const relay of this.relays) {
      if (relay.status === 1 /* CONNECTED */) {
        this.subscribeOnRelay(relay, subscription);
      } else {
        const connectedListener = () => {
          this.debug("new relay coming online for active subscription", {
            relay: relay.url,
            filter: subscription.filter
          });
          this.subscribeOnRelay(relay, subscription);
        };
        relay.once("connect", connectedListener);
        subscription.once("close", () => {
          relay.removeListener("connect", connectedListener);
        });
      }
    }
    return subscription;
  }
  /**
   * Publish an event to all relays in this set. Returns the number of relays that have received the event.
   * @param event
   * @param timeoutMs - timeout in milliseconds for each publish operation and connection operation
   * @returns A set where the event was successfully published to
   */
  async publish(event, timeoutMs) {
    const publishedToRelays = /* @__PURE__ */ new Set();
    const promises = Array.from(this.relays).map((relay) => {
      return new Promise((resolve) => {
        relay.publish(event, timeoutMs).then(() => {
          publishedToRelays.add(relay);
          resolve();
        }).catch((err) => {
          this.debug("error publishing to relay", { relay: relay.url, err });
          resolve();
        });
      });
    });
    await Promise.all(promises);
    if (publishedToRelays.size === 0) {
      throw new Error("No relay was able to receive the event");
    }
    return publishedToRelays;
  }
  size() {
    return this.relays.size;
  }
};

// src/relay/sets/calculate.ts
function calculateRelaySetFromEvent(ndk, event) {
  const relays = /* @__PURE__ */ new Set();
  ndk.pool?.relays.forEach((relay) => relays.add(relay));
  return new NDKRelaySet2(relays, ndk);
}
function calculateRelaySetFromFilter(ndk, filter) {
  const relays = /* @__PURE__ */ new Set();
  ndk.pool?.relays.forEach((relay) => {
    if (!relay.complaining) {
      relays.add(relay);
    } else {
      ndk.debug(`Relay ${relay.url} is complaining, not adding to set`);
    }
  });
  return new NDKRelaySet2(relays, ndk);
}

// src/events/kinds/lists/index.ts
var NDKList = class extends (/* unused pure expression or super */ null && (NDKEvent)) {
  _encryptedTags;
  /**
   * Stores the number of bytes the content was before decryption
   * to expire the cache when the content changes.
   */
  encryptedTagsLength;
  constructor(ndk, rawEvent) {
    super(ndk, rawEvent);
    if (!this.kind)
      this.kind = 30001 /* CategorizedBookmarkList */;
  }
  /**
   * Wrap a NDKEvent into a NDKList
   */
  static from(ndkEvent) {
    return new NDKList(ndkEvent.ndk, ndkEvent.rawEvent());
  }
  /**
   * Returns the name of the list.
   */
  get name() {
    return this.tagValue("name") ?? this.tagValue("d");
  }
  /**
   * Sets the name of the list.
   */
  set name(name) {
    this.removeTag("name");
    if (name) {
      this.tags.push(["name", name]);
    } else {
      throw new Error("Name cannot be empty");
    }
  }
  /**
   * Returns the description of the list.
   */
  get description() {
    return this.tagValue("description");
  }
  /**
   * Sets the description of the list.
   */
  set description(name) {
    if (name) {
      this.tags.push(["description", name]);
    } else {
      this.removeTag("description");
    }
  }
  isEncryptedTagsCacheValid() {
    return !!(this._encryptedTags && this.encryptedTagsLength === this.content.length);
  }
  /**
   * Returns the decrypted content of the list.
   */
  async encryptedTags(useCache = true) {
    if (useCache && this.isEncryptedTagsCacheValid())
      return this._encryptedTags;
    if (!this.ndk)
      throw new Error("NDK instance not set");
    if (!this.ndk.signer)
      throw new Error("NDK signer not set");
    const user = await this.ndk.signer.user();
    try {
      if (this.content.length > 0) {
        try {
          const decryptedContent = await this.ndk.signer.decrypt(user, this.content);
          const a = JSON.parse(decryptedContent);
          if (a && a[0]) {
            this.encryptedTagsLength = this.content.length;
            return this._encryptedTags = a;
          }
          this.encryptedTagsLength = this.content.length;
          return this._encryptedTags = [];
        } catch (e) {
          console.log(`error decrypting ${this.content}`);
        }
      }
    } catch (e) {
    }
    return [];
  }
  /**
   * This method can be overriden to validate that a tag is valid for this list.
   *
   * (i.e. the NDKPersonList can validate that items are NDKUser instances)
   */
  validateTag(tagValue) {
    return true;
  }
  /**
   * Returns the unecrypted items in this list.
   */
  get items() {
    return this.tags.filter((t) => {
      return !["d", "name", "description"].includes(t[0]);
    });
  }
  /**
   * Adds a new item to the list.
   * @param relay Relay to add
   * @param mark Optional mark to add to the item
   * @param encrypted Whether to encrypt the item
   */
  async addItem(item, mark = void 0, encrypted = false) {
    if (!this.ndk)
      throw new Error("NDK instance not set");
    if (!this.ndk.signer)
      throw new Error("NDK signer not set");
    let tag;
    if (item instanceof NDKEvent) {
      tag = item.tagReference();
    } else if (item instanceof NDKUser) {
      tag = item.tagReference();
    } else if (item instanceof NDKRelay2) {
      tag = item.tagReference();
    } else if (Array.isArray(item)) {
      tag = item;
    } else {
      throw new Error("Invalid object type");
    }
    if (mark)
      tag.push(mark);
    if (encrypted) {
      const user = await this.ndk.signer.user();
      const currentList = await this.encryptedTags();
      currentList.push(tag);
      this._encryptedTags = currentList;
      this.encryptedTagsLength = this.content.length;
      this.content = JSON.stringify(currentList);
      await this.encrypt(user);
    } else {
      this.tags.push(tag);
    }
    this.created_at = Math.floor(Date.now() / 1e3);
    this.emit("change");
  }
  /**
   * Removes an item from the list.
   *
   * @param index The index of the item to remove.
   * @param encrypted Whether to remove from the encrypted list or not.
   */
  async removeItem(index, encrypted) {
    if (!this.ndk)
      throw new Error("NDK instance not set");
    if (!this.ndk.signer)
      throw new Error("NDK signer not set");
    if (encrypted) {
      const user = await this.ndk.signer.user();
      const currentList = await this.encryptedTags();
      currentList.splice(index, 1);
      this._encryptedTags = currentList;
      this.encryptedTagsLength = this.content.length;
      this.content = JSON.stringify(currentList);
      await this.encrypt(user);
    } else {
      this.tags.splice(index, 1);
    }
    this.created_at = Math.floor(Date.now() / 1e3);
    this.emit("change");
    return this;
  }
};

// src/signers/nip07/index.ts

var NDKNip07Signer = class {
  _userPromise;
  nip04Queue = [];
  nip04Processing = false;
  debug;
  constructor() {
    if (!window.nostr) {
      throw new Error("NIP-07 extension not available");
    }
    this.debug = browser("ndk:nip07");
  }
  async blockUntilReady() {
    const pubkey = await window.nostr?.getPublicKey();
    if (!pubkey) {
      throw new Error("User rejected access");
    }
    return new NDKUser({ hexpubkey: pubkey });
  }
  /**
   * Getter for the user property.
   * @returns The NDKUser instance.
   */
  async user() {
    if (!this._userPromise) {
      this._userPromise = this.blockUntilReady();
    }
    return this._userPromise;
  }
  /**
   * Signs the given Nostr event.
   * @param event - The Nostr event to be signed.
   * @returns The signature of the signed event.
   * @throws Error if the NIP-07 is not available on the window object.
   */
  async sign(event) {
    if (!window.nostr) {
      throw new Error("NIP-07 extension not available");
    }
    const signedEvent = await window.nostr.signEvent(event);
    return signedEvent.sig;
  }
  async encrypt(recipient, value) {
    if (!window.nostr) {
      throw new Error("NIP-07 extension not available");
    }
    const recipientHexPubKey = recipient.hexpubkey();
    return this.queueNip04("encrypt", recipientHexPubKey, value);
  }
  async decrypt(sender, value) {
    if (!window.nostr) {
      throw new Error("NIP-07 extension not available");
    }
    const senderHexPubKey = sender.hexpubkey();
    return this.queueNip04("decrypt", senderHexPubKey, value);
  }
  async queueNip04(type, counterpartyHexpubkey, value) {
    return new Promise((resolve, reject) => {
      this.nip04Queue.push({ type, counterpartyHexpubkey, value, resolve, reject });
      if (!this.nip04Processing) {
        this.processNip04Queue();
      }
    });
  }
  async processNip04Queue(item, retries = 0) {
    if (!item && this.nip04Queue.length === 0) {
      this.nip04Processing = false;
      return;
    }
    this.nip04Processing = true;
    const { type, counterpartyHexpubkey, value, resolve, reject } = item || this.nip04Queue.shift();
    this.debug("Processing encryption queue item", { type, counterpartyHexpubkey, value });
    try {
      let result;
      if (type === "encrypt") {
        result = await window.nostr.nip04.encrypt(counterpartyHexpubkey, value);
      } else {
        result = await window.nostr.nip04.decrypt(counterpartyHexpubkey, value);
      }
      resolve(result);
    } catch (error) {
      if (error.message && error.message.includes("call already executing")) {
        if (retries < 5) {
          this.debug("Retrying encryption queue item", { type, counterpartyHexpubkey, value, retries });
          setTimeout(() => {
            this.processNip04Queue(item, retries + 1);
          }, 50 * retries);
          return;
        }
      }
      reject(error);
    }
    this.processNip04Queue();
  }
};

// src/signers/nip46/rpc.ts

var NDKNostrRpc = class extends (/* unused pure expression or super */ null && (EventEmitter6)) {
  ndk;
  signer;
  debug;
  constructor(ndk, signer, debug4) {
    super();
    this.ndk = ndk;
    this.signer = signer;
    this.debug = debug4.extend("rpc");
  }
  /**
   * Subscribe to a filter. This function will resolve once the subscription is ready.
   */
  async subscribe(filter) {
    const sub = this.ndk.subscribe(filter, { closeOnEose: false });
    sub.on("event", async (event) => {
      try {
        const parsedEvent = await this.parseEvent(event);
        if (parsedEvent.method) {
          this.emit("request", parsedEvent);
        } else {
          this.emit(`response-${parsedEvent.id}`, parsedEvent);
        }
      } catch (e) {
        this.debug("error parsing event", e, event);
      }
    });
    return new Promise((resolve, reject) => {
      sub.on("eose", () => resolve(sub));
    });
  }
  async parseEvent(event) {
    const remoteUser = this.ndk.getUser({ hexpubkey: event.pubkey });
    remoteUser.ndk = this.ndk;
    const decryptedContent = await this.signer.decrypt(remoteUser, event.content);
    const parsedContent = JSON.parse(decryptedContent);
    const { id, method, params, result, error } = parsedContent;
    if (method) {
      return { id, pubkey: event.pubkey, method, params, event };
    } else {
      return { id, result, error, event };
    }
  }
  async sendResponse(id, remotePubkey, result, kind = 24133, error) {
    const res = { id, result };
    if (error) {
      res.error = error;
    }
    const localUser = await this.signer.user();
    const remoteUser = this.ndk.getUser({ hexpubkey: remotePubkey });
    const event = new NDKEvent(this.ndk, {
      kind,
      content: JSON.stringify(res),
      tags: [["p", remotePubkey]],
      pubkey: localUser.hexpubkey()
    });
    event.content = await this.signer.encrypt(remoteUser, event.content);
    await event.sign(this.signer);
    await this.ndk.publish(event);
  }
  /**
   * Sends a request.
   * @param remotePubkey
   * @param method
   * @param params
   * @param kind
   * @param id
   */
  async sendRequest(remotePubkey, method, params = [], kind = 24133, cb) {
    const id = Math.random().toString(36).substring(7);
    const localUser = await this.signer.user();
    const remoteUser = this.ndk.getUser({ hexpubkey: remotePubkey });
    const request = { id, method, params };
    const promise = new Promise((resolve) => {
      if (cb)
        this.once(`response-${id}`, cb);
    });
    const event = new NDKEvent(this.ndk, {
      kind,
      content: JSON.stringify(request),
      tags: [["p", remotePubkey]],
      pubkey: localUser.hexpubkey()
    });
    event.content = await this.signer.encrypt(remoteUser, event.content);
    await event.sign(this.signer);
    this.debug("sending request to", remotePubkey);
    await this.ndk.publish(event);
    return promise;
  }
};

// src/signers/nip46/backend/connect.ts
var ConnectEventHandlingStrategy = class {
  async handle(backend, remotePubkey, params) {
    const [pubkey, token] = params;
    const debug4 = backend.debug.extend("connect");
    debug4(`connection request from ${pubkey}`);
    if (token && backend.applyToken) {
      debug4(`applying token`);
      await backend.applyToken(pubkey, token);
    }
    if (await backend.pubkeyAllowed(pubkey, "connect", token)) {
      debug4(`connection request from ${pubkey} allowed`);
      return "ack";
    } else {
      debug4(`connection request from ${pubkey} rejected`);
    }
    return void 0;
  }
};

// src/signers/nip46/backend/describe.ts
var DescribeHandlingStrategy = class {
  async handle(backend, remotePubkey, params) {
    const keys = Object.keys(backend.handlers);
    return JSON.stringify(keys);
  }
};

// src/signers/nip46/backend/get-public-key.ts
var GetPublicKeyHandlingStrategy = class {
  async handle(backend, remotePubkey, params) {
    return backend.localUser?.hexpubkey();
  }
};

// src/signers/nip46/backend/sign-event.ts
var SignEventHandlingStrategy = class {
  async handle(backend, remotePubkey, params) {
    const event = await backend.signEvent(remotePubkey, params);
    if (!event)
      return void 0;
    return JSON.stringify(await event.toNostrEvent());
  }
};

// src/signers/nip46/backend/nip04-decrypt.ts
var Nip04DecryptHandlingStrategy = class {
  async handle(backend, remotePubkey, params) {
    const [senderPubkey, payload] = params;
    const senderUser = new NDKUser({ hexpubkey: senderPubkey });
    const decryptedPayload = await backend.decrypt(remotePubkey, senderUser, payload);
    return JSON.stringify([decryptedPayload]);
  }
};

// src/signers/nip46/backend/nip04-encrypt.ts
var Nip04EncryptHandlingStrategy = class {
  async handle(backend, remotePubkey, params) {
    const [recipientPubkey, payload] = params;
    const recipientUser = new NDKUser({ hexpubkey: recipientPubkey });
    const decryptedPayload = await backend.encrypt(remotePubkey, recipientUser, payload);
    return decryptedPayload;
  }
};

// src/signers/nip46/backend/index.ts

var NDKNip46Backend = class {
  ndk;
  signer;
  localUser;
  debug;
  rpc;
  permitCallback;
  /**
   * @param ndk The NDK instance to use
   * @param privateKey The private key of the npub that wants to be published as
   */
  constructor(ndk, privateKey, permitCallback) {
    this.ndk = ndk;
    this.signer = new NDKPrivateKeySigner(privateKey);
    this.debug = ndk.debug.extend("nip46:backend");
    this.rpc = new NDKNostrRpc(ndk, this.signer, this.debug);
    this.permitCallback = permitCallback;
  }
  /**
   * This method starts the backend, which will start listening for incoming
   * requests.
   */
  async start() {
    this.localUser = await this.signer.user();
    const sub = this.ndk.subscribe(
      {
        kinds: [24133],
        "#p": [this.localUser.hexpubkey()]
      },
      { closeOnEose: false }
    );
    sub.on("event", (e) => this.handleIncomingEvent(e));
  }
  handlers = {
    connect: new ConnectEventHandlingStrategy(),
    sign_event: new SignEventHandlingStrategy(),
    nip04_encrypt: new Nip04EncryptHandlingStrategy(),
    nip04_decrypt: new Nip04DecryptHandlingStrategy(),
    get_public_key: new GetPublicKeyHandlingStrategy(),
    describe: new DescribeHandlingStrategy()
  };
  /**
   * Enables the user to set a custom strategy for handling incoming events.
   * @param method - The method to set the strategy for
   * @param strategy - The strategy to set
   */
  setStrategy(method, strategy) {
    this.handlers[method] = strategy;
  }
  /**
   * Overload this method to apply tokens, which can
   * wrap permission sets to be applied to a pubkey.
   * @param pubkey public key to apply token to
   * @param token token to apply
   */
  async applyToken(pubkey, token) {
    throw new Error("connection token not supported");
  }
  async handleIncomingEvent(event) {
    const { id, method, params } = await this.rpc.parseEvent(event);
    const remotePubkey = event.pubkey;
    let response;
    this.debug("incoming event", { id, method, params });
    if (!verifySignature(event.rawEvent())) {
      this.debug("invalid signature", event.rawEvent());
      return;
    }
    const strategy = this.handlers[method];
    if (strategy) {
      try {
        response = await strategy.handle(this, remotePubkey, params);
      } catch (e) {
        this.debug("error handling event", e, { id, method, params });
        this.rpc.sendResponse(id, remotePubkey, "error", void 0, e.message);
      }
    } else {
      this.debug("unsupported method", { method, params });
    }
    if (response) {
      this.debug(`sending response to ${remotePubkey}`, response);
      this.rpc.sendResponse(id, remotePubkey, response);
    } else {
      this.rpc.sendResponse(id, remotePubkey, "error", void 0, "Not authorized");
    }
  }
  async decrypt(remotePubkey, senderUser, payload) {
    if (!await this.pubkeyAllowed(remotePubkey, "decrypt", payload)) {
      this.debug(`decrypt request from ${remotePubkey} rejected`);
      return void 0;
    }
    return await this.signer.decrypt(senderUser, payload);
  }
  async encrypt(remotePubkey, recipientUser, payload) {
    if (!await this.pubkeyAllowed(remotePubkey, "encrypt", payload)) {
      this.debug(`encrypt request from ${remotePubkey} rejected`);
      return void 0;
    }
    return await this.signer.encrypt(recipientUser, payload);
  }
  async signEvent(remotePubkey, params) {
    const [eventString] = params;
    this.debug(`sign event request from ${remotePubkey}`);
    const event = new NDKEvent(this.ndk, JSON.parse(eventString));
    this.debug("event to sign", event.rawEvent());
    if (!await this.pubkeyAllowed(remotePubkey, "sign_event", event)) {
      this.debug(`sign event request from ${remotePubkey} rejected`);
      return void 0;
    }
    this.debug(`sign event request from ${remotePubkey} allowed`);
    await event.sign(this.signer);
    return event;
  }
  /**
   * This method should be overriden by the user to allow or reject incoming
   * connections.
   */
  async pubkeyAllowed(pubkey, method, params) {
    return this.permitCallback(pubkey, method, params);
  }
};

// src/signers/nip46/index.ts
var NDKNip46Signer = class {
  ndk;
  remoteUser;
  remotePubkey;
  token;
  localSigner;
  rpc;
  debug;
  /**
   * @param ndk - The NDK instance to use
   * @param tokenOrRemotePubkey - The public key, or a connection token, of the npub that wants to be published as
   * @param localSigner - The signer that will be used to request events to be signed
   */
  constructor(ndk, tokenOrRemotePubkey, localSigner) {
    let remotePubkey;
    let token;
    if (tokenOrRemotePubkey.includes("#")) {
      const parts = tokenOrRemotePubkey.split("#");
      remotePubkey = new NDKUser({ npub: parts[0] }).hexpubkey();
      token = parts[1];
    } else if (tokenOrRemotePubkey.startsWith("npub")) {
      remotePubkey = new NDKUser({ npub: tokenOrRemotePubkey }).hexpubkey();
    } else {
      remotePubkey = tokenOrRemotePubkey;
    }
    this.ndk = ndk;
    this.remotePubkey = remotePubkey;
    this.token = token;
    this.debug = ndk.debug.extend("nip46:signer");
    this.remoteUser = new NDKUser({ hexpubkey: remotePubkey });
    if (!localSigner) {
      this.localSigner = NDKPrivateKeySigner.generate();
    } else {
      this.localSigner = localSigner;
    }
    this.rpc = new NDKNostrRpc(ndk, this.localSigner, this.debug);
  }
  /**
   * Get the user that is being published as
   */
  async user() {
    return this.remoteUser;
  }
  async blockUntilReady() {
    const localUser = await this.localSigner.user();
    const user = this.ndk.getUser({ npub: localUser.npub });
    await this.rpc.subscribe({
      kinds: [24133],
      "#p": [localUser.hexpubkey()]
    });
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const connectParams = [localUser.hexpubkey()];
        if (this.token) {
          connectParams.push(this.token);
        }
        this.rpc.sendRequest(
          this.remotePubkey,
          "connect",
          connectParams,
          24133,
          (response) => {
            if (response.result === "ack") {
              resolve(user);
            } else {
              reject(response.error);
            }
          }
        );
      }, 100);
    });
  }
  async encrypt(recipient, value) {
    this.debug("asking for encryption");
    const promise = new Promise((resolve, reject) => {
      this.rpc.sendRequest(
        this.remotePubkey,
        "nip04_encrypt",
        [recipient.hexpubkey(), value],
        24133,
        (response) => {
          if (!response.error) {
            resolve(response.result);
          } else {
            reject(response.error);
          }
        }
      );
    });
    return promise;
  }
  async decrypt(sender, value) {
    this.debug("asking for decryption");
    const promise = new Promise((resolve, reject) => {
      this.rpc.sendRequest(
        this.remotePubkey,
        "nip04_decrypt",
        [sender.hexpubkey(), value],
        24133,
        (response) => {
          if (!response.error) {
            const value2 = JSON.parse(response.result);
            resolve(value2[0]);
          } else {
            reject(response.error);
          }
        }
      );
    });
    return promise;
  }
  async sign(event) {
    this.debug("asking for a signature");
    const promise = new Promise((resolve, reject) => {
      this.rpc.sendRequest(
        this.remotePubkey,
        "sign_event",
        [JSON.stringify(event)],
        24133,
        (response) => {
          this.debug("got a response", response);
          if (!response.error) {
            const json = JSON.parse(response.result);
            resolve(json.sig);
          } else {
            reject(response.error);
          }
        }
      );
    });
    return promise;
  }
};

// src/signers/private-key/index.ts

var NDKPrivateKeySigner = class {
  _user;
  privateKey;
  constructor(privateKey) {
    if (privateKey) {
      this.privateKey = privateKey;
      this._user = new NDKUser({ hexpubkey: getPublicKey(this.privateKey) });
    }
  }
  static generate() {
    const privateKey = generatePrivateKey();
    return new NDKPrivateKeySigner(privateKey);
  }
  async blockUntilReady() {
    if (!this._user) {
      throw new Error("NDKUser not initialized");
    }
    return this._user;
  }
  async user() {
    await this.blockUntilReady();
    return this._user;
  }
  async sign(event) {
    if (!this.privateKey) {
      throw Error("Attempted to sign without a private key");
    }
    return getSignature(event, this.privateKey);
  }
  async encrypt(recipient, value) {
    if (!this.privateKey) {
      throw Error("Attempted to encrypt without a private key");
    }
    const recipientHexPubKey = recipient.hexpubkey();
    return await nip04_exports.encrypt(this.privateKey, recipientHexPubKey, value);
  }
  async decrypt(sender, value) {
    if (!this.privateKey) {
      throw Error("Attempted to decrypt without a private key");
    }
    const senderHexPubKey = sender.hexpubkey();
    return await nip04_exports.decrypt(this.privateKey, senderHexPubKey, value);
  }
};

// src/zap/invoice.ts

function zapInvoiceFromEvent(event) {
  const description = event.getMatchingTags("description")[0];
  const bolt11 = event.getMatchingTags("bolt11")[0];
  let decodedInvoice;
  let zapRequest;
  if (!description || !bolt11 || !bolt11[1]) {
    return null;
  }
  try {
    let zapRequestPayload = description[1];
    if (zapRequestPayload.startsWith("%")) {
      zapRequestPayload = decodeURIComponent(zapRequestPayload);
    }
    if (zapRequestPayload === "") {
      return null;
    }
    zapRequest = JSON.parse(zapRequestPayload);
    decodedInvoice = decode(bolt11[1]);
  } catch (e) {
    return null;
  }
  const amountSection = decodedInvoice.sections.find((s) => s.name === "amount");
  if (!amountSection) {
    return null;
  }
  const amount = parseInt(amountSection.value);
  if (!amount) {
    return null;
  }
  const content = zapRequest.content;
  const sender = zapRequest.pubkey;
  const recipientTag = event.getMatchingTags("p")[0];
  const recipient = recipientTag[1];
  let zappedEvent = event.getMatchingTags("e")[0];
  if (!zappedEvent) {
    zappedEvent = event.getMatchingTags("a")[0];
  }
  const zappedEventId = zappedEvent ? zappedEvent[1] : void 0;
  const zapInvoice = {
    id: event.id,
    zapper: event.pubkey,
    zappee: sender,
    zapped: recipient,
    zappedEvent: zappedEventId,
    amount,
    comment: content
  };
  return zapInvoice;
}

// src/index.ts
var NDK7 = class extends node_modules_eventemitter3 {
  pool;
  signer;
  cacheAdapter;
  debug;
  devWriteRelaySet;
  delayedSubscriptions;
  constructor(opts = {}) {
    super();
    this.debug = opts.debug || browser("ndk");
    this.pool = new NDKPool(opts.explicitRelayUrls || [], this);
    this.signer = opts.signer;
    this.cacheAdapter = opts.cacheAdapter;
    this.delayedSubscriptions = /* @__PURE__ */ new Map();
    if (opts.devWriteRelayUrls) {
      this.devWriteRelaySet = NDKRelaySet2.fromRelayUrls(opts.devWriteRelayUrls, this);
    }
  }
  toJSON() {
    return { relayCount: this.pool.relays.size }.toString();
  }
  /**
   * Connect to relays with optional timeout.
   * If the timeout is reached, the connection will be continued to be established in the background.
   */
  async connect(timeoutMs) {
    this.debug("Connecting to relays", { timeoutMs });
    return this.pool.connect(timeoutMs);
  }
  /**
   * Get a NDKUser object
   *
   * @param opts
   * @returns
   */
  getUser(opts) {
    const user = new NDKUser(opts);
    user.ndk = this;
    return user;
  }
  /**
   * Create a new subscription. Subscriptions automatically start and finish when all relays
   * on the set send back an EOSE. (set `opts.closeOnEose` to `false` in order avoid this)
   *
   * @param filter
   * @param opts
   * @param relaySet explicit relay set to use
   * @param autoStart automatically start the subscription
   * @returns NDKSubscription
   */
  subscribe(filter, opts, relaySet, autoStart = true) {
    const subscription = new NDKSubscription(this, filter, opts, relaySet);
    if (autoStart)
      subscription.start();
    return subscription;
  }
  /**
   * Publish an event to a relay
   * @param event event to publish
   * @param relaySet explicit relay set to use
   * @param timeoutMs timeout in milliseconds to wait for the event to be published
   * @returns The relays the event was published to
   */
  async publish(event, relaySet, timeoutMs) {
    if (!relaySet) {
      relaySet = this.devWriteRelaySet || calculateRelaySetFromEvent(this, event);
    }
    return relaySet.publish(event, timeoutMs);
  }
  async fetchEvent(idOrFilter, opts = {}, relaySet) {
    let filter;
    if (typeof idOrFilter === "string") {
      filter = filterFromId(idOrFilter);
    } else {
      filter = idOrFilter;
    }
    if (!filter) {
      throw new Error(`Invalid filter: ${JSON.stringify(idOrFilter)}`);
    }
    return new Promise((resolve) => {
      const s = this.subscribe(filter, { ...opts, closeOnEose: true }, relaySet, false);
      s.on("event", (event) => {
        event.ndk = this;
        resolve(event);
      });
      s.on("eose", () => {
        resolve(null);
      });
      s.start();
    });
  }
  /**
   * Fetch events
   */
  async fetchEvents(filter, opts = {}, relaySet) {
    return new Promise((resolve) => {
      const events = /* @__PURE__ */ new Map();
      const relaySetSubscription = this.subscribe(filter, { ...opts, closeOnEose: true }, relaySet, false);
      relaySetSubscription.on("event", (event) => {
        const existingEvent = events.get(event.tagId());
        if (existingEvent) {
          event = dedup(existingEvent, event);
        }
        event.ndk = this;
        events.set(event.tagId(), event);
      });
      relaySetSubscription.on("eose", () => {
        resolve(new Set(events.values()));
      });
      relaySetSubscription.start();
    });
  }
  /**
   * Ensures that a signer is available to sign an event.
   */
  async assertSigner() {
    if (!this.signer) {
      this.emit("signerRequired");
      throw new Error("Signer required");
    }
  }
};



/***/ }),

/***/ 9794:
/***/ ((module) => {

"use strict";
module.exports = {"version":"1.0.34"};

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
__webpack_require__(6672);
__webpack_require__(2451);
__webpack_require__(3797);
__webpack_require__(5284);
__webpack_require__(5857);
__webpack_require__(8751);
__webpack_require__(5123);
__webpack_require__(6044);
__webpack_require__(8281); // last
})();

/******/ })()
;