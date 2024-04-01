import express from 'express';
import { body } from 'express-validator';
import { Keypair, Transaction } from '@solana/web3.js';
import { authHandler } from '@/middleware/auth.middleware';
import { toNumberSafe } from '@/utils/game-util';
import { processTransaction } from '@/modules/transactionModule';
import { getServiceClient } from '@/supabasedb';

const getGamePoolAuthorityWallet = () => {
	return Keypair.fromSecretKey(
		Uint8Array.from(
			JSON.parse(process.env.GAME_POOL_AUTHORITY_WALLET) as any
		)
	);
};

const transactionController = express.Router();

transactionController.post(
	'/sign-withdraw-transaction',
	body('rawTransaction')
		.notEmpty()
		.withMessage('Raw transaction is required')
		.trim()
		.escape(),
	body('splLamportsWithdrawAmount')
		.notEmpty()
		.withMessage('Amount to withdraw is required')
		.trim()
		.isNumeric(),
	authHandler,
	async (req: any, res) => {
		const { rawTransaction, splLamportsWithdrawAmount } = req.body;
		const { publicKey } = req.userData;

		const { data: user } = await getServiceClient().from('users').select('*').eq('publicKey', publicKey).single();

		if (!user) {
			return res.status(404).json({ errorMessage: 'User not found' });
		}

		if (
			toNumberSafe(splLamportsWithdrawAmount) >
			toNumberSafe(user.depositedSplLamports)
		) {
			return res.status(403).json({
				errorMessage: 'User deposited balance not enough'
			});
		}

		const transaction = Transaction.from(JSON.parse(rawTransaction));

		transaction.partialSign(getGamePoolAuthorityWallet());

		const transactionBuffer = JSON.stringify(
			transaction
				.serialize({
					requireAllSignatures: false
				})
				.toJSON().data
		);

		return res.status(200).json({ transactionBuffer });
	}
);

transactionController.get(
	'/:transactionSignature',
	body('transactionSignature')
		.notEmpty()
		.withMessage('Transaction signature is required')
		.trim()
		.escape(),
	authHandler,
	async (req: any, res) => {
		const { transactionSignature } = req.params;

		const { data: transaction } = await getServiceClient()
			.from('transactions')
			.select('*')
			.eq('transactionSignature', transactionSignature)
			.single();

		if (!transaction) {
			return res
				.status(404)
				.json({ errorMessage: 'Transaction not found' });
		}

		return res.status(200).json({ transaction });
	}
);

transactionController.post(
	'/process-transaction',
	body('transactionHash')
		.notEmpty()
		.withMessage('Transaction hash is required')
		.trim()
		.escape(),
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
			console.log('error')
			return res.status(400).json({
				errorMessage: error
			});
		}

		if (!user) {
			return res.status(404).json({ errorMessage: 'User not found' });
		}

		return res.status(200).json(user);
	}
);

export default transactionController;
