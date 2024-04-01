import { Schema, MapSchema, type, ArraySchema } from '@colyseus/schema';
import { FoodState } from './FoodState';
import { TopPlayerState } from './LeaderboardState';
import { Player } from './PlayerState';
import { VirusState } from './VirusState';
import { massToRadius } from '@/utils/game-util';
import { BotConfig, GameConfig } from '@/config/game-config';
import { PlayerOrderMassState } from './PlayerOrderMassState';
import SAT from 'sat';
import SimpleQuadTree from 'simple-quadtree';
import { MassFoodState } from './MassFoodState';
import { Target } from './TargetState';

const V = SAT.Vector;
const C = SAT.Circle;

const sqt = SimpleQuadTree(0, 0, GameConfig.gameWidth, GameConfig.gameHeight);

export class GameState extends Schema {
	@type({ map: Player })
	players = new MapSchema<Player>();

	@type([FoodState])
	food = new ArraySchema<FoodState>();

	@type([VirusState])
	virus = new ArraySchema<VirusState>();

	@type([PlayerOrderMassState])
	playerOrderMass = new ArraySchema<PlayerOrderMassState>();

	@type([MassFoodState])
	massFood = new ArraySchema<MassFoodState>();

	@type([TopPlayerState])
	leaderboard = new ArraySchema<TopPlayerState>();

	playerCollisions = [];

	deleteFood(f) {
		this.food.splice(f, 1);
	}

	collisionCheck(collision, player) {
		const collisionUserBId = collision.bUser.createdPlayerId;

		const isUserFound = !!this.players[collisionUserBId].cells.find(
			(cell) => cell.id === collision.bUser.id
		);

		if (isUserFound) {
			if (collision.bUser.type === 'bot') {
				// if (this.bots[collisionUserBId].cells.length > 1) {
				// 	this.bots[collisionUserBId].massTotal -=
				// 		collision.bUser.mass;
				// 	this.bots[collisionUserBId].cells.splice(
				// 		collision.bUser.num,
				// 		1
				// 	);
				// } else {
				// 	this.bots.splice(collisionUserBId, 1);
				// }
			} else {
				if (this.players[collisionUserBId].cells.length > 1) {
					this.players[collisionUserBId].massTotal -=
						collision.bUser.mass;
					this.players[collisionUserBId].cells.splice(
						collision.bUser.num,
						1
					);
				} else {
					this.players[collisionUserBId].client.send(
						'death',
						this.players[collisionUserBId]
					);
					this.players.delete(collisionUserBId);
				}
			}

			player.massTotal += collision.bUser.mass;
			player.lastActionTick = Date.now();

			collision.aUser.mass += collision.bUser.mass;
			collision.aUser.splTokens += collision.bUser.splTokens;
		}
	}

	check(user, playerCircle, currentCell, playerId) {
		for (var i = 0; i < user.cells.length; i++) {
			if (!user.hasImmunity && user.id !== playerId) {
				var response = new SAT.Response();
				var collided = SAT.testCircleCircle(
					playerCircle,
					new C(
						new V(user.cells[i].x, user.cells[i].y),
						user.cells[i].radius
					),
					response
				);

				if (collided) {
					response.aUser = currentCell;
					response.bUser = {
						id: user.cells[i].id,
						createdPlayerId: user.id,
						type: user.type,
						x: user.cells[i].x,
						y: user.cells[i].y,
						num: i,
						mass: user.cells[i].mass,
						splTokens: user.cells[i].splTokens
					};

					if (
						response.aUser.mass > response.bUser.mass * 1.1 &&
						response.aUser.radius >
							Math.sqrt(
								(response.aUser.x - response.bUser.x) ** 2 +
									(response.aUser.y - response.bUser.y) ** 2
							) *
								1.75
					) {
						this.collisionCheck(response, user);
					}
				}
			}
		}
		return true;
	}

	funcFood(food, playerCircle) {
		return SAT.pointInCircle(new V(food.x, food.y), playerCircle);
	}

	virusEatMassFood(mass, virusCircle) {
		return SAT.pointInCircle(new V(mass.x, mass.y), virusCircle);
	}

	eatMass(mass, player, playerCircle, currentCell) {
		if (SAT.pointInCircle(new V(mass.x, mass.y), playerCircle)) {
			if (mass.createdPlayerId === player.id && mass.speed > 0) {
				return false;
			}

			if (currentCell.mass > mass.masa * 1.1) {
				return true;
			}
		}

		return false;
	}

	tickMassFoodCollision() {
		for (let i = 0; i < this.massFood.length; i++) {
			const currentMassFood = this.massFood[i];

			const massCircle = new C(
				new V(currentMassFood.x, currentMassFood.y),
				currentMassFood.radius
			);

			const virusCollision = this.virus
				.map((mass) => this.virusEatMassFood(mass, massCircle))
				.reduce((a, b, c) => (b ? a.concat(c) : a), []);

			for (let m = 0; m < virusCollision.length; m++) {
				const colidedVirus = this.virus[virusCollision[m]];

				// Move virus to the direction of the shooted mass food
				const x = currentMassFood.x - colidedVirus.x + currentMassFood.target.x;
				const y = currentMassFood.y - colidedVirus.y + currentMassFood.target.y;
				colidedVirus.target = new Target().assign({
					x,
					y
				})
				// setting the speed of the virus for movement
				colidedVirus.speed = 25;

				// removing the mass food from the game as it has been eaten by the virus
				this.massFood.splice(i, 1);
			}
		}
	}

