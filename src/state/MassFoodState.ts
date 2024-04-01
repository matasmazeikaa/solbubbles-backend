import { Schema, type } from '@colyseus/schema';
import { GameConfig } from '@/config/game-config';
import { Target } from './TargetState';

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
	radius: number;

	@type('number')
	speed: number;

	moveMass(mass) {
		const deg = Math.atan2(mass.target.y, mass.target.x);
		const deltaY = mass.speed * Math.sin(deg);
		const deltaX = mass.speed * Math.cos(deg);

		mass.speed -= 0.5;
		
		if (mass.speed < 0) {
			mass.speed = 0;
		}

		if (!isNaN(deltaY)) {
			mass.y += deltaY;
		}

		if (!isNaN(deltaX)) {
			mass.x += deltaX;
		}

		const borderCalc = mass.radius + 5;

		if (mass.x > GameConfig.gameWidth - borderCalc) {
			mass.x = GameConfig.gameWidth - borderCalc;
		}
		if (mass.y > GameConfig.gameHeight - borderCalc) {
			mass.y = GameConfig.gameHeight - borderCalc;
		}
		if (mass.x < borderCalc) {
			mass.x = borderCalc;
		}
		if (mass.y < borderCalc) {
			mass.y = borderCalc;
		}
	}
}
