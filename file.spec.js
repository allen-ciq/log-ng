const chai = require('chai');
const sinon = require('sinon');
import Logger, {FileTransport} from './blogger.js';

const {assert, expect} = chai;

describe('File logging', function(){
	before(async function(){
		const fileTransport = new FileTransport({});
		Logger.addTransport('file', fileTransport);
		Logger.setLogLevel('debug');

		assert.equal(typeof window.showSaveFilePicker, 'function');
		this.windowFilePicker = window.showSaveFilePicker;
		window.showSaveFilePicker = sinon.stub();

		const context = this;
		this.writeStub = sinon.stub();
		this.closeStub = sinon.stub();
		window.showSaveFilePicker.returns(Promise.resolve({
			createWritable: () => Promise.resolve({
				write: context.writeStub.returns(Promise.resolve()),
				close: context.closeStub.returns(Promise.resolve())
			})
		}));

		await fileTransport.initialize();
	});
	after(function(){
		Logger.removeTransport('file');
		window.showSaveFilePicker = this.windowFilePicker;
	});
	it('should prompt for a filename', async function(){
		const fileTransport = new FileTransport({});
		await fileTransport.initialize();
		assert.isTrue(window.showSaveFilePicker.calledTwice); // Called once in the before block
		expect(fileTransport.log).a('function');
	});
	it('should log to a file', async function(){
		const message = 'Test log message';
		const method = 'info';
		const category = 'file.spec.js';
		const timestamp = new Date().toISOString();

		const logger = new Logger(category);
		await new Promise((res) => {
			logger[method](message, {timestamp});
			setTimeout(res, 1);
		})
		// console.log(JSON.stringify(this.writeStub.getCall(0), null, 2));

		sinon.assert.calledWith(this.writeStub, `${timestamp} [${category}] ${method}: ${message}\n`);
		sinon.assert.calledOnce(this.closeStub);
	});
});
