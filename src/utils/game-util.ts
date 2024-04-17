import { GameConfig } from "@/config/game-config";

export const getDistance = (
	pointA: { x: number; y: number },
	pointB: { x: number; y: number }
) => {
	return Math.sqrt((pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2);
};

export const isCircleOverlapping = (
	circleA: { x: number; y: number; r: number },
	circleB: { x: number; y: number; r: number },
	padding = 0
) => {
	return getDistance(circleA, circleB) < circleA.r + circleB.r + padding;
};

export const toNumberSafe = (value: string) => {
	const num = parseInt(value, 10);
	return isNaN(num) ? 0 : num;
}

export const round = (num: number, decimalPlaces = 0): number => {
    if (num < 0)
        return -round(-num, decimalPlaces);

    num = Math.round(Number(num + "e" + decimalPlaces));

    return Number(num + "e" + -decimalPlaces);
}

export const splitNumberWithoutDecimals = (number: number) => {
    const half = Math.floor(number / 2);
    return [half, number - half];
}

// determine mass from radius of circle
export const massToRadius = (mass: number) => 4 + Math.sqrt(mass) * 6;

// overwrite Math.log function
export const log = (() => {
	const { log } = Math;

	return (n: number, base: number) => log(n) / (base ? log(base) : 1);
})();

export const randomInRange = (from: number, to: number) =>
	Math.floor(Math.random() * (to - from)) + from;

// generate a random position within the field of play
export const randomPosition = (radius: number) => ({
	x: randomInRange(radius, GameConfig.gameWidth - radius),
	y: randomInRange(radius, GameConfig.gameHeight - radius),
	radius: radius,
});

export const uniformPosition = (points: { x: number, y: number }[], radius: number) => {
	let bestCandidate;
	let maxDistance = 0;
	const numberOfCandidates = 10;

	if (points.length === 0) {
		return randomPosition(radius);
	}

	// Generate the cadidates
	for (let ci = 0; ci < numberOfCandidates; ci++) {
		let minDistance = Infinity;
		const candidate = randomPosition(radius);
		candidate.radius = radius;

		for (let pi = 0; pi < points.length; pi++) {
			const distance = getDistance(candidate, points[pi]);
			if (distance < minDistance) {
				minDistance = distance;
			}
		}

		if (minDistance > maxDistance) {
			bestCandidate = candidate;
			maxDistance = minDistance;
		} else {
			return randomPosition(radius);
		}
	}

	return bestCandidate;
};