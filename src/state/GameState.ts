import { Schema, MapSchema, type, ArraySchema } from '@colyseus/schema';
import { FoodState } from './FoodState';
import { TopPlayerState } from './LeaderboardState';
import { Player } from './PlayerState';
import { VirusState } from './VirusState';
import { isCircleOverlapping, massToRadius } from '@/utils/game-util';
import { GameConfig } from '@/config/game-config';
import { MassFoodState } from './MassFoodState';
import { Target } from './TargetState';
import { decreaseUserTotalWinnings, increaseUserKillCount } from '@/modules/userStatisticsModule';
import { CellState } from './CellState';
import { Circle, Quadtree } from '@timohausmann/quadtree-ts';
import { lowerUserBalanceWithTokens } from '@/modules/userModule';
import { TOKEN_CONFIG } from '@/constants';

export class GameState extends Schema {
	@type({ map: Player })
	players = new MapSchema<Player>();

	@type({ map: Player })
	bots = new MapSchema<Player>();

	@type({ map: FoodState })
	food = new MapSchema<FoodState>();

	@type({ map: MassFoodState })
	massFood = new MapSchema<MassFoodState>();

	@type({ map: VirusState })
	virus = new MapSchema<VirusState>();

	@type([TopPlayerState])
	leaderboard = new ArraySchema<TopPlayerState>();

	@type('number')
	roomSplTokenEntryFee: number;

	massFoodQuadTree = new Quadtree({
		x: 0,
		y: 0,
		width: Number(GameConfig.gameWidth),
		height: Number(GameConfig.gameHeight)
	});

	virusQuadTree = new Quadtree({
		x: 0,
		y: 0,
		width: Number(GameConfig.gameWidth),
		height: Number(GameConfig.gameHeight)
	});

	foodQuadTree = new Quadtree({
		x: 0,
		y: 0,
		width: Number(GameConfig.gameWidth),
		height: Number(GameConfig.gameHeight)
	});

	cellQuadTree = new Quadtree({
		x: 0,
		y: 0,
		width: Number(GameConfig.gameWidth),
		height: Number(GameConfig.gameHeight)
	});

	deleteFood(food: FoodState) {
		this.food.delete(food.id);
	}

	get foodLength() {
		return this.food.entries.length;
	}

	get playerCells() {
		return Array.from(this.players.values()).map((player) => player.cells);
	}

	async confirmPlayerDeath(player: Player) {
		const user = await lowerUserBalanceWithTokens({
			publicKey: player.publicKey,
			amountToLower: this.roomSplTokenEntryFee
		});

		decreaseUserTotalWinnings({
			publicKey: player.publicKey,
			tokensLost: this.roomSplTokenEntryFee
		})
		
		player.client?.send('death-confirm', {
			amountLost: this.roomSplTokenEntryFee,
			newBalance: Number(user.depositedSplLamports) / TOKEN_CONFIG.LAMPORTS_PER_TOKEN
		});
	}

	async collideCells(
		aCell: CellState,
		bCell: Circle<CellState>,
		player: Player
	) {
		const bPlayer = this.players.get(bCell.data.createdPlayerId);

		if (!bPlayer) {
			return;
		}

		if (bPlayer.cells.size > 1) {
			bPlayer.removeCell(bCell);
		} else {
			bPlayer.removeCell(bCell);
			this.players.delete(bCell.data.createdPlayerId);

			if (bPlayer.type === 'player') {
				bPlayer.client?.send('death-initiate');

				this.confirmPlayerDeath(bPlayer);
			}

			if (player.type === 'player') {
				increaseUserKillCount({
					publicKey: player.publicKey,
					kills: 1
				});
			}
		}

		player.absorbCell(aCell, bCell.data);
		this.cellQuadTree.remove(bCell);
	}

