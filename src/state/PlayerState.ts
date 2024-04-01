import { Client, generateId } from 'colyseus';
import { Schema, type, ArraySchema } from '@colyseus/schema';
import { CellState } from './CellState';
import { massToRadius, log, splitNumberWithoutDecimals } from '@/utils/game-util';
import { GameConfig } from '@/config/game-config';
import { MassFoodState } from './MassFoodState';
import { Target } from './TargetState';

const initMassLog = log(GameConfig.defaultPlayerMass, GameConfig.slowBase);

// An abstract player object, demonstrating a potential 2D world position
export class Player extends Schema {
	@type('number')
	radius: number = massToRadius(GameConfig.startingPlayerMass);

	@type([CellState])
	cells = new ArraySchema<CellState>();

	@type('number')
	massTotal: number = GameConfig.startingPlayerMass;

	@type('string')
	id: string = null;

	@type('number')
	x: number = null;

	@type('number')
	y: number = null;

	@type('number')
	w: number = GameConfig.gameWidth;

	@type('number')
	h: number = GameConfig.gameHeight;

	@type('number')
	hue: number = Math.round(Math.random() * 360);

	@type('number')
	angle: number = 0;

	@type('string')
	type = null;

	@type('number')
	speed: number;

	@type('string')
	publicKey: string;

	@type('string')
	roomId: string = null;

	@type('number')
	lastActionTick: number = Date.now();

	@type(Target)
	target: Target = new Target();

	@type('boolean')
	isCashedOut: boolean = false;

	lastSplit: number;

	client: Client;

	immunityStart: number;

	constructor({ id, position, type, speed, splTokens, publicKey, client }) {
		super();

		this.immunityStart = Date.now();

		this.id = id;
		this.x = position.x;
		this.y = position.y;
		this.type = type;
		this.speed = speed;
		this.publicKey = publicKey;
		this.client = client;
		this.cells.push(
			new CellState().assign({
				createdPlayerId: this.id,
				mass: Number(GameConfig.startingPlayerMass),
				x: this.x,
				y: this.y,
				radius: this.radius,
				speed: this.speed,
				splTokens
			})
		);
	}

	get canSplit() {
		return (
			this.cells.length < GameConfig.limitSplit &&
			this.massTotal >= GameConfig.defaultPlayerMass * 2
		);
	}

	get hasImmunity() {
		return (Date.now() - this.immunityStart) < GameConfig.immunityTimer * 1000;
	}

	get cellCount() {
		return this.cells.length;
	}

	get splTokens() {
		return this.cells.reduce((acc, cell) => acc + cell.splTokens, 0);
	}

	splitCell(cell: CellState, speed = 25, cellPosition: { x: number, y: number } | null = null) {
		const [cellCryptoAmount1, cellCryptoAmount2] = splitNumberWithoutDecimals(Number(cell.splTokens))

		cell.mass = cell.mass / 2;
		cell.radius = massToRadius(cell.mass);
		cell.splTokens = cellCryptoAmount1;

		const newCell = new CellState().assign({
			createdPlayerId: this.id,
			mass: cell.mass,
			x: cellPosition?.x || cell.x,
			y: cellPosition?.y || cell.y,
			radius: cell.radius,
			speed,
			splTokens: cellCryptoAmount2
		});

		this.lastActionTick = Date.now();
		this.lastSplit = Date.now();
		this.cells.push(newCell);

		return newCell;
	}

	splitAllCells() {
		if (this.canSplit) {
			this.cells.forEach((c) => this.splitCell(c));
		}
	}

	virusSplitCell(cell: CellState) {
		const cellsToSplit = [cell];

		let shouldSplit = true;

		while (shouldSplit) {
			cellsToSplit.forEach((cell) => {
				const splitCell = this.splitCell(cell, 6.25);
			
				cellsToSplit.push(splitCell);
			});

			shouldSplit = cellsToSplit.every((cell) => cell.mass >= 24);
		}
	}

	resize({ screenWidth, screenHeight }) {
		this.w = screenWidth;
		this.h = screenHeight;
	}

