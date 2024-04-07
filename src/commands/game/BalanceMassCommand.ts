import { Command, Dispatcher } from '@colyseus/command';
import { GameRoom } from '@/game/GameRoom';
import { GameConfig, VirusConfig } from '@/config/game-config';
import { AddFoodCommand } from './AddFoodCommand';
import { AddVirusCommand } from './AddVirusCommand';

export class BalanceMassCommand extends Command<GameRoom> {
	dispatcher = new Dispatcher(this as any);

	execute() {
		const totalMass = this.state.food.size * GameConfig.foodMass;

		const massDiff = GameConfig.gameMass - totalMass;
		const maxFoodDiff = GameConfig.maxFood - this.state.food.size;

		const foodDiff =
			parseInt(String(massDiff / GameConfig.foodMass), 10) - maxFoodDiff;
		const foodToAdd = Math.min(foodDiff, maxFoodDiff);

		if (foodToAdd > 0) {
			this.dispatcher.dispatch(new AddFoodCommand(), {
				toAdd: foodToAdd
			});
		}

		const virusToAdd = VirusConfig.maxVirus - this.state.virus.size;
		
		if (virusToAdd > 0) {
			this.dispatcher.dispatch(new AddVirusCommand(), {
				toAdd: virusToAdd
			});
		}
	}
}
