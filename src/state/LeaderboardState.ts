import { Schema, type } from "@colyseus/schema";

export class TopPlayerState extends Schema {
	@type('string')
	id: string;

	@type('string')
	publicKey: string;

	@type('number')
	massTotal: number;

	@type('number')
	splTokens: number;
  };