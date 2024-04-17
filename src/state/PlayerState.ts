import { Client, generateId } from 'colyseus';
import { Schema, type, MapSchema } from '@colyseus/schema';
import { CellState } from './CellState';
import {
	massToRadius,
	log,
	splitNumberWithoutDecimals
} from '@/utils/game-util';
import { BotConfig, GameConfig } from '@/config/game-config';
import { MassFoodState } from './MassFoodState';
import { Target } from './TargetState';
import { Circle } from '@timohausmann/quadtree-ts';

const initMassLog = log(GameConfig.defaultPlayerMass, GameConfig.slowBase);

// An abstract player object, demonstrating a potential 2D world position
export class Player extends Schema {
	@type('number')
	radius: number = massToRadius(GameConfig.startingPlayerMass);

	@type({ map: CellState })
	cells = new MapSchema<CellState>();

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
	type: 'player' | 'bot' = 'player';

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

	@type('number')
	lastSplit: number;

	client?: Client;

	@type('number')
	immunityStart: number;

	@type('boolean')
	justSplit: boolean = false;

	@type('number')
	cellSplitTimer: number = 0;

	constructor({ id, position, type, speed, splTokens, publicKey, client }: {
		id: string;
		position: { x: number; y: number };
		type: 'player' | 'bot';
		speed: number;
		splTokens: number;
		publicKey: string;
		client: Client;
	}) {
		super();

		this.immunityStart = Date.now();

		this.id = id;
		this.x = position.x;
		this.y = position.y;
		this.type = type;
		this.speed = speed;
		this.publicKey = publicKey;
		this.client = client;

		const cell = new CellState().assign({
			createdPlayerId: this.id,
			mass: Number(GameConfig.startingPlayerMass),
			x: this.x,
			y: this.y,
						w: this.radius * 2,
			h: this.radius * 2,
			type: this.type,
			radius: this.radius,
			speed: this.speed,
			splTokens
		});

		this.cells.set(cell.id, cell);
	}

	get canSplit() {
		return (
			this.cells.size < GameConfig.limitSplit &&
			this.massTotal >= GameConfig.defaultPlayerMass * 2
		);
	}

	get hasImmunity() {
		return false;
		// return (Date.now() - this.immunityStart) < GameConfig.immunityTimer * 1000;
	}

	get cellCount() {
		return this.cells.size;
	}

	get splTokens() {
		let total = 0;

		this.cells.forEach((cell) => {
			total += cell.splTokens;
		});

		return total;
	}

	updateLastTick() {
		this.lastActionTick = Date.now();
	}

	absorbCell(aCell: CellState, bCell: CellState) {
		this.massTotal += bCell.mass;

		aCell.increaseMass(bCell.mass);
		aCell.increaseSplTokens(bCell.splTokens);

		this.updateLastTick();
	}

	removeCell(cell: Circle<CellState>) {
		this.decreaseMassFromCell(cell.data);

		this.cells.delete(cell.data.id);
	}

	increaseMassFromCell(cell: CellState) {
		this.massTotal += cell.mass;

		cell.increaseMass(cell.mass);
	}

	decreaseMassFromCell(cell: CellState) {
		this.massTotal -= cell.mass;
	}

	splitCell(cell: CellState, speed = 30) {
		const [cellCryptoAmount1, cellCryptoAmount2] =
			splitNumberWithoutDecimals(Number(cell.splTokens));

		cell.mass = cell.mass / 2;
		cell.radius = massToRadius(cell.mass);
		cell.splTokens = cellCryptoAmount1;

		const newCell = new CellState().assign({
			createdPlayerId: this.id,
			mass: cell.mass,
			x: cell.x,
			y: cell.y,
						w: cell.radius * 2,
			h: cell.radius * 2,
			radius: cell.radius,
			type: this.type,
			speed,
			splTokens: cellCryptoAmount2
		});

		this.lastActionTick = Date.now();
		this.lastSplit = Date.now();

		return newCell;
	}

	splitAllCells() {
		let splitCells: CellState[] = [];

		if (this.canSplit) {
			this.cells.forEach((cell) => {
				splitCells.push(this.splitCell(cell));
			});
		}

		splitCells.forEach((cell) => {
			this.cells.set(cell.id, cell);
		});

		this.cellSplitTimer = Date.now();
	}

	virusSplitCell(cell: CellState) {
		const cellsToSplit = [cell];

		let shouldSplit = true;

		let timesSplit = 0;

		while (shouldSplit) {
			cellsToSplit.forEach((cell, index) => {
				const angle =
					(2 * Math.PI * index) / cellsToSplit.length +
					(Math.random() - 0.5) * 0.2;
				const speed = 25 + Math.random() * 10;

				const splitCell = this.splitCell(cell, speed);

				splitCell.velocity = new Target().assign({
					x: Math.cos(angle) * 60,
					y: Math.sin(angle) * 60
				});

				cellsToSplit.push(splitCell);
				timesSplit++;
			});

			shouldSplit =
				cellsToSplit.every((cell) => cell.mass >= 24) &&
				timesSplit < GameConfig.limitSplit;
		}

		cellsToSplit.forEach((cell) => {
			this.cells.set(cell.id, cell);
		});

		this.cellSplitTimer = Date.now();
	}

