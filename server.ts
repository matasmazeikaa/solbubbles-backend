import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { LobbyRoom } from 'colyseus';
import { Server } from '@colyseus/core';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { createServer } from 'https';
import bodyParser from 'body-parser';
import routes from './routes';
import { GameRoom } from '@/game/GameRoom';
import { TOKEN_CONFIG } from '@/constants';
import { logger } from '@/logger';
import { WebSocketTransport } from "@colyseus/ws-transport"

import fs from 'fs';
const app = express();

Sentry.init({
	dsn: 'https://2fe5e36c69a9ca1c851ae967d5ebc75a@o4507054488682496.ingest.us.sentry.io/4507054491762688',
	integrations: [
		// enable HTTP calls tracing
		new Sentry.Integrations.Http({ tracing: true }),
		// enable Express.js middleware tracing
		new Sentry.Integrations.Express({ app }),
		nodeProfilingIntegration()
	],
	// Performance Monitoring
	tracesSampleRate: 1.0, //  Capture 100% of the transactions
	// Set sampling rate for profiling - this is relative to tracesSampleRate
	profilesSampleRate: 1.0
});
dotenv.config();

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Error handlerw

// Routes:
app.use('/api', routes);
app.use('/monitor', monitor());

const gameServer = new Server({
	logger: logger,
	transport: new WebSocketTransport({
		server: createServer({
			key: fs.readFileSync("/etc/ssl/localhost/localhost.key"),
			cert: fs.readFileSync("/etc/ssl/localhost/localhost.crt")
		}, app),
	})
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
	},
	gameRoom3: {
		id: 'game-room-3',
		roomSplTokenEntryFee: 500,
		roomSplLamporsEntryFee: 500 * TOKEN_CONFIG.LAMPORTS_PER_TOKEN
	},
} as const;

gameServer.listen(3000);
gameServer.define('lobby', LobbyRoom);

export const rooms = [
	gameServer
		.define(ROOM.gameRoom1.id, GameRoom, {
			roomSplTokenEntryFee: ROOM.gameRoom1.roomSplTokenEntryFee
		})
		.enableRealtimeListing()
		.setMaxListeners(100),

	gameServer
		.define(ROOM.gameRoom2.id, GameRoom, {
			roomSplTokenEntryFee: ROOM.gameRoom2.roomSplTokenEntryFee
		})
		.enableRealtimeListing()
		.setMaxListeners(100),

	gameServer
		.define(ROOM.gameRoom3.id, GameRoom, {
			roomSplTokenEntryFee: ROOM.gameRoom3.roomSplTokenEntryFee
		})
		.enableRealtimeListing()
		.setMaxListeners(100)
];

gameServer.onShutdown(() => {
	logger.error('Server went down');
});

process.on('exit', (code) => {
	logger.error('Process exited with code', code);
});

process.on('beforeExit', (code) => {
	// Can make asynchronous calls
	logger.error(`Process will exit with code: ${code}`);
	process.exit(code);
});

logger.info('Server started on port 3000');
