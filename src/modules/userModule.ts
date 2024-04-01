import { TOKEN_CONFIG } from '@/constants';
import {
	USER_DEPOSITED_BALANCE_NOT_ENOUGH,
	USER_WITH_ADDRESS_NOT_FOUND
} from '@/error-codes';
import { getServiceClient } from '@/supabasedb';

export const lowerUserBalanceWithLamports = async (
	publicKey: string,
	amountToLower: number
) => {
	const { data: user } = await getServiceClient()
		.from('users')
		.select('*')
		.eq('publicKey', publicKey)
		.single();

	if (!user) {
		throw Error(USER_WITH_ADDRESS_NOT_FOUND);
	}

	if (Number(amountToLower) > Number(user.depositedSplLamports)) {
		throw Error(USER_DEPOSITED_BALANCE_NOT_ENOUGH);
	}

	const newAmount = `${
		Number(user.depositedSplLamports) - Number(amountToLower)
	}`;

	try {
		const { data: newUser } = await getServiceClient()
			.from('users')
			.update({ depositedSplLamports: newAmount })
			.eq('publicKey', publicKey)
			.select()
			.single();

		return newUser;
	} catch (error) {
		throw Error(error as string);
	}
};

export const increaseUserBalanceWithLamports = async ({
	publicKey,
	amountToIncrease
}: {
	publicKey: string;
	amountToIncrease: number;
}) => {
	const { data: user } = await getServiceClient()
		.from('users')
		.select('*')
		.eq('publicKey', publicKey)
		.single();

	if (!user) {
		throw Error(USER_WITH_ADDRESS_NOT_FOUND);
	}

	const newAmount = `${
		Number(user.depositedSplLamports) + Number(amountToIncrease)
	}`;

	try {
		const { data: newUser } = await getServiceClient()
			.from('users')
			.update({ depositedSplLamports: newAmount })
			.eq('publicKey', publicKey)
			.select()
			.single();

		return newUser;
	} catch (error) {
		throw Error(error as string);
	}
};

export const increaseUserBalanceWithTokens = async ({
	publicKey,
	amountToIncrease
}: {
	publicKey: string;
	amountToIncrease: number;
}) => {
	return await increaseUserBalanceWithLamports({
		publicKey,
		amountToIncrease: amountToIncrease * TOKEN_CONFIG.LAMPORTS_PER_TOKEN
	});
}