	resize({ screenWidth, screenHeight }: {
		screenWidth: number;
		screenHeight: number;
	}) {
		this.w = screenWidth;
		this.h = screenHeight;
	}

	move(cell: CellState) {
		
		if (cell.type === 'bot') {
			return;
			this.moveBot();
		}

		const target = {
			x: this.x - cell.x + this.target.x,
			y: this.y - cell.y + this.target.y
		};
		const dist = Math.sqrt(target.y * target.y + target.x * target.x);
		const deg = Math.atan2(target.y, target.x);

		// Handle cell velocity
		if (cell.velocity?.x) {
			cell.x += cell.velocity.x;
			cell.y += cell.velocity.y;
			cell.velocity.x *= 0.94;
			cell.velocity.y *= 0.94;
			if (Math.abs(cell.velocity.x) < 0.01) cell.velocity.x = 0;
			if (Math.abs(cell.velocity.y) < 0.01) cell.velocity.y = 0;
		}

		// Use pre-calculated target direction and distance
		let slowDown = 1;
		if (cell.speed <= 6.25) {
			slowDown = log(cell.mass, GameConfig.slowBase) - initMassLog + 1;
		}
		let deltaY = (cell.speed * Math.sin(deg)) / slowDown;
		let deltaX = (cell.speed * Math.cos(deg)) / slowDown;
		if (cell.speed > 6.25) {
			cell.speed -= 0.5;
		}
		if (dist < 50 + cell.radius) {
			deltaY *= dist / (50 + cell.radius);
			deltaX *= dist / (50 + cell.radius);
		}
		if (!isNaN(deltaY)) {
			cell.y += deltaY;
		}
		if (!isNaN(deltaX)) {
			cell.x += deltaX;
		}

		// Simplify boundary checks
		const borderCalc = cell.radius / 3;
		cell.x = Math.max(
			borderCalc,
			Math.min(GameConfig.gameWidth - borderCalc, cell.x)
		);
		cell.y = Math.max(
			borderCalc,
			Math.min(GameConfig.gameHeight - borderCalc, cell.y)
		);
	}

	fireFood(massFood: MapSchema<MassFoodState>) {
		this.cells.forEach((cell) => {
			if (
				(cell.mass >=
					GameConfig.defaultPlayerMass + GameConfig.fireFood &&
					GameConfig.fireFood > 0) ||
				(cell.mass >= 20 && Number(GameConfig.fireFood) === 0)
			) {
				const masa =
					GameConfig.fireFood > 0
						? GameConfig.fireFood
						: cell.mass * 0.1;

				cell.mass -= masa;
				cell.radius = massToRadius(cell.mass);
				this.massTotal -= masa;
				this.lastActionTick = Date.now();
				
				const deg = Math.atan2(this.target.y, this.target.x);
				const deltaY = cell.radius * Math.sin(deg);
				const deltaX = cell.radius * Math.cos(deg);
		

				const massRadius = massToRadius(masa);
				const mass = new MassFoodState().assign({
					id: generateId(),
					createdPlayerId: this.id,
					masa,
					hue: this.hue,
					target: new Target().assign({
						x: this.x - cell.x + this.target.x,
						y: this.y - cell.y + this.target.y
					}),
					x: cell.x + deltaX,
					y: cell.y + deltaY,
					h: massRadius * 2,
					w: massRadius * 2,
					radius: massRadius,
					speed: 25,
					createdAt: Date.now()
				});

				massFood.set(mass.id, mass);
			}
		});
	}

	moveBot() {
		if (this.x < 100 && this.target.directionX === 'left') {
			this.target.x = BotConfig.SPEED;
			this.target.directionX = 'right';
		} else if (
			this.x > GameConfig.gameWidth - 100 &&
			this.target.directionX === 'right'
		) {
			this.target.x = -BotConfig.SPEED;
			this.target.directionX = 'left';
		} else {
			if (this.target.directionX === 'left') {
				this.target.x = -BotConfig.SPEED;
			} else {
				this.target.x = BotConfig.SPEED;
			}
		}

		if (this.y < 100 && this.target.directionY === 'up') {
			this.target.y = BotConfig.SPEED;
			this.target.directionY = 'down';
		} else if (
			this.y > GameConfig.gameHeight - 100 &&
			this.target.directionY === 'down'
		) {
			this.target.y = -BotConfig.SPEED;
			this.target.directionY = 'up';
		} else {
			if (this.target.directionY === 'up') {
				this.target.y = -BotConfig.SPEED;
			} else {
				this.target.y = BotConfig.SPEED;
			}
		}
	}
}
