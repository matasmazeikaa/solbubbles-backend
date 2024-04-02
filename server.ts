import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { Server, LobbyRoom } from 'colyseus';

import { createServer } from 'http';
import bodyParser from 'body-parser';
import routes from './routes';
import { GameRoom } from '@/game/GameRoom';
import { TOKEN_CONFIG } from '@/constants';

// console.log('[STARTING SERVER]');
dotenv.config();

const app = express();

// // TODOADD it with PM2
// const PORT = Number(process.env.PORT) + Number(process.env.NODE_APP_INSTANCE);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Error handlerw
app.use((err, _, res, __) => {
	console.error(err.stack);
	res.status(500).send('Something broke!');
});
// Routes:
app.use('/api', routes);
app.use('/monitor', monitor());

const gameServer = new Server({
	server: createServer(app)
});

const ROOM = {
	gameRoom1: {
		id: 'game-room-1',
		roomSplTokenEntryFee: 25,
		roomSplLamporsEntryFee: 25 * TOKEN_CONFIG.LAMPORTS_PER_TOKEN
	},
	gameRoom2: {
		id: 'game-room-2',
		roomSplTokenEntryFee: 100,
		roomSplLamporsEntryFee: 100 * TOKEN_CONFIG.LAMPORTS_PER_TOKEN
	}
} as const;

gameServer.listen(3000);

gameServer.define('lobby', LobbyRoom);

export const rooms = [
	gameServer
		.define(ROOM.gameRoom1.id, GameRoom, {
			roomSplTokenEntryFee: ROOM.gameRoom1.roomSplTokenEntryFee
		})
		.enableRealtimeListing(),
	gameServer
		.define(ROOM.gameRoom2.id, GameRoom, {
			roomSplTokenEntryFee: ROOM.gameRoom2.roomSplTokenEntryFee
		})
		.enableRealtimeListing()
];
