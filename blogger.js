const levels = ['noop', 'error', 'warn', 'info', 'debug', 'trace'];

/**
 * A simple logger for use in a browser with different log levels and transport options.
 *
 * @param {string} filename - The filename or category for the logger.
 * @throws {Error} Throws an error if the filename is undefined.
 * @constructor
 */
export default function Logger(filename){
	if(filename === undefined){
		throw new Error('Logger requires the file name of where it\'s being used.');
	}
	if(!new.target){
		return new Logger(...arguments);
	}

	/**
	 * Log a message with the specified log level.
	 *
	 * @param {string} level - The log level ('noop', 'error', 'warn', 'info', 'debug', 'trace').
	 * @param {string} msg - The main message to be logged.
	 * @param {...any} args - Additional arguments to be included in the log message.
	 * @example logger.info('This is an info message');
	 * @example logger.info([{name: 'Alice', age: 30, job: 'Engineer'},{name: 'Bob', age: 25, job: 'Designer'},{name: 'Charlie', age: 35, job: 'Teacher'}],{isTable: true, args: ['Name', 'Age', 'Job']});
	 * @example logger.info('This is a message group', {group: 'group'});
	 * @example logger.info('This ends the message group', {group: 'groupEnd'});
	 */
	Object.defineProperties(this, {
		log: {
			value: function(level, msg, params){
				if(levels.indexOf(level) <= levels.indexOf(Logger.state.currentLevel)){
					Object.values(Logger.state.transports).forEach((transport) => {
						queueMicrotask(() => transport.log({
							level,
							msg,
							category: filename,
							...params
						}));
					});
				}
			}
		}
	});
	levels.forEach((level) => {
		let logFn;
		if(level === 'noop'){
			logFn = () => {
			};
		}else{
			logFn = this.log.bind(this, level);
		}
		Object.defineProperty(this, level, {
			value: logFn
		});
	});
}

Object.defineProperties(Logger, {
	/**
	 * Add a new transport to the logger.
	 *
	 * @param {string} name - The name of the transport.
	 * @param {Object} newTransport - The transport object.
	 */
	addTransport: {
		value: (name, newTransport) => {
			Logger.state.transports[name] = newTransport;
		}
	},
	state: {
		value: {
			currentLevel: 'noop',
			transports: {}
		}
	},
	level: {
		get: () => Logger.state.currentLevel
	},
	/**
	 * Remove a transport from the logger.
	 *
	 * @function
	 * @name removeTransport
	 * @memberof Logger
	 * @param {string} transportToRemove - The name of the transport to be removed.
	 */
	removeTransport: {
		value: (transportToRemove) => {
			delete Logger.state.transports[transportToRemove];
		}
	},
	/**
	 * Set the log level for the logger.
	 *
	 * @function
	 * @name setLogLevel
	 * @memberof Logger
	 * @param {string} newLevel - The new log level to be set.
	 * @throws {Error} Throws an error if the provided log level is not valid.
	 */
	setLogLevel: {
		value: (newLevel) => {
			if(levels.some(level => level === newLevel)){
				Logger.state.currentLevel = newLevel;
			}else{
				throw new Error(`${newLevel} is not a valid logger level`);
			}
		}
	}
});
Logger.addTransport('default', ConsoleTransport({}));

levels.reduce((acc, cur) => {
	Object.defineProperty(acc, cur.toUpperCase(), {
		enumerable: true,
		get: () => cur
	});
	return acc;
}, Logger);

/**
 * ConsoleTransport is for logging messages to the console.
 * It supports optional styling, grouping, or table formatting.
 *
 * @param {Object} config - The configuration object for the ConsoleTransport.
 * @constructor
 */
export function ConsoleTransport(config){
	if(!new.target){
		return new ConsoleTransport(...arguments);
	}
	Object.defineProperty(this, 'log', {
		/**
		 * Log a message to the console with optional styling, grouping, or table formatting.
		 *
		 * @param {Object} params - The parameters for logging.
		 * @param {string} params.msg - The main message to be logged.
		 * @param {string} params.level - The log level ('info', 'warn', 'error', etc.).
		 * @param {string} [params.category] - The category or context of the log message (typically the filename).
		 * @param {boolean} [params.isTable=false] - Whether to format the log message as a table.
		 * @param {string} [params.group=undefined] - The console group method ('group', 'groupCollapsed', 'groupEnd').
		 * @param {Array} [params.style=undefined] - A pair of CSS strings to style the date and category fields.
		 * Additional styling can be applied by embedding the placeholder, `%c`, in the msg field and including the CSS
		 * in the args.
		 * @param {number} [params.timestamp] - The timestamp to include in the log message.
		 * @param {Array} [params.args=[]] - Additional arguments to be included in the log message.
		 *
		 * @example
		 * {
		 *   msg: 'Log message',
		 *   level: 'info',
		 *   category: 'file.js',
		 *   isTable: false,
		 *   group: 'group',
		 *   style: ['color: blue;', 'font-style: italic'],
		 *   timestamp: Date.now(),
		 *   args: [42, 'additional argument'],
		 * };
		 */
		value: function(params){
			const merged = Object.assign({}, config, params);
			// console.log(JSON.stringify(merged, null, 2));

			if(merged.isTable){
				console.table(merged.msg, merged.args);
			}else{
				if(merged.group){
					console[merged.group](merged.msg);
				}else{
					/*
					const dateFmt = {
						year: '2-digit',
						month: 'numeric',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit',
						fractionalSecondDigits: 3
					};
					*/
					const [dateStyle, categoryStyle] = merged.style?.length === 2 ? merged.style : ['font-weight: bold; color: green;', 'font-style: italic;'];
					console[merged.level](`%c${merged.timestamp || new Date().toLocaleTimeString('en-US', merged.dateFmt)}%c %c[${merged.category}]%c ${merged.msg}`, dateStyle, '', categoryStyle, '', ...merged.args || []);
				}
			}
		}
	});
}

