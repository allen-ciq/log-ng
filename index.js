let Logger;

if(process?.versions?.node){
	Logger = require('./logger.js');
}else{
	Logger = require('./blogger.js').default;
}

module.exports = Logger;
