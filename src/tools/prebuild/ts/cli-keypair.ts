import { generateKeyPair } from 'crypto';
import * as util from 'util';

const generateKeyPairAsync = util.promisify(generateKeyPair);

export default async function genKeyPair(fileName: string | undefined, options: {}) {
  const keypairs = await generateKeyPairAsync('ec', {
    namedCurve: 'secp160k1',
    publicKeyEncoding: {type: 'spki', format: 'pem'},
    privateKeyEncoding: {type: 'pkcs8', format: 'pem'}
  });
    // tslint:disable: no-console
  console.log(keypairs.publicKey);
  console.log(keypairs.privateKey);
}
