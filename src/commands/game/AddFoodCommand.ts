import { Command } from '@colyseus/command';
import { GameConfig } from '@/config/game-config';
import { GameRoom } from '@/game/GameRoom';
import { FoodState } from '@/state/FoodState';
import { massToRadius, uniformPosition } from '@/utils/game-util';
import { generateId } from 'colyseus';
import { Circle } from '@timohausmann/quadtree-ts';

export class AddFoodCommand extends Command<
	GameRoom,
	{
		toAdd: number;
	}
> {
	execute({ toAdd }: { toAdd: number }) {
		const radius = massToRadius(GameConfig.foodMass);

		for (let i = toAdd; i > 0; i--) {
			const foods = Array.from(this.state.food.values());
			const position = uniformPosition(foods, radius);

			const food = new FoodState(
				generateId(),
				position.x,
				position.y,
				radius,
				GameConfig.foodMass,
				Math.round(Math.random() * 360)
			);

			this.state.food.set(food.id, food);

			this.state.foodQuadTree.insert(
				new Circle({
					x: food.x,
					y: food.y,
					r: food.radius,
					data: food
				})
			)
		}
	}
}
