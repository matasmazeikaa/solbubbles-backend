import winston from 'winston';
import 'winston-daily-rotate-file';
const { combine, timestamp, json, errors, prettyPrint, colorize, simple } =
	winston.format;


const fileRotateTransport = new winston.transports.DailyRotateFile({
	datePattern: 'YYYY-MM-DD',
	maxFiles: '14d',
	filename: './logs/combined-%DATE%.log',
	format: combine(
		timestamp(),
		json(),
		errors({ stack: true }),
		prettyPrint()
	)

});
const errorFileTransport = new winston.transports.DailyRotateFile({
	datePattern: 'YYYY-MM-DD',
	maxFiles: '14d',
	filename: './logs/app-error-%DATE%.log',
	format: combine(
		timestamp(),
		json(),
		errors({ stack: true }),
		prettyPrint()
	)
});
const rejectionFileTransport = new winston.transports.DailyRotateFile({
	datePattern: 'YYYY-MM-DD',
	maxFiles: '14d',
	filename: './logs/app-rejections-%DATE%.log',
	format: combine(
		timestamp(),
		json(),
		errors({ stack: true }),
		prettyPrint()
	)
});
const exceptionsFileTransport = new winston.transports.DailyRotateFile({
	datePattern: 'YYYY-MM-DD',
	maxFiles: '14d',
	filename: './logs/app-exceptions-%DATE%.log',
	format: combine(
		timestamp(),
		json(),
		errors({ stack: true }),
		prettyPrint()
	)
});

export const logger = winston.createLogger({
	level: 'info',
	transports: [
		//
		// - Write all logs with importance level of `error` or less to `error.log`
		// - Write all logs with importance level of `info` or less to `combined.log`
		//
		fileRotateTransport,
		errorFileTransport,
		new winston.transports.Console({
			level: 'info',
			format: combine(colorize(), simple())
		})
	],
	exceptionHandlers: [
		exceptionsFileTransport
	],
	rejectionHandlers: [
		rejectionFileTransport
	]
});

logger.log({
	level: 'info',
	message: 'Hello distributed log files!'
});