	tickPlayer(player: Player) {
		player.move();

		// Check mass food colision

		this.tickMassFoodCollision();

		for (
			let playerCellIndex = 0;
			playerCellIndex < player.cells.length;
			playerCellIndex++
		) {
			const currentCell = player.cells[playerCellIndex];

			const playerCircle = new C(
				new V(currentCell.x, currentCell.y),
				currentCell.radius
			);

			const foodEaten = this.food
				.map((food) => this.funcFood(food, playerCircle))
				.reduce((a, b, c) => (b ? a.concat(c) : a), []);

			foodEaten.forEach((food) => this.deleteFood(food));

			const massEaten = this.massFood
				.map((mass) =>
					this.eatMass(mass, player, playerCircle, currentCell)
				)
				.reduce((a, b, c) => (b ? a.concat(c) : a), []);

			const [virusCollision] = this.virus
				.map((food) => this.funcFood(food, playerCircle))
				.reduce((a, b, c) => (b ? a.concat(c) : a), []);

			if (
				virusCollision > 0 &&
				currentCell.mass > this.virus[virusCollision].mass
			) {
				if (BotConfig.ACTIVE) {
					return;
				}

				this.players[player.id].virusSplitCell(currentCell);

				this.virus.splice(virusCollision, 1);
			}

			let masaGanada = 0;

			for (let m = 0; m < massEaten.length; m++) {
				masaGanada += this.massFood[massEaten[m]].masa;

				this.massFood.splice(massEaten[m], 1);

				for (let n = 0; n < massEaten.length; n++) {
					if (massEaten[m] < massEaten[n]) {
						massEaten[n]--;
					}
				}
			}

			if (typeof currentCell.speed === 'undefined') {
				currentCell.speed = 6.25;
			}

			masaGanada += foodEaten.length * GameConfig.foodMass;

			if (masaGanada > 0) {
				currentCell.mass += masaGanada;
				player.massTotal += masaGanada;
			}

			currentCell.radius = massToRadius(currentCell.mass);
			playerCircle.r = currentCell.radius;

			sqt.clear();

			this.players.forEach(sqt.put);

			sqt.get(player, (user) =>
				this.check(user, playerCircle, currentCell, player.id)
			);
		}
	}

	gameLoop() {
		if (this.players.size > 0) {
			const playerArray = Array.from(this.players.values()).sort(
				(a, b) => b.massTotal - a.massTotal
			);
			const topPlayers = [] as ArraySchema<TopPlayerState>;

			for (let i = 0; i < Math.min(10, playerArray.length); i++) {
				topPlayers.push(
					new TopPlayerState().assign({
						id: playerArray[i].id,
						publicKey: playerArray[i].publicKey,
						massTotal: Math.round(playerArray[i].massTotal),
						splTokens: playerArray[i].splTokens
					})
				);
			}

			this.leaderboard = topPlayers;

			// this.players.forEach((u) => {
			// 	u.cells.forEach((c) => {
			// 		if (
			// 			c.mass * (1 - GameConfig.massLossRate / 1000) >
			// 				GameConfig.defaultPlayerMass &&
			// 			u.massTotal > GameConfig.minMassLoss
			// 		) {
			// 			const massLoss =
			// 				c.mass * (1 - GameConfig.massLossRate / 1000);
			// 			u.massTotal -= c.mass - massLoss;
			// 			c.mass = massLoss;
			// 		}
			// 	});
			// });
		}
	}

	moveMass(mass) {
		const deg = Math.atan2(mass.target.y, mass.target.x);
		const deltaY = mass.speed * Math.sin(deg);
		const deltaX = mass.speed * Math.cos(deg);

		mass.speed -= 0.5;

		if (mass.speed < 0) {
			mass.speed = 0;
		}

		if (!isNaN(deltaY)) {
			mass.y += deltaY;
		}

		if (!isNaN(deltaX)) {
			mass.x += deltaX;
		}

		const borderCalc = mass.radius + 5;

		if (mass.x > GameConfig.gameWidth - borderCalc) {
			mass.x = GameConfig.gameWidth - borderCalc;
		}
		if (mass.y > GameConfig.gameHeight - borderCalc) {
			mass.y = GameConfig.gameHeight - borderCalc;
		}
		if (mass.x < borderCalc) {
			mass.x = borderCalc;
		}
		if (mass.y < borderCalc) {
			mass.y = borderCalc;
		}
	}

	moveLoop() {
		this.players.forEach((player) => {
			this.tickPlayer(player);
		});

		this.massFood
			.filter((mass) => mass.speed > 0)
			.forEach((mass) => {
				this.moveMass(mass);
			});

		this.virus
			.filter((virus) => virus.speed > 0)
			.forEach((virus) => this.moveMass(virus));
	}
}