	checkCollision(
		cell: CellState,
		collidingCell: Circle<CellState>,
		player: Player
	) {
		const isCollided = isCircleOverlapping(
			{ x: cell.x, y: cell.y, r: cell.radius },
			{ x: collidingCell.x, y: collidingCell.y, r: collidingCell.r }
		);

		if (!isCollided) return;

		const isOverlapping =
			cell.radius >
			Math.sqrt(
				(cell.x - collidingCell.data.x) ** 2 +
					(cell.y - collidingCell.data.y) ** 2
			) *
				1.2;

		const isMassBigger = cell.mass > collidingCell.data.mass * 1.1;

		if (isOverlapping && isMassBigger) {
			this.collideCells(cell, collidingCell, player);
		}
	}

	tickMassFoodCollision(mass: MassFoodState) {
		const nearbyViruses = this.virusQuadTree.retrieve(
			mass
		) as Circle<VirusState>[];

		for (let i = 0; i < nearbyViruses.length; i++) {
			const virus = nearbyViruses[i];

			// if (this.virusEatMassFood(mass, virus.data)) {
			const isCollided = isCircleOverlapping(
				{ x: mass.x, y: mass.y, r: mass.radius },
				{ x: virus.x, y: virus.y, r: virus.r },
				-mass.radius
			);

			if (isCollided) {
				const colidedVirus = this.virus.get(virus.data.id);

				// Move virus to the direction of the shooted mass food
				const x = mass.x - colidedVirus.x + mass.target.x;
				const y = mass.y - colidedVirus.y + mass.target.y;

				colidedVirus.target = new Target().assign({
					x,
					y
				});

				// setting the speed of the virus for movement
				colidedVirus.speed = 25;

				// removing the mass food from the game as it has been eaten by the virus
				this.massFood.delete(mass.id);
				this.massFoodQuadTree.remove(mass);
			}
		}
	}

	handleFoodMagnet(cell: CellState, player: Player) {
		let food: Circle<CellState>;

		const neardbyFoods = this.foodQuadTree.retrieve(
			cell
		) as Circle<CellState>[];

		for (let i = 0; i < neardbyFoods.length; i++) {
			food = neardbyFoods[i];
			const foodEaten = this.food.get(food.data.id);

			const isNearby = isCircleOverlapping(
				{ x: cell.x, y: cell.y, r: cell.radius },
				{ x: food.data.x, y: food.data.y, r: food.data.radius },
				-food.r
			);

			if (isNearby && foodEaten.speed === 0) {
				foodEaten.speed = 10;
				foodEaten.target = new Target().assign({
					x: cell.x - foodEaten.x,
					y: cell.y - foodEaten.y
				});

				foodEaten.eatenTimer = Date.now();
			}

			const canEat = Date.now() - 1000 * 0.1 > foodEaten.eatenTimer;

			if (canEat) {
				this.food.delete(food.data.id);
				this.foodQuadTree.remove(food);
				cell.mass += GameConfig.foodMass;
				cell.radius = massToRadius(cell.mass);
				player.massTotal += GameConfig.foodMass;
			}
		}
	}

	handleEatFood(cell: CellState, player: Player) {
		let foodEatenCount = 0;
		let food: Circle<CellState>;

		const neardbyFoods = this.foodQuadTree.retrieve(
			cell
		) as Circle<CellState>[];

		for (let i = 0; i < neardbyFoods.length; i++) {
			food = neardbyFoods[i];

			const isOverlapping = isCircleOverlapping(
				{ x: cell.x, y: cell.y, r: cell.radius },
				{ x: food.data.x, y: food.data.y, r: food.data.radius },
				-food.r * 2
			);

			if (isOverlapping) {
				this.food.delete(food.data.id);
				this.foodQuadTree.remove(food);
				foodEatenCount++;
			}
		}

		const newMass = foodEatenCount * GameConfig.foodMass;

		if (newMass === 0) return;

		cell.mass += newMass;
		cell.radius = massToRadius(cell.mass);
		player.massTotal += newMass;
	}

