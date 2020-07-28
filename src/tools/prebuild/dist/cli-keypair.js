"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const crypto_1 = require("crypto");
const util = tslib_1.__importStar(require("util"));
const generateKeyPairAsync = util.promisify(crypto_1.generateKeyPair);
function genKeyPair(fileName, options) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const keypairs = yield generateKeyPairAsync('ec', {
            namedCurve: 'secp160k1',
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        // tslint:disable: no-console
        console.log(keypairs.publicKey);
        console.log(keypairs.privateKey);
    });
}
exports.default = genKeyPair;

//# sourceMappingURL=cli-keypair.js.map
