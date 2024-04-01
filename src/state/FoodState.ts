import { Schema, type } from '@colyseus/schema';

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

	constructor (id, x, y, radius, mass, hue) {
		super()

		this.id = id;
		this.x = x;
		this.y = y;
		this.radius = radius;
		this.mass = mass;
		this.hue = hue;
	}
}
