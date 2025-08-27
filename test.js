const app = require('./testServer.js');

exports.mochaHooks = {
	beforeAll(done){
		this.testServer = app.listen(3000, 'localhost', done);
		console.info('Test server started');
	},
	afterAll(done){
		this.testServer.close(done);
		console.info('Test server closed');
	}
};
