import { connection } from '@/utils/solanaNetwork';
import { ParsedTransactionWithMeta, RpcResponseAndContext, SignatureStatus } from '@solana/web3.js';
import { increaseUserBalanceWithLamports, lowerUserBalanceWithLamports } from './userModule';
import { getServiceClient } from '@/supabasedb';

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

let transactionsBeingProcessed: string[] = [];

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
			(instruction) => 'parsed' in instruction && instruction.parsed.type === 'transfer'
		);
	});

	if (transferInstructions) {
		const transferInstruction = transferInstructions.instructions.find(
			(instruction) => 'parsed' in instruction && instruction.parsed.type === 'transfer'
		);

		if (!transferInstruction  || !('parsed' in transferInstruction)) {
			return null;
		}

		return Number(transferInstruction.parsed.info.amount);
	}

	return null;
};

const pollSignatureStatusUntillFinalized = async (
	signature: string,
	proccessingTime?: number
): Promise<RpcResponseAndContext<SignatureStatus>> => {
	const processingTime = proccessingTime
		? new Date().getTime() - proccessingTime
		: new Date().getTime();

	try {
		const status = await connection.getSignatureStatus(signature);

		if (status.value?.confirmationStatus === 'finalized') {
			return status;
		}

		await new Promise((resolve) => setTimeout(resolve, 5000));

		return pollSignatureStatusUntillFinalized(signature, processingTime);
	} catch (error) {
		throw new Error('Error polling signature status');
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

		if (transactionsBeingProcessed.includes(transactionSignature)) {
			throw new Error('Transaction already being processed');
		}

		transactionsBeingProcessed.push(transactionSignature);

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

		console.log(transactionAmount, 'transaction amount');
		console.log(JSON.stringify(parsedTransaction), 'transaction');

		if (transactionAmount === null) {
			throw new Error('Transaction amount not found');
		}

		const transactionToSave = getServiceClient().from('transactions').insert({
			transactionSignature
		})

		if (isTransactionTypeDepositSplTokens(parsedTransaction)) {
			return Promise.all([
				increaseUserBalanceWithLamports({
					publicKey,
					amountToIncrease: transactionAmount
				}),
				transactionToSave,
			]);
		}

		if (isTransactionTypeWithdrawSplTokens(parsedTransaction)) {
			return Promise.all([
				lowerUserBalanceWithLamports(publicKey, transactionAmount),
				transactionToSave
			]);
		}

		transactionsBeingProcessed = transactionsBeingProcessed.filter(
			(transaction) => transaction !== transactionSignature
		);

		return null;
	} catch (error) {
		transactionsBeingProcessed = transactionsBeingProcessed.filter(
			(transaction) => transaction !== transactionSignature
		);
		throw new Error(error as string);
	}
};
