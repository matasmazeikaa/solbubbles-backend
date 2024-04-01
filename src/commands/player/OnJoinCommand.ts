import { Command } from '@colyseus/command';
import { GameConfig } from '@/config/game-config';
import { GameRoom } from '@/game/GameRoom';
import { Player } from '@/state/PlayerState';
import { massToRadius, uniformPosition } from '@/utils/game-util';

export class OnJoinCommand extends Command<
	GameRoom,
	{ sessionId; roomSplTokenEntryFee; publicKey; client }
> {
	execute({ sessionId, roomSplTokenEntryFee, publicKey, client }) {
		const position = uniformPosition(
			this.state.players,
			massToRadius(GameConfig.startingPlayerMass)
		);


		this.state.players[sessionId] = new Player({
			id: sessionId,
			position: position,
			type: 'player',
			speed: Number(GameConfig.startingSpeed),
			splTokens: roomSplTokenEntryFee,
			publicKey,
			client
		})
	}
}
