import { TOKEN_CONFIG } from '@/constants';
import { massToRadius, round } from '@/utils/game-util';
import { Schema, type } from '@colyseus/schema';
import { generateId } from 'colyseus';
import { Target } from './TargetState';
import { Circle, NodeGeometry } from '@timohausmann/quadtree-ts';



export class CellState extends Schema {
	@type('string')
	id: string;

	@type('string')
	createdPlayerId: string;

	@type('number')
	mass: number;

	@type('number')
	baseMass: number;

	@type('number')
	x: number;

	@type('number')
	y: number;

	@type('number')
	w: number;

	@type('number')
	h: number;

	@type('number')
	radius: number;

	@type('number')
	speed: number;

	@type('number')
	splTokens: number;

	@type('string')
	type: string;

	@type(Target)
	target: Target = new Target();

	@type('number')
	targetMass: number;

	@type(Target)
	velocity: Target = new Target();

	@type('number')
	explodeSpeed: number;

	@type('number')
	createdTime: number;

	constructor() {
		super();

		this.id = generateId();
		this.createdTime = Date.now();
	}

	get uiCryptoAmount() {
		return round((this.splTokens / TOKEN_CONFIG.LAMPORTS_PER_TOKEN), 2);
	}

	increaseMass(amount: number) {
		this.mass += amount;
		this.radius = massToRadius(amount);
	}

	decreaseMass(amount: number) {
		this.mass -= amount;
	}

	increaseSplTokens(amount: number) {
		this.splTokens += amount;
	}

	qtIndex(node: NodeGeometry) {
		return Circle.prototype.qtIndex.call({
			x: this.x,
			y: this.y,
			r: this.radius
		}, node)
	}
}
