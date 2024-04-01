import jwt from 'jsonwebtoken';
import { Dispatcher } from '@colyseus/command';
import { type } from '@colyseus/schema';
import { Client, Room, ServerError, updateLobby } from 'colyseus';
import { isRequestAuthorized } from '@/modules/auth';
import { BalanceMassCommand } from '@/commands/game/BalanceMassCommand';
import { OnJoinCommand } from '@/commands/player/OnJoinCommand';
import { GameConfig } from '@/config/game-config';
import { GameState } from '@/state/GameState';
import {
	increaseUserBalanceWithTokens,
	lowerUserBalanceWithLamports
} from '@/modules/userModule';
import { restorePlayerBalances } from '@/modules/backupModule';
import { toNumberSafe } from '@/utils/game-util';
import { getServiceClient } from '@/supabasedb';
import { TOKEN_CONFIG } from '@/constants';

export class GameRoom extends Room<GameState> {
	@type('number')
	roomSplTokenEntryFee: number;

	dispatcher = new Dispatcher(this);

	fixedTimeStep = 1000 / 60;

	async onAuth(_, options: any) {
		const decodedData = jwt.verify(options.jwt, process.env.JWT_SECRET);

		if (
			!isRequestAuthorized({
				publicKey: decodedData.publicKey,
				signature: decodedData.signature,
				nonce: decodedData.nonce
			})
		) {
			throw new ServerError(
				403,
				'Unauthorized to make this request. Signature invalid.'
			);
		}

		const { data: user } = await getServiceClient()
			.from('users')
			.select('*')
			.eq('publicKey', decodedData.publicKey)
			.single();

		if (!user) {
			throw new ServerError(
				403,
				'Unauthorized to make this request. User not found.'
			);
		}

		const entryLamports =
			this.roomSplTokenEntryFee * TOKEN_CONFIG.LAMPORTS_PER_TOKEN;

		if (toNumberSafe(user.depositedSplLamports) < entryLamports) {
			throw new ServerError(
				403,
				"Unauthorized to make this request. User doesn't have enough balance."
			);
		}

		if (this.isAlreadyInGameRoom(decodedData.publicKey)) {
			throw new ServerError(
				403,
				'Unauthorized to make this request. User is already in the room.'
			);
		}

		await lowerUserBalanceWithLamports(
			decodedData.publicKey,
			entryLamports
		);

		return user;
	}

	isAlreadyInGameRoom(publicKey: string) {
		let isFound = false;

		this.state.players.forEach((player) => {
			if (player.publicKey === publicKey) {
				isFound = true;
			}
		});

		return isFound;
	}

	onCreate(options) {
		this.maxClients = 100;

		this.setState(new GameState());
		this.roomSplTokenEntryFee = options.roomSplTokenEntryFee;

		this.onMessage('mouse', (client, message) => {
			const player = this.state.players[client.sessionId];

			if (!player) {
				return;
			}

			player.target.x = message.x;
			player.target.y = message.y;
		});

		this.onMessage('fire-food', (client) => {
			this.state.players[client.sessionId].fireFood(this.state.massFood);
		});

		this.onMessage('split', (client) => {
			this.state.players[client.sessionId].splitAllCells();
		});

		this.onMessage('rejoin', (client) => {
			this.onJoin(client, { publicKey: client.auth.publicKey });

			client.send('room-info', {
				roomSplTokenEntryFee: this.roomSplTokenEntryFee
			});
		});

		this.onMessage('ping', (client, message) => {
			client.send('pong', message);
		});

		this.onMessage('cash-out', (client) => {
			const player = this.state.players[client.sessionId];

			if (player?.isCashedOut || !player) {
				return;
			}

			// Don't allow to cashout before cooldown ends
			const currentTime = Date.now();
			const diff =
				currentTime - new Date(player.lastActionTick).getTime();
			const secondsDiff =
				GameConfig.cashoutCooldown - Math.floor((diff / 1000) % 60);

			if (secondsDiff <= 0) {
				increaseUserBalanceWithTokens({
					publicKey: client.auth.publicKey,
					amountToIncrease: player.splTokens
				}).then((data) => {
					this.state.players.delete(client.sessionId);

					console.log(data);

					client.send('cash-out-success', {
						amountWon: player.splTokens,
						newDepositedBalance: data.depositedSplLamports
					});
				});
			}
		});

		this.setSimulationInterval(() => {
			this.dispatcher.dispatch(new BalanceMassCommand());
			this.state.moveLoop();
			this.state.gameLoop();
		});

		updateLobby(this);
	}

	onJoin(client: Client, options) {
		this.dispatcher.dispatch(new OnJoinCommand(), {
			sessionId: client.sessionId,
			roomSplTokenEntryFee: this.roomSplTokenEntryFee,
			publicKey: options.publicKey,
			client
		});

		client.send('room-info', {
			roomSplTokenEntryFee: this.roomSplTokenEntryFee
		});
	}

	async onLeave(client: Client) {
		try {
			if (this.state.players[client.sessionId]) {
				await this.allowReconnection(client, 30);
			}
			client.send('room-info', {
				roomSplTokenEntryFee: this.roomSplTokenEntryFee
			});
		} catch (e) {
			increaseUserBalanceWithTokens({
				publicKey: client.auth.publicKey,
				amountToIncrease: this.roomSplTokenEntryFee
			});
			this.state.players.delete(client.sessionId);
		}
	}

	async onDispose() {
		await restorePlayerBalances(this.state.players);
	}
}
