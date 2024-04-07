import { Command } from '@colyseus/command';
import { GameRoom } from '@/game/GameRoom';

interface SetPlayerTargetCommandPayload {
	x: number;
	y: number;
	sessionId: string;
}

export class SetPlayerTargetCommand extends Command<
	GameRoom,
	SetPlayerTargetCommandPayload
> {
	execute({ x, y, sessionId }: SetPlayerTargetCommandPayload) {
		this.state.players.get(sessionId).target.x = x;
		this.state.players.get(sessionId).target.y = y;
	}
}
