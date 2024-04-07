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
import { increaseUserTotalWinnings } from '@/modules/userStatisticsModule';

export class GameRoom extends Room<GameState> {
	@type('number')
	roomSplTokenEntryFee: number;

	dispatcher = new Dispatcher(this);

	fixedTimeStep = 1000 / 60;

	async onAuth(_: any, options: { jwt: string }) {
		try {
			return await this.handleUserRoomEnter(options.jwt);
		} catch (e: any) {
			throw new ServerError(e.statusCode, e.message);
		}
	}

	async handleUserRoomEnter(jwtToken: string) {
		const decodedData = jwt.verify(jwtToken, process.env.JWT_SECRET) as {
			publicKey: string;
			signature: string;
			nonce: number
		};

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

		return await lowerUserBalanceWithLamports(
			decodedData.publicKey,
			entryLamports
		);
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

	onCreate(options: {
		roomSplTokenEntryFee: number;
	}) {
		this.maxClients = 100;

		this.setState(new GameState());
		this.roomSplTokenEntryFee = options.roomSplTokenEntryFee;

		this.onMessage('mouse', (client, message) => {
			const player = this.state.players.get(client.sessionId);

			if (!player) {
				return;
			}

			player.target.x = message.x;
			player.target.y = message.y;
		});

		this.onMessage('fire-food', (client) => {
			this.state.players.get(client.sessionId).fireFood(this.state.massFood);
		});

		this.onMessage('split', (client) => {
			this.state.players.get(client.sessionId).splitAllCells();
		});

		this.onMessage('rejoin', async (client, { jwt }) => {
			try {
				await this.handleUserRoomEnter(jwt);
			} catch (e: any) {
				client.error(e.statusCode, e.message);
				client.send('error', { message: e.message });

				return;
			}

			this.onJoin(client, { publicKey: client.auth.publicKey });

			client.send('room-info', {
				roomSplTokenEntryFee: this.roomSplTokenEntryFee
			});
		});

		this.onMessage('ping', (client, message) => {
			client.send('pong', message);
		});

		this.onMessage('cash-out', async (client) => {
			const player = this.state.players.get(client.sessionId);

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
				try {
					const data = await increaseUserBalanceWithTokens({
						publicKey: client.auth.publicKey,
						amountToIncrease: player.splTokens
					})

					this.state.players.delete(client.sessionId);

					if (player.splTokens > this.roomSplTokenEntryFee) {
						increaseUserTotalWinnings({
							publicKey: client.auth.publicKey,
							tokensWon: player.splTokens - this.roomSplTokenEntryFee
						});
					}

					client.send('cash-out-success', {
						amountWon: player.splTokens,
						newDepositedBalance: data.depositedSplLamports
					});
				} catch {
					throw new ServerError(
						400,
						'Failed to cashout. Please try again later.'
					);
				}
			}
		});

		this.setSimulationInterval(() => {
			this.dispatcher.dispatch(new BalanceMassCommand());
			this.state.moveLoop();
			this.state.gameLoop();
		});

		updateLobby(this);
	}

	onJoin(client: Client, options: {
		publicKey: string;
	}) {
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
			if (this.state.players.get(client.sessionId)) {
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
