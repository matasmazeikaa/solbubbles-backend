import { Command } from '@colyseus/command';
import { GameConfig } from '@/config/game-config';
import { GameRoom } from '@/game/GameRoom';
import { FoodState } from '@/state/FoodState';
import { massToRadius, uniformPosition } from '@/utils/game-util';
import { generateId } from 'colyseus';

export class AddFoodCommand extends Command<
	GameRoom,
	{
		toAdd: number;
	}
> {
	execute({ toAdd }) {
		const radius = massToRadius(GameConfig.foodMass);

		for (let i = toAdd; i > 0; i--) {
			const position = uniformPosition(this.state.food, radius);

			this.state.food.push(
				new FoodState(
					generateId(),
					position.x,
					position.y,
					radius,
					Math.random() + 2,
					Math.round(Math.random() * 360)
				)
			);
		}
	}
}
