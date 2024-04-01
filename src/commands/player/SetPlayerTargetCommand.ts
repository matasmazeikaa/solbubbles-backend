import { Command } from '@colyseus/command';
import { GameRoom } from '@/game/GameRoom';

export class SetPlayerTargetCommand extends Command<
	GameRoom,
	{
		x: number;
		y: number;
	}
> {
	execute({ x, y, sessionId }) {
		this.state.players[sessionId].target.x = x;
		this.state.players[sessionId].target.y = y;
	}
}
