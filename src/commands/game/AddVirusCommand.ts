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
	execute({ toAdd }: { toAdd: number }) {
		for (let i = toAdd; i > 0; i--) {
			const mass = VirusConfig.defaultMass;
			const radius = massToRadius(mass);
			const viruses = Array.from(this.state.virus.values());
			const position = uniformPosition(viruses, radius);

			const virus = new VirusState().assign({
				x: position.x,
				y: position.y,
				w: radius * 2,
				h: radius * 2,
				radius,
				mass,
				fill: VirusConfig.fill,
				stroke: VirusConfig.stroke,
				strokeWidth: VirusConfig.strokeWidth,
				speed: 0
			});

			this.state.virus.set(virus.id, virus);
		}
	}
}
