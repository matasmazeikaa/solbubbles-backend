import { Command, Dispatcher } from '@colyseus/command';
import { GameConfig, VirusConfig } from '@/config/game-config';
import { GameRoom } from '@/game/GameRoom';
import { AddFoodCommand } from './AddFoodCommand';
import { AddVirusCommand } from './AddVirusCommand';
import { RemoveFoodCommand } from './RemoveFoodCommand';

export class BalanceMassCommand extends Command<GameRoom> {
	dispatcher = new Dispatcher(this as any);

	execute() {
		const totalMass = this.state.food.length * GameConfig.foodMass;

		const massDiff = GameConfig.gameMass - totalMass;
		const maxFoodDiff = GameConfig.maxFood - this.state.food.length;
		const foodDiff =
			parseInt(String(massDiff / GameConfig.foodMass), 10) - maxFoodDiff;
		const foodToAdd = Math.min(foodDiff, maxFoodDiff);
		const foodToRemove = -Math.max(foodDiff, maxFoodDiff);

		if (foodToAdd > 0) {
			this.dispatcher.dispatch(new AddFoodCommand(), {
				toAdd: foodToAdd
			});
			// console.log('[DEBUG] Adding ' + foodToAdd + ' food to level!');
		} else if (foodToRemove > 0) {
			this.dispatcher.dispatch(new RemoveFoodCommand(), {
				toRemove: foodToRemove
			});
		}

		const virusToAdd = VirusConfig.maxVirus - this.state.virus.length;

		
		if (virusToAdd > 0) {
			this.dispatcher.dispatch(new AddVirusCommand(), {
				toAdd: virusToAdd
			});
		}
	}
}
