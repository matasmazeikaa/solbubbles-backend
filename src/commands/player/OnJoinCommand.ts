import { Command } from '@colyseus/command';
import { BotConfig, GameConfig } from '@/config/game-config';
import { GameRoom } from '@/game/GameRoom';
import { Player } from '@/state/PlayerState';
import { massToRadius, uniformPosition } from '@/utils/game-util';
import { Client, generateId } from 'colyseus';

interface OnJoinCommandPayload {
	sessionId: string;
	roomSplTokenEntryFee: number;
	publicKey: string;
	client: Client;
}

export class OnJoinCommand extends Command<GameRoom, OnJoinCommandPayload> {
	execute({
		sessionId,
		roomSplTokenEntryFee,
		publicKey,
		client
	}: OnJoinCommandPayload) {
		const players = Array.from(this.state.players.values());

		const position = uniformPosition(
			players,
			massToRadius(GameConfig.startingPlayerMass)
		);

		const player = new Player({
			id: sessionId,
			position: position,
			type: 'player',
			speed: Number(GameConfig.startingSpeed),
			splTokens: roomSplTokenEntryFee,
			roomSplTokenEntryFee,
			publicKey,
			client
		});

		this.state.players.set(player.id, player);

		if (BotConfig.ACTIVE) {
			const botToAdd = BotConfig.MAX_BOT;

			for (let i = botToAdd; i > 0; i--) {
				const players = Array.from(this.state.players.values());

				const position = uniformPosition(
					players,
					massToRadius(GameConfig.startingPlayerMass)
				);

				const bot = new Player({
					id: generateId(),
					position: position,
					type: 'bot',
					speed: Number(GameConfig.startingSpeed),
					splTokens: 25,
					publicKey: null,
					client: null
				});

				this.state.players.set(bot.id, bot);
			}
		}
	}
}
