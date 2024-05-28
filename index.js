let Logger;

if(typeof window === 'undefined'){
	Logger = require('./logger');
}else{
	Logger = require('./blogger').default;
}

module.exports = Logger;
