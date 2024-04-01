import { TOKEN_CONFIG } from '@/constants';
import { round } from '@/utils/game-util';
import { Schema, type } from '@colyseus/schema';
import { generateId } from 'colyseus';



export class CellState extends Schema {
	@type('string')
	id: string;

	@type('string')
	createdPlayerId: string;

	@type('number')
	mass: number;

	@type('number')
	x: number;

	@type('number')
	y: number;

	@type('number')
	radius: number;

	@type('number')
	speed: number;

	@type('number')
	splTokens: number;

	constructor() {
		super();

		this.id = generateId();
	}

	get uiCryptoAmount() {
		return round((this.splTokens / TOKEN_CONFIG.LAMPORTS_PER_TOKEN), 2);
	}
}