/**
 * FileTransport is for logging messages to a file using the File System Access API.
 * It requires the File System Access API to function.
 *
 * @param {Object} config - The configuration object for the FileTransport.
 * @throws {Error} Throws an error if the File System Access API is not available.
 * @constructor
 * @example
 * const fileTransport = new FileTransport({});
 */
export function FileTransport(config){
	if(window.showSaveFilePicker === undefined){
		const msg = 'FileTransport requires the File System Access API';
		console.warn(msg);
		throw new Error(msg);
	}
	if(!new.target){
		return new FileTransport(...arguments);
	}

	Object.defineProperty(this, 'initialize', {
		/**
		 * Initialize the FileTransport by showing the save file picker and creating a writable file handle.
		 *
		 * @async
		 */
		value: async function(){
			try{
				const fileHandle = await window.showSaveFilePicker({
					types: [{
						description: 'Log Files',
						accept: {'text/plain': ['.log']},
					}],
				});
				Object.defineProperty(this, 'log', {
					/**
					 * Log a message to a file.
					 *
					 * @param {Object} params - The parameters for logging.
					 * @param {string} params.msg - The main message to be logged.
					 * @param {string} params.level - The log level ('info', 'warn', 'error', etc.).
					 * @param {string} [params.category] - The category or context of the log message (typically the filename).
					 * @param {number} [params.timestamp] - The timestamp to include in the log message.
					 * @param {Array} [params.args=[]] - Additional arguments to be included in the log message.
					 * @async
					 * @throws {Error} Throws an error if writing to file fails.
					 * @example
					 * {
					 *   msg: 'Log message',
					 *   level: 'info',
					 *   category: 'file.js',
					 *   timestamp: Date.now(),
					 *   args: [42, 'additional argument'],
					 * };
					 */
					//TODO: implement table and grouping
					value: async function(params){
						const merged = Object.assign({}, config, params);
						// console.log(JSON.stringify(merged, null, 2));

						let writable;
						try{
							writable = await fileHandle.createWritable({keepExistingData: true});
							await writable.write(`${merged.timestamp || new Date().toLocaleTimeString('en-US', merged.dateFmt)} [${merged.category}] ${merged.level}: ${merged.msg}\n`);
						}catch(e){
							console.error(e);
						}finally{
							await writable.close();
						}
					}
				});
			}catch(e){
				console.error(e);
			}
		}
	});
}

/**
 * APITransport is for logging messages to an API endpoint.
 * It supports sending log messages as HTTP requests.
 *
 * @param {Object} config - The configuration object for the APITransport.
 * @constructor
 * @example
 * const apiTransport = new APITransport({
 *   url: 'https://api.example.com/logs',
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json'
 *   },
 *	 body: {
 *		  msg: '{{msg}}',
 *		  level: '{{level}}',
 *		  category: '{{category}}',
 *		  timestamp: '{{timestamp}}',
 *		  group: '{{group}}',
 *		  isTable: '{{isTable}}',
 *		  args: '{{args}}'
 *	 }
 * });
 */
export function APITransport(config){
	if(!new.target){
		return new APITransport(...arguments);
	}

	Object.defineProperty(this, 'log', {
		/**
		 * Log a message to an API endpoint.
		 *
		 * @param {Object} params - The parameters for logging.
		 * @param {string} params.msg - The main message to be logged.
		 * @param {string} params.level - The log level ('info', 'warn', 'error', etc.).
		 * @param {string} [params.category] - The category or context of the log message (typically the filename).
		 * @param {number} [params.timestamp] - The timestamp to include in the log message.
		 * @param {Array} [params.args=[]] - Additional arguments to be included in the log message.
		 * @async
		 * @example
		 * {
		 *   msg: 'Log message',
		 *   level: 'info',
		 *   category: 'file.js',
		 *   timestamp: Date.now(),
		 *   args: [42, 'additional argument'],
		 * };
		 */
		//TODO: implement table and grouping
		value: async function(params){
			const merged = interpolate(config, params);

			try{
				const response = await fetch(merged.url, {
					method: merged.method,
					headers: Object.entries(merged.headers || {}).reduce((acc, [k, v]) => {
						acc[k] = v;
						return acc;
					}, {}),
					body: merged.body
				});
				console.debug(response);
			}catch(e){
				console.error(e);
			}
		}
	});
}

export const interpolate = function interpolator(template, model){
	if(template instanceof Object){
		const interpolated = Array.isArray(template) ? [] : {};
		for(const key in template){
			const val = interpolator(template[key], model);
			try{
				interpolated[key] = JSON.parse(val);
			}catch(_e){
				if(val !== undefined && val !== ''){
					interpolated[key] = val;
				}
			}
		}
		return interpolated;
	}
	if(typeof template !== 'string'){
		return template;
	}
	// TODO allow escaping of {{ and }}
	// TODO console placeholders
	return template.replace(/\{\{(.+?)}}/g, (_match, br) => {
		const val = model[br] || '';
		if(val instanceof Object){
			return JSON.stringify(val);
		}
		return val
	});
};
