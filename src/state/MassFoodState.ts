import { Schema, type } from '@colyseus/schema';
import { Target } from './TargetState';
import { Circle, NodeGeometry } from '@timohausmann/quadtree-ts';

export class MassFoodState extends Schema {
	@type('string')
	id: string;

	@type('number')
	num: number;

	@type('string')
	createdPlayerId: string;

	@type('number')
	masa: number;

	@type('number')
	hue: number;

	@type(Target)
	target = new Target();

	@type('number')
	angle: number;

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
	createdAt: number;

	qtIndex(node: NodeGeometry) {
		return Circle.prototype.qtIndex.call({
			x: this.x,
			y: this.y,
			r: this.radius
		}, node)
	}
}
