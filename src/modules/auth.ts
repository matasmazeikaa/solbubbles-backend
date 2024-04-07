import nacl from 'tweetnacl'
import bs58 from 'bs58'
import util from 'util'

interface ISigninMessage {
	domain: string;
	publicKey: string;
	nonce: number;
	statement: string;
}


export class SigninMessage {
	domain: any;
	publicKey: any;
	nonce: number;
	statement: any;
  
	constructor({ domain, publicKey, nonce, statement }: ISigninMessage) {
	  this.domain = domain;
	  this.publicKey = publicKey;
	  this.nonce = nonce;
	  this.statement = statement;
	}
  
	prepare() {
	  return `${this.statement}${this.nonce}`;
	}
  
	async validate(signature: string) {
	  const msg = this.prepare();
	  const signatureUint8 = bs58.decode(signature);
	  const msgUint8 = new util.TextEncoder().encode(msg);
	  const pubKeyUint8 = bs58.decode(this.publicKey);
  
	  return nacl.sign.detached.verify(msgUint8, signatureUint8, pubKeyUint8);
	}
}

export const verifySignedMessage = ({publicKey, signature, nonce}: {
	publicKey: string;
	signature: string;
	nonce: number;
}) => {
	try {
		const signinMessage = new SigninMessage({
			domain: process.env.FRONTEND_URL,
			publicKey,
			nonce,
			statement: 'Sign this message to sign in to the app.'
		});

		return signinMessage.validate(signature);
	} catch (error) {
		return false;
	}
};


export const isRequestAuthorized = ({
	publicKey,
	signature,
	nonce
}: {
	publicKey: string;
	signature: string;
	nonce: number;
}) => {
	return verifySignedMessage({publicKey, signature, nonce});
};
