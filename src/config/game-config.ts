export enum GameConfig {
	port = 3000,
	foodMass = 1,
	fireFood = 10,
	limitSplit = 16,
	startingSpeed = 6.25,
	startingPlayerMass = 200,
	defaultPlayerMass = 10,
	gameWidth = 5000,
	gameHeight = 5000,
	adminPass = 'DEFAULT',
	gameMass = 20000,
	maxFood = 1000,
	slowBase = 4.5,
	logChat = 0,
	newPlayerInitialPosition = 'farthest',
	massLossRate = 1,
	minMassLoss = 50,
	mergeTimer = 15,
	cashoutCooldown = 30,
	immunityTimer = 10,
	maxRoomUserAmount = 100
};

export enum VirusConfig {
	maxVirus = 50,
	fill = 0x33ff33,
	stroke = 0x19D119,
	strokeWidth = 4,
	defaultMass = 40,
}

export const BotConfig = {
	ACTIVE: true,
	MAX_BOT: 40,
	SPEED: 50,
	startingSpeed: 6.25,
	startingPlayerMass: 100,
};
