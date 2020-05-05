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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvY2xpLWtleXBhaXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQXlDO0FBQ3pDLG1EQUE2QjtBQUU3QixNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQWUsQ0FBQyxDQUFDO0FBRTdELFNBQThCLFVBQVUsQ0FBQyxRQUE0QixFQUFFLE9BQVc7O1FBQ2hGLE1BQU0sUUFBUSxHQUFHLE1BQU0sb0JBQW9CLENBQUMsSUFBSSxFQUFFO1lBQ2hELFVBQVUsRUFBRSxXQUFXO1lBQ3ZCLGlCQUFpQixFQUFFLEVBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDO1lBQ2hELGtCQUFrQixFQUFFLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDO1NBQ25ELENBQUMsQ0FBQztRQUNELDZCQUE2QjtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuQyxDQUFDO0NBQUE7QUFURCw2QkFTQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvY2xpLWtleXBhaXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZW5lcmF0ZUtleVBhaXIgfSBmcm9tICdjcnlwdG8nO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICd1dGlsJztcblxuY29uc3QgZ2VuZXJhdGVLZXlQYWlyQXN5bmMgPSB1dGlsLnByb21pc2lmeShnZW5lcmF0ZUtleVBhaXIpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBnZW5LZXlQYWlyKGZpbGVOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdGlvbnM6IHt9KSB7XG4gIGNvbnN0IGtleXBhaXJzID0gYXdhaXQgZ2VuZXJhdGVLZXlQYWlyQXN5bmMoJ2VjJywge1xuICAgIG5hbWVkQ3VydmU6ICdzZWNwMTYwazEnLFxuICAgIHB1YmxpY0tleUVuY29kaW5nOiB7dHlwZTogJ3Nwa2knLCBmb3JtYXQ6ICdwZW0nfSxcbiAgICBwcml2YXRlS2V5RW5jb2Rpbmc6IHt0eXBlOiAncGtjczgnLCBmb3JtYXQ6ICdwZW0nfVxuICB9KTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhrZXlwYWlycy5wdWJsaWNLZXkpO1xuICBjb25zb2xlLmxvZyhrZXlwYWlycy5wcml2YXRlS2V5KTtcbn1cbiJdfQ==
