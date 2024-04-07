import { MapSchema } from '@colyseus/schema';
import { Player } from '@/state/PlayerState';
import { increaseUserBalanceWithTokens } from './userModule';

export const restorePlayerBalances = async (
	players: MapSchema<Player, string>
) => {

	players.forEach(async (player) => {
		if (player.client) {
			const publicKey = player.publicKey;
			const amountToIncrease = player.splTokens;

			await increaseUserBalanceWithTokens({
				publicKey,
				amountToIncrease
			});
		}
	})
};
