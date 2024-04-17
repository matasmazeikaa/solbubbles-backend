import { getServiceClient } from '@/supabasedb';
import { z } from 'zod';
const getOrCreateUserStatistics = async (publicKey: string) => {
	let request = await getServiceClient()
		.from('user_statistics')
		.select('*')
		.eq('publicKey', publicKey)
		.single();

	if (!request.data) {
		request = await await getServiceClient()
			.from('user_statistics')
			.insert({
				publicKey
			})
			.single();
	}

	return request;
};

export const increaseUserKillCount = async ({
	publicKey,
	kills
}: {
	publicKey: string;
	kills: number;
}) => {
	z.object({
		publicKey: z.string(),
		kills: z.number()
	}).parse({ publicKey, kills });

	let request = await getOrCreateUserStatistics(publicKey);

	if (request.error) {
		throw Error(request.error.message);
	}

	const killCount = request.data.killCount + kills;

	console.log(publicKey);

	request = await getServiceClient()
		.from('user_statistics')
		.upsert({
			killCount,
			publicKey
		})

	if (request.error) {
		throw Error(request.error.message);
	}

	return request.data;
};

export const increaseUserTotalWinnings = async ({
	publicKey,
	tokensWon
}: {
	publicKey: string;
	tokensWon: number;
}) => {
	z.object({
		publicKey: z.string(),
		tokensWon: z.number()
	}).parse({ publicKey, tokensWon });

	let request = await getOrCreateUserStatistics(publicKey);

	if (request.error) {
		throw Error(request.error.message);
	}

	const totalTokenWinnings = request.data.totalTokenWinnings + tokensWon;

	request = await getServiceClient()
		.from('user_statistics')
		.update({
			totalTokenWinnings
		})
		.eq('publicKey', publicKey)
		.single();

	if (request.error) {
		throw Error(request.error.message);
	}

	return request.data;
};