	handleEatMassFood(cell: CellState, player: Player) {
		let massEatenCount = 0;

		const nearbyMassFood = this.massFoodQuadTree.retrieve(
			cell
		) as Circle<MassFoodState>[];

		for (let i = 0; i < nearbyMassFood.length; i++) {
			const mass = nearbyMassFood[i];

			const isColliding = isCircleOverlapping(
				{ x: cell.x, y: cell.y, r: cell.radius },
				{ x: mass.x, y: mass.y, r: mass.r },
				-mass.r
			);

			const isTimePassed = Date.now() - 1000 > mass.data.createdAt;
			const isSameCreator =
				mass.data.createdPlayerId === cell.createdPlayerId;

			if ((isTimePassed || !isSameCreator) && isColliding) {
				this.massFood.delete(mass.data.id);
				this.massFoodQuadTree.remove(mass);
				massEatenCount += mass.data.masa;
			}
		}

		cell.mass += massEatenCount;
		cell.radius = massToRadius(cell.mass);
		player.massTotal += massEatenCount;
	}

	handleVirusCollision(cell: CellState, player: Player) {
		const nearbyViruses = this.virusQuadTree.retrieve(
			cell
		) as Circle<VirusState>[];

		for (let i = 0; i < nearbyViruses.length; i++) {
			const nearbyVirus = nearbyViruses[i];

			const isOverlapping = isCircleOverlapping(
				{ x: cell.x, y: cell.y, r: cell.radius },
				{
					x: nearbyVirus.x,
					y: nearbyVirus.y,
					r: nearbyVirus.r
				},
				-nearbyVirus.r
			);

			if (isOverlapping) {
				if (cell.mass > nearbyVirus.data.mass) {
					player.virusSplitCell(cell);

					this.virus.delete(nearbyVirus.data.id);
					this.virusQuadTree.remove(nearbyVirus);
				}
			}
		}
	}

	handleCellCollision(cell: CellState, player: Player) {
		const nearbyCells = this.cellQuadTree.retrieve(
			cell
		) as Circle<CellState>[];

		for (let i = 0; i < nearbyCells.length; i++) {
			const nearbyCell = nearbyCells[i];
			const nearbyPlayerState = this.players.get(
				nearbyCell.data.createdPlayerId
			);
			const nearbyPlayerCell = nearbyPlayerState.cells.get(
				nearbyCell.data.id
			);

			if (!nearbyPlayerState || !nearbyPlayerCell) {
				continue;
			}

			const isOwnCell =
				cell.createdPlayerId === nearbyCell.data.createdPlayerId;
			const isSameCell = cell.id === nearbyCell.data.id;

			if (isSameCell) {
				continue;
			}

			if (isOwnCell) {
				this.findBestOwnCellsPosition(cell, nearbyPlayerCell, player);
			} else {
				this.checkCollision(cell, nearbyCell, player);
			}
		}
	}

	findBestOwnCellsPosition(
		cell: CellState,
		nearbyCell: CellState,
		player: Player
	) {
		const dx = nearbyCell.x - cell.x;
		const dy = nearbyCell.y - cell.y;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const minDist = cell.radius + nearbyCell.radius;

		const isMergeTimePassed =
			Date.now() - 1000 * GameConfig.mergeTimer > player.lastSplit;

		const radiusTotal = cell.radius + nearbyCell.radius;

		if (distance < minDist && !isMergeTimePassed) {
			// Calculate the angle of the collision
			const angle = Math.atan2(dy, dx);

			// Calculate the overlap between the cells
			const overlap = minDist - distance;

			if (Date.now() - player.lastSplit > 200) {
				cell.x -= overlap * Math.cos(angle);
				cell.y -= overlap * Math.sin(angle);
			}
		} else if (
			distance < radiusTotal / 1.75 &&
			cell.mass > nearbyCell.mass
		) {
			const oldMass = cell.mass;

			cell.mass += nearbyCell.mass;
			cell.radius = massToRadius(cell.mass);

			cell.x =
				(cell.x * oldMass + nearbyCell.x * nearbyCell.mass) / cell.mass;
			cell.y =
				(cell.y * oldMass + nearbyCell.y * nearbyCell.mass) / cell.mass;

			cell.splTokens += nearbyCell.splTokens;
			player.cells.delete(nearbyCell.id);
			this.cellQuadTree.remove(nearbyCell);
		}
	}

