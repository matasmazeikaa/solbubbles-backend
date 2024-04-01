import { GameConfig } from "@/config/game-config";

export const validNick = (nickname) => {
	const regex = /^\w*$/;
	return regex.exec(nickname) !== null;
};

export const toNumberSafe = (value) => {
	const num = parseInt(value, 10);
	return isNaN(num) ? 0 : num;
}

export const round = (num: number, decimalPlaces = 0) => {
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
export const massToRadius = (mass) => 4 + Math.sqrt(mass) * 6;

// overwrite Math.log function
export const log = (() => {
	const { log } = Math;
	return (n, base) => log(n) / (base ? log(base) : 1);
})();

// get the Euclidean distance between the edges of two shapes
export const getDistance = (p1, p2) =>
	Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) - p1.radius - p2.radius;

export const randomInRange = (from, to) =>
	Math.floor(Math.random() * (to - from)) + from;

// generate a random position within the field of play
export const randomPosition = (radius) => ({
	x: randomInRange(radius, GameConfig.gameWidth - radius),
	y: randomInRange(radius, GameConfig.gameHeight - radius),
	radius: radius,
});

export const uniformPosition = (points, radius) => {
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

export const findIndex = (arr, id) => {
	let len = arr.length;

	while (len--) {
		if (arr[len].id === id) {
			return len;
		}
	}

	return -1;
};