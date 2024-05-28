const {createLogger, format, transports, Transport} = require('winston');

const {align, colorize, combine, label, metadata, printf, timestamp} = format;

function Logger(fileName, customMetadata = {}){
	if (fileName === undefined) {
		throw new Error('Logger requires the file name of where it\'s being used.');
	}
	if(!new.target){
		return new Logger(...arguments);
	}

	// TODO fix this ugly hack
	if(Logger.instance === undefined && typeof fileName === 'object'){
		const config = fileName;
		const types = {};
		const stdFormat = combine(
			// metadata(),
			// metadata({ fillWith: ['fileName'].concat(Object.keys(customMetadata)) }),
			metadata({ fillWith: Object.keys(customMetadata) }),
			timestamp({format: 'YY-M-D hh:mm:ss:SSS'}),
			// label({label: }),
			// colorize(),
			align(),
			printf(info => `${info.timestamp} [${info.fileName}] ${info.level}: ${info.message}`)
		);
		Object.defineProperties(Logger, {
			addTransport: {
				value: (name, newTransport) => {
					if (newTransport instanceof Transport && types[name] === undefined) {
						Object.defineProperty(types, name, {
							configurable: true,
							enumerable: true,
							value: () => newTransport
						});
					}
					Logger.instance.add(types[name]());
				}
			},
			getLogLevel: {
				value: () => Logger.instance.level
			},
			instance: {
				value: createLogger({
					level: config.logLevel,
					transports: [new transports.File({
						filename: config.logFile,
						format: stdFormat,
						maxsize: '5242880',
						zippedArchive: true
					}), new transports.Console({
						format: stdFormat
					})]
				})
			},
			removeTransport: {
				value: (transportToRemove) => {
					if (typeof transportToRemove === 'string') {
						Logger.instance.remove(types[transportToRemove]());
						delete types[transportToRemove];
					} else {
						Logger.instance.remove(transportToRemove);
						// TODO: find and delete when no name given
					}
				}
			},
			setLogLevel: {
				value: (newLevel) => {
					Logger.instance.level = newLevel;
				}
			},
			transportTypes: {
				get: () => types
			}
		});
	}

	const logger = Logger.instance.child({
		fileName,
		...customMetadata
	});
	Object.defineProperties(logger, {
		getLogLevel: {
			value: () => Logger.instance.level
		},
		setLogLevel: {
			value: (newLevel) => {
				Logger.instance.level = newLevel;
			}
		}
	});
	return logger;
}

module.exports = Logger;
