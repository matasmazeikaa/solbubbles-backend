import { Schema, type } from '@colyseus/schema';
import { Circle, NodeGeometry } from '@timohausmann/quadtree-ts';

export class FoodState extends Schema {
	@type('string')
	id: string;

	@type('number')
	x: number;

	@type('number')
	y: number;

	@type('number')
	radius: number;

	@type('number')
	mass: number;

	@type('number')
	hue: number;

	constructor(
		id: string,
		x: number,
		y: number,
		radius: number,
		mass: number,
		hue: number
	) {
		super();

		this.id = id;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.mass = mass;
		this.hue = hue;
	}

	qtIndex(node: NodeGeometry) {
		return Circle.prototype.qtIndex.call(
			{
				x: this.x,
				y: this.y,
				r: this.radius
			},
			node
		);
	}
}