	move() {
		var x = 0,
			y = 0;

		for (var i = 0; i < this.cells.length; i++) {
			var target = {
				x: this.x - this.cells[i].x + this.target.x,
				y: this.y - this.cells[i].y + this.target.y
			};
			var dist = Math.sqrt(Math.pow(target.y, 2) + Math.pow(target.x, 2));
			var deg = Math.atan2(target.y, target.x);
			var slowDown = 1;

			if (this.cells[i].speed <= 6.25) {
				slowDown =
					log(this.cells[i].mass, GameConfig.slowBase) -
					initMassLog +
					1;
			}

			var deltaY = (this.cells[i].speed * Math.sin(deg)) / slowDown;
			var deltaX = (this.cells[i].speed * Math.cos(deg)) / slowDown;

			if (this.cells[i].speed > 6.25) {
				this.cells[i].speed -= 0.5;
			}
			if (dist < 50 + this.cells[i].radius) {
				deltaY *= dist / (50 + this.cells[i].radius);
				deltaX *= dist / (50 + this.cells[i].radius);
			}
			if (!isNaN(deltaY)) {
				this.cells[i].y += deltaY;
			}

			if (!isNaN(deltaX)) {
				this.cells[i].x += deltaX;
			}
			// Find best solution.
			for (var j = 0; j < this.cells.length; j++) {
				if (j != i && this.cells[i] !== undefined) {
					var distance = Math.sqrt(
						Math.pow(this.cells[j].y - this.cells[i].y, 2) +
							Math.pow(this.cells[j].x - this.cells[i].x, 2)
					);
					var radiusTotal =
						this.cells[i].radius + this.cells[j].radius;
					if (distance < radiusTotal) {
						if (
							this.lastSplit >
							Date.now() - 1000 * GameConfig.mergeTimer
						) {
							if (this.cells[i].x < this.cells[j].x) {
								this.cells[i].x--;
							} else if (this.cells[i].x > this.cells[j].x) {
								this.cells[i].x++;
							}
							if (this.cells[i].y < this.cells[j].y) {
								this.cells[i].y--;
							} else if (this.cells[i].y > this.cells[j].y) {
								this.cells[i].y++;
							}
						} else if (distance < radiusTotal / 1.75) {
							this.cells[i].mass += this.cells[j].mass;
							this.cells[i].splTokens +=
								this.cells[j].splTokens;

							this.cells[i].radius = massToRadius(
								this.cells[i].mass
							);

							this.cells.splice(j, 1);
						}
					}
				}
			}

			if (this.cells.length > i) {
				var borderCalc = this.cells[i].radius / 3;
				if (this.cells[i].x > GameConfig.gameWidth - borderCalc) {
					this.cells[i].x = GameConfig.gameWidth - borderCalc;
				}
				if (this.cells[i].y > GameConfig.gameHeight - borderCalc) {
					this.cells[i].y = GameConfig.gameHeight - borderCalc;
				}
				if (this.cells[i].x < borderCalc) {
					this.cells[i].x = borderCalc;
				}
				if (this.cells[i].y < borderCalc) {
					this.cells[i].y = borderCalc;
				}
				x += this.cells[i].x;
				y += this.cells[i].y;
			}

		}
		this.x = x / this.cells.length;
		this.y = y / this.cells.length;
	}

	fireFood(massFood) {
		this.cells.forEach((c, i) => {
			if (
				(c.mass >= GameConfig.defaultPlayerMass + GameConfig.fireFood &&
					GameConfig.fireFood > 0) ||
				(c.mass >= 20 && Number(GameConfig.fireFood) === 0)
			) {
				const masa =
					GameConfig.fireFood > 0
						? GameConfig.fireFood
						: c.mass * 0.1;
				c.mass -= masa;
				this.massTotal -= masa;
				this.lastActionTick = Date.now();
				massFood.push(
					new MassFoodState().assign({
						id: generateId(),
						createdPlayerId: this.id,
						num: i,
						masa,
						hue: this.hue,
						target: new Target().assign({
							x: this.x - c.x + this.target.x,
							y: this.y - c.y + this.target.y
						}),
						x: c.x,
						y: c.y,
						radius: massToRadius(masa),
						speed: 25
					})
				);
			}
		});
	}

	// moveBot() {
	// 	if (this.x < 100 && this.target.directionX === 'left') {
	// 		this.target.x = BOT_GAMECONFIG.SPEED;
	// 		this.target.directionX = 'right';
	// 	} else if (
	// 		this.x > GameConfig.gameWidth - 100 &&
	// 		this.target.directionX === 'right'
	// 	) {
	// 		this.target.x = -BOT_GAMECONFIG.SPEED;
	// 		this.target.directionX = 'left';
	// 	} else {
	// 		if (this.target.directionX === 'left') {
	// 			this.target.x = -BOT_GAMECONFIG.SPEED;
	// 		} else {
	// 			this.target.x = BOT_GAMECONFIG.SPEED;
	// 		}
	// 	}

	// 	if (this.y < 100 && this.target.directionY === 'up') {
	// 		this.target.y = BOT_GAMECONFIG.SPEED;
	// 		this.target.directionY = 'down';
	// 	} else if (
	// 		this.y > GameConfig.gameHeight - 100 &&
	// 		this.target.directionY === 'down'
	// 	) {
	// 		this.target.y = -BOT_GAMECONFIG.SPEED;
	// 		this.target.directionY = 'up';
	// 	} else {
	// 		if (this.target.directionY === 'up') {
	// 			this.target.y = -BOT_GAMECONFIG.SPEED;
	// 		} else {
	// 			this.target.y = BOT_GAMECONFIG.SPEED;
	// 		}
	// 	}

	// 	this.move();
	// }
}
