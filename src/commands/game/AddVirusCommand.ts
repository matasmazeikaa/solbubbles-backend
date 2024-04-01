import { Command } from '@colyseus/command';
import { VirusConfig } from '@/config/game-config';
import { GameRoom } from '@/game/GameRoom';
import { VirusState } from '@/state/VirusState';
import { massToRadius, uniformPosition } from '@/utils/game-util';

export class AddVirusCommand extends Command<
	GameRoom,
	{
		toAdd: number;
	}
> {
	execute({ toAdd }) {
		for (let i = toAdd; i > 0; i--) {
			const mass = VirusConfig.defaultMass;
			const radius = massToRadius(mass);
			const position = uniformPosition(this.state.virus, radius);

			this.state.virus.push(
				new VirusState().assign({
					x: position.x,
					y: position.y,
					radius,
					mass,
					fill: VirusConfig.fill,
					stroke: VirusConfig.stroke,
					strokeWidth: VirusConfig.strokeWidth,
					speed: 0
				})
			);
		}
	}
}
