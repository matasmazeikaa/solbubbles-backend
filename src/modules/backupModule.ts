import { MapSchema } from '@colyseus/schema';
import { Player } from '@/state/PlayerState';
import { increaseUserBalanceWithTokens } from './userModule';

export const restorePlayerBalances = async (
	players: MapSchema<Player, string>
) => {
	const playerArray = Array.from(players.values());

	for (const player of playerArray) {
		await increaseUserBalanceWithTokens({publicKey: player.publicKey, amountToIncrease: player.splTokens});
	}
};
