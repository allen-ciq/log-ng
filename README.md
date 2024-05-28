# Log-Ng
Provides both a node.js and a browser logger, inspired by loggers like [log4j](https://logging.apache.org/log4j/2.x/) and [Winston](https://github.com/winstonjs/winston) (The node.js logger uses Winston under the hood).
## Browser Logger
The browser logger was inspired by Winston, and aims to provide configurable log levels, allowing logging to be left in place without needing to modify the code to enable or disable logging.  It uses `ConsoleTransport` by default, but also comes with `APITransport` for sending logs to a server and `FileTransport` for saving logs to a file (requires support for the File System API).
### Example
#### ConsoleTransport (default)
```javascript
import { Logger } from 'log-ng';
const logger = new Logger('thisFile');
Logger.setLevel('info');
logger.info('Hello, World!');
```
#### APITransport
```javascript
import { Logger, APITransport } from 'log-ng';
Logger.setLevel('info');
Logger.addTransport('api', new APITransport({
	url: 'http://localhost:3000/log',
	method: 'POST',
	headers: {
		'Content-Type': 'application/json'
	},
	body: {
		msg: '{{msg}}',
		level: '{{level}}',
		category: '{{category}}',
		timestamp: '{{timestamp}}',
		group: '{{group}}',
		isTable: '{{isTable}}',
		args: '{{args}}'
	}
}));
const logger = new Logger('thisFile');
logger.info('Hello, World!');
````
#### FileTransport
```javascript
import { Logger, FileTransport } from 'log-ng';
Logger.setLevel('info');
const fileTransport = new FileTransport({});
await fileTransport.initialize();
Logger.addTransport('file', fileTransport);
const logger = new Logger('thisFile');
logger.info('Hello, World!');
```
## Node.js Logger
The node.js logger is a wrapper around Winston, and provides a simple way to log messages to the console.  Additional Winston transports can be added, as needed.  The primary purpose of this Logger is to simplify creation of pre-configured Winston child instances of the main singleton instance.
### Example
#### Basic Usage
```javascript
const { Logger } = require('log-ng');
const logger = new Logger(path.basename(__filename));
logger.info('Hello, World!');
```
#### Adding Transports
```javascript
const { Logger } = require('log-ng');
const { File } = require('winston').transports;
Logger.addTransport('file', new File({ filename: 'log.log' }));
const logger = new Logger(path.basename(__filename));
logger.info('Hello, World!');
```

## TODO
- [ ] Implement table and group rendering in the API and File transports
- [ ] Implement console placeholder for API and File transports
- [ ] Implement escaping of {{ and }} in interpolate function