	tickPlayer(player: Player) {
		let x = 0;
		let y = 0;

		// if (player.type === 'bot') {
		// 	return;
		// }

		// player.cells.

		player.cells.forEach((cell) => {
			player.move(cell);

			x += cell.x;
			y += cell.y;

			this.handleFoodMagnet(cell, player);
			this.handleEatMassFood(cell, player);
			this.handleVirusCollision(cell, player);
			this.handleCellCollision(cell, player);
		});

		player.x = x / player.cells.size;
		player.y = y / player.cells.size;
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

	tickEntity(entity: MassFoodState | VirusState | FoodState) {
		if (entity.speed === 0) {
			return;
		}

		const deg = Math.atan2(entity.target.y, entity.target.x);
		const deltaY = entity.speed * Math.sin(deg);
		const deltaX = entity.speed * Math.cos(deg);

		entity.speed -= 0.5;

		if (entity.speed < 0) {
			entity.speed = 0;
		}

		if (!isNaN(deltaY)) {
			entity.y += deltaY;
		}

		if (!isNaN(deltaX)) {
			entity.x += deltaX;
		}

		const borderCalc = entity.radius + 5;

		if (entity.x > GameConfig.gameWidth - borderCalc) {
			entity.x = GameConfig.gameWidth - borderCalc;
		}
		if (entity.y > GameConfig.gameHeight - borderCalc) {
			entity.y = GameConfig.gameHeight - borderCalc;
		}
		if (entity.x < borderCalc) {
			entity.x = borderCalc;
		}
		if (entity.y < borderCalc) {
			entity.y = borderCalc;
		}
	}

	tickMass(mass: MassFoodState) {
		this.tickEntity(mass);

		this.tickMassFoodCollision(mass);
	}

	tickVirus(mass: VirusState) {
		this.tickEntity(mass);
	}

	moveLoop() {
		// const performanceStart = performance.now();

		this.cellQuadTree.clear();
		this.playerCells.forEach((cells) => {
			cells.forEach((cell) => {
				const treeCircle = new Circle({
					x: cell.x,
					y: cell.y,
					r: cell.radius,
					data: cell
				});

				this.cellQuadTree.insert(treeCircle);
			});
		});

		this.virusQuadTree.clear();
		this.virus.forEach((virus) => {
			const treeCircle = new Circle({
				x: virus.x,
				y: virus.y,
				r: virus.radius,
				data: virus
			});

			this.virusQuadTree.insert(treeCircle);
		});

		this.massFoodQuadTree.clear();
		this.massFood.forEach((mass) => {
			const treeCircle = new Circle({
				x: mass.x,
				y: mass.y,
				r: mass.radius,
				data: mass
			});

			this.massFoodQuadTree.insert(treeCircle);
		});

		this.foodQuadTree.clear();
		this.food.forEach((food) => {
			const treeCircle = new Circle({
				x: food.x,
				y: food.y,
				r: food.radius,
				data: food
			});

			this.foodQuadTree.insert(treeCircle);
		});

		this.players.forEach((player) => {
			this.tickPlayer(player);
		});

		this.massFood.forEach((mass) => {
			this.tickMass(mass);
		});

		this.virus.forEach((virus) => this.tickVirus(virus));

		this.food.forEach((food) => {
			this.tickEntity(food);
		});
	}
}
