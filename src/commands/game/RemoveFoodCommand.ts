import { Command } from '@colyseus/command';
import { GameRoom } from '@/game/GameRoom';

export class RemoveFoodCommand extends Command<
	GameRoom,
	{
		toRemove: number;
	}
> {
	execute({ toRemove }) {
		for (let i = toRemove; i > 0; i--) {
			this.state.food.pop();
		}
	}
}
