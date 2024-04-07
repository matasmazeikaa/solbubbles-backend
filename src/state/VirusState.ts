import { Schema, type } from '@colyseus/schema';
import { generateId } from 'colyseus';
import { Target } from './TargetState';
import { Circle, NodeGeometry } from '@timohausmann/quadtree-ts';

export class VirusState extends Schema {
	@type('string')
	id: string;

	@type('number')
	x: number;

	@type('number')
	y: number;

	@type('number')
	h: number;

	@type('number')
	w: number;

	@type('number')
	radius: number;
	
	@type('number')
	mass: number;

	@type('number')
	fill: number;

	@type('number')
	stroke: number;

	@type('number')
	strokeWidth: number;

	@type('number')
	speed: number;

	@type(Target)
	target: Target = new Target();

	constructor() {
		super()

		this.id = generateId();
	}

	qtIndex(node: NodeGeometry) {
		return Circle.prototype.qtIndex.call({
			x: this.x,
			y: this.y,
			r: this.radius
		}, node)
	}
}
