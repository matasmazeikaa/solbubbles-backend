import { connection } from '@/utils/solanaNetwork';
import {
	ParsedTransactionWithMeta,
	RpcResponseAndContext,
	SignatureStatus
} from '@solana/web3.js';
import {
	increaseUserBalanceWithLamports,
	lowerUserBalanceWithLamports
} from './userModule';
import { getServiceClient } from '@/supabasedb';
import { logger } from 'logger';

export interface Transaction {
	blockTime: number;
	meta: Meta;
	slot: number;
	transaction: TransactionClass;
}

export interface Meta {
	computeUnitsConsumed: number;
	err: null;
	fee: number;
	innerInstructions: InnerInstruction[];
	logMessages: string[];
	postBalances: number[];
	postTokenBalances: TokenBalance[];
	preBalances: number[];
	preTokenBalances: TokenBalance[];
	rewards: any[];
	status: Status;
}

export interface InnerInstruction {
	index: number;
	instructions: InnerInstructionInstruction[];
}

export interface InnerInstructionInstruction {
	parsed: Parsed;
	program: string;
	programId: string;
	stackHeight: number;
}

export interface Parsed {
	info: Info;
	type: string;
}

export interface Info {
	amount: string;
	authority: string;
	destination: string;
	source: string;
}

export interface TokenBalance {
	accountIndex: number;
	mint: string;
	owner: string;
	programId: string;
	uiTokenAmount: UITokenAmount;
}

export interface UITokenAmount {
	amount: string;
	decimals: number;
	uiAmount: number;
	uiAmountString: string;
}

export interface Status {
	Ok: null;
}

export interface TransactionClass {
	message: Message;
	signatures: string[];
}

export interface Message {
	accountKeys: AccountKey[];
	instructions: MessageInstruction[];
	recentBlockhash: string;
}

export interface AccountKey {
	pubkey: string;
	signer: boolean;
	source: string;
	writable: boolean;
}

export interface MessageInstruction {
	accounts: string[];
	data: string;
	programId: string;
	stackHeight: null;
}

export let transactionsBeingProcessed: {
	transactionSignature: string;
	error?: string;
}[] = [];

export const getProcessingTransaction = (
	transactionSignature: string
): { transactionSignature: string; error?: string } | null =>
	transactionsBeingProcessed.find(
		(transaction) => transaction.transactionSignature === transactionSignature
	);


export const removeProcessingTransaction = (transactionSignature: string) => {
	transactionsBeingProcessed = transactionsBeingProcessed.filter(
		(transaction) => transaction.transactionSignature !== transactionSignature
	);
}
// 2 minutes
// const MAX_PROCESSING_TIME = 120000;

const isTransactionTypeDepositSplTokens = (
	transaction: ParsedTransactionWithMeta
) =>
	transaction.meta.logMessages.some((logMessage) =>
		logMessage.includes('Instruction: DepositSplTokens')
	);

const isTransactionTypeWithdrawSplTokens = (
	transaction: ParsedTransactionWithMeta
) =>
	transaction.meta.logMessages.some((logMessage) =>
		logMessage.includes('Instruction: WithdrawSplTokens')
	);

const getTransactionTokenAmount = (
	transaction: ParsedTransactionWithMeta
): number => {
	const innerInstructions = transaction.meta.innerInstructions;

	const transferInstructions = innerInstructions.find((innerInstruction) => {
		return innerInstruction.instructions.some(
			(instruction) =>
				'parsed' in instruction &&
				instruction.parsed.type === 'transfer'
		);
	});

	if (transferInstructions) {
		const transferInstruction = transferInstructions.instructions.find(
			(instruction) =>
				'parsed' in instruction &&
				instruction.parsed.type === 'transfer'
		);

		if (!transferInstruction || !('parsed' in transferInstruction)) {
			return null;
		}

		return Number(transferInstruction.parsed.info.amount);
	}

	return null;
};

const TRANSACTION_STATUS_TIMEOUT = 60000 * 2;
const pollSignatureStatusUntillFinalized = async (
	signature: string,
	lastTime?: number
): Promise<RpcResponseAndContext<SignatureStatus>> => {
	try {
		const status = await connection.getSignatureStatus(signature, {
			searchTransactionHistory: true
		});

		if (status.value?.confirmationStatus === 'finalized') {
			return status;
		}

		if (lastTime && Date.now() - lastTime >= TRANSACTION_STATUS_TIMEOUT) {
			throw new Error(
				'Transaction timeout reached. If your transaction shows as success on Solana Explorer, please contact support.'
			);
		}

		await new Promise((resolve) => setTimeout(resolve, 5000));

		return pollSignatureStatusUntillFinalized(
			signature,
			lastTime || Date.now()
		);
	} catch (error) {
		throw new Error((error as string) || 'Error polling signature status');
	}
};

export const processTransaction = async ({
	transactionSignature,
	publicKey
}: {
	transactionSignature: string;
	publicKey: string;
}) => {
	try {
		const { data: processedTransaction } = await getServiceClient()
			.from('transactions')
			.select('*')
			.eq('transactionSignature', transactionSignature)
			.single();

		if (processedTransaction) {
			throw new Error('Transaction already processed');
		}

		const proccessingtransaction = getProcessingTransaction(transactionSignature)

		if (proccessingtransaction?.error) {
			throw new Error(proccessingtransaction.error);
		}

		if (proccessingtransaction) {
			throw new Error('Transaction already being processed');
		}

		transactionsBeingProcessed.push({
			transactionSignature
		});

		const status = await pollSignatureStatusUntillFinalized(
			transactionSignature
		);

		if (status.value?.confirmationStatus !== 'finalized') {
			throw new Error('Transaction not finalized');
		}

		const parsedTransaction = await connection.getParsedTransaction(
			transactionSignature
		);

		const transactionAmount = getTransactionTokenAmount(parsedTransaction);

		if (transactionAmount === null) {
			throw new Error('Transaction amount not found');
		}

		const transactionToSave = getServiceClient()
			.from('transactions')
			.insert({
				transactionSignature
			});

		if (isTransactionTypeDepositSplTokens(parsedTransaction)) {
			return Promise.all([
				increaseUserBalanceWithLamports({
					publicKey,
					amountToIncrease: transactionAmount
				}),
				transactionToSave
			]);
		}

		if (isTransactionTypeWithdrawSplTokens(parsedTransaction)) {
			return Promise.all([
				lowerUserBalanceWithLamports(publicKey, transactionAmount),
				transactionToSave
			]);
		}

		transactionsBeingProcessed = transactionsBeingProcessed.filter(
			(transaction) => transaction.transactionSignature !== transactionSignature
		);

		return null;
	} catch (error) {
		// tag transaction with erorr message
		transactionsBeingProcessed = transactionsBeingProcessed.map(
			(transaction) => {
				if (transaction.transactionSignature === transactionSignature) {
					return {transactionSignature, error: `${transaction.transactionSignature} - ${error}`};
				}

				return transaction;
			}
		);

		const errorMessage = (error as Error).message || 'Error processing transaction';

		logger.error({
			message: errorMessage,
			transactionSignature,
			error: error as Error
		});
	}
};
