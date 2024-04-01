import { Schema, type } from '@colyseus/schema';

export class PlayerOrderMassState extends Schema {
	@type('number')
	mass: number;

	@type('number')
	nCell: number;

	@type('number')
	nDiv: number;

	constructor (mass, nCell, nDiv) {
		super()

		this.mass = mass;
		this.nCell = nCell;
		this.nDiv = nDiv;
	}
}
