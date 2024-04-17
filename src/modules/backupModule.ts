import { MapSchema } from '@colyseus/schema';
import { Player } from '@/state/PlayerState';
import { increaseUserBalanceWithTokens } from './userModule';
import { getServiceClient } from '@/supabasedb';

export const restorePlayerBalances = async () => {
	const { data } = await getServiceClient().from('game_state').select('*');

	data.forEach(async (room) => {
		if (!room.players) return;

		Object.values(room.players).forEach(async (player: Player) => {
			if (player.type !== 'player') return;

			const splTokens = Object.values(player.cells).reduce(
				(acc, cell) => {
					return acc + cell.splTokens;
				},
				0
			);

			await increaseUserBalanceWithTokens({
				publicKey: player.publicKey,
				amountToIncrease: splTokens
			});
		});


		const {error} = await getServiceClient().from('game_state').upsert({
			id: room.id,
			players: {}
		})

		console.log(error)
	});
};
