import Router from 'express-promise-router';
import jwt from 'jsonwebtoken';

import { authHandler } from '@/middleware/auth.middleware';
import { isRequestAuthorized } from '@/modules/auth';
import { processTransaction } from '@/modules/transactionModule';
import { roundTokensFromLamports } from '@/utils/format';
import { getServiceClient } from '@/supabasedb';

const userController = Router();

userController.get('/', authHandler, async (req: any, res) => {
	const { publicKey } = req.userData;

	const { data: user } = await getServiceClient().from('users').select('*').eq('publicKey', publicKey).single();

	if (!user) {
		res.status(404).json({ errorMessage: 'User not found' });

		return;
	}

	res.status(200).json({
		publicKey: user.publicKey,
		depositedTokens: {
			amount: user.depositedSplLamports,
			decimals: 9,
			uiAmount: roundTokensFromLamports(user.depositedSplLamports),
			uiAmountString: `${roundTokensFromLamports(user.depositedSplLamports)}`
		}
	});
});

userController.post(
	'/process-transaction',
	authHandler,
	async (req: any, res) => {
		const { transactionHash } = req.body;
		const { publicKey } = req.userData;

		const { data: user } = await getServiceClient().from('users').select('*').eq('publicKey', publicKey).single();

		try {
			processTransaction({
				publicKey,
				transactionSignature: transactionHash
			});
		} catch (error) {
			console.log(error);
			res.status(404).json({ errorMessage: error });
		}

		if (!user) {
			res.status(404).json({ errorMessage: 'User not found' });
		}

		res.status(200).json(user);
	}
);

userController.post('/nonce', async (req: any, res) => {
	const { publicKey } = req.body;

	const nonce = Math.floor(Math.random() * 100000);

	const { data: user } = await getServiceClient().from('users').select('*').eq('publicKey', publicKey).single()

	if (!user) {
		const { error } = await getServiceClient().from('users').insert({
			'publicKey': publicKey,
		})

		if (error) {
			return res.status(400).json({
				errorMessage: 'Failed to create user with nonce'
			})
		}
	}

	try {
		await getServiceClient().from('users').update({
			auth: {
				getNonce: nonce,
				lastAuth: new Date().toISOString(),
				lastAuthStatus: 'pending'
			}
		}).eq('publicKey', publicKey)
	} catch (error) {
		console.log(error)
	}

	return res.status(200).json({ nonce });
});

userController.post('/login', async (req: any, res) => {
	const { publicKey, signature, nonce } = req.body;

	const { data: user } = await getServiceClient().from('users').select('*').eq('publicKey', publicKey).single();

	const userNonce = (user.auth as any).getNonce;

	if (!user || nonce !== userNonce) {
		return res.status(400).json({
			errorMessage: 'Nonce not found, try again'
		})
	}

	if (!isRequestAuthorized({ publicKey, signature, nonce: userNonce })) {
		console.log(
			`Unauthorized login request due to invalid signature for publicKey: ${publicKey}.`
		);

		return res.status(401).json({
			data: null,
			error: 'Unauthorized to make this request. Signature invalid.'
		});
	}

	const payload = {
		publicKey,
		signature,
		nonce: userNonce,
		sub: 'Auth for Dapp'
	};

	const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
		expiresIn: '24h'
	});

	return res.status(200).json({
		user,
		jwt: accessToken
	});
});

export default userController;
