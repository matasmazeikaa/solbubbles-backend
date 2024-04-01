import { Connection, PublicKey } from '@solana/web3.js';

export const TOKEN_CONFIG = {
	MINT_PUBLIC_KEY: new PublicKey(
		'GMhjEWpr9YrhfrYuxzgBznE3gMh6QKscTaXCYM5kuNrK'
	),
	LAMPORTS_PER_TOKEN: 1000000000
};

export const connection = new Connection("https://autumn-divine-firefly.solana-devnet.quiknode.pro/d5ed5a541b906e97d294509e6ff3b4057368d758/");
