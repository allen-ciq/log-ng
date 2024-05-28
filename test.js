const Karma = require('karma');
const Mocha = require('mocha');
const app = require('./testServer');

const mocha = new Mocha();

function runServerTests(specPath){
	console.log('Starting Mocha tests');
	mocha.addFile(specPath);
	mocha.run((err) => {
		console.error(err);
	});
}

function runBrowserTests(configPath){
	return new Promise((res, rej) => {
		console.log('Starting Karma tests');
		const config = Karma.config.parseConfig(configPath, {});
		const server = new Karma.Server(config, (exitCode) => {
			if(exitCode === 0){
				console.log('Karma tests completed');
				res();
			}else{
				rej(new Error(`Karma tests failed with exit code ${exitCode}`));
			}
		});

		// server.on('browser_log', (browser, log, type) => {
		// 	console.log(`Browser log [${type}]: ${log} (${browser})`);
		// });

		// server.on('browser_error', (browser, error) => {
		// 	console.error(`Error in browser: ${error} (${browser})`);
		// });

		// server.on('run_complete', (browser) => {
		// 	console.log(`Run complete: ${browser}`);
		// });

		server.start();
	});
};

const testServer = app.listen(3000, 'localhost', async () => {
	try{
		console.log('Test server started');

		runServerTests('./server.spec.js');

		await runBrowserTests(__dirname + '/karma.server.conf.js', {});

		await runBrowserTests(__dirname + '/karma.file.conf.js', {});

		console.log('All tests completed');
	}catch(error){
		console.error('Error running tests:', error);
	}finally{
		testServer.close(() => {
			console.log('Test server closed');
		});
	}
});
