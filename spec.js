const assert = require('chai').assert;
const sinon = require('sinon');
import Logger, {ConsoleTransport, APITransport, interpolate} from './blogger.js';

describe('Browser Logger', function(){
	before(function(){
		Logger.setLogLevel('debug');
		Logger.removeTransport('default');
	});
	after(function(){
		Logger.addTransport('default', ConsoleTransport({}));
	});
	beforeEach(function(){
		this.UUT = new Logger('spec.js');
	});
	it('should be properly constructed', function(){
		assert.instanceOf(this.UUT, Logger);
		Object.entries(Logger).forEach(([_k, v]) => {
			assert.property(this.UUT, v, `${v} method should exist on Logger instance`);
			assert.isFunction(this.UUT[v], `${v} should be a function on Logger instance`);
		});
	});
	it('can dynamically add/remove a transport', async function(){
		let transportSpy;
		await new Promise((res) => {
			const expected = 'This is a custom transport';
			const testTransport = (params) => {
				assert.equal(params.msg, expected);
				res();
			};
			transportSpy = sinon.spy(testTransport);
			Logger.addTransport('testTransport', {
				log: transportSpy
			});
			assert.isDefined(Logger.state.transports.testTransport);

			this.UUT.info(expected);
		});
		assert.isTrue(transportSpy.calledOnce);

		Logger.removeTransport('testTransport');
		assert.notProperty(Logger.state.transports, 'testTransport');
	});
	it('can dynamically change log level', async function(){
		this.timeout(4000);
		const expected = 'This is logged at `info` level';
		const testTransport = (params) => {
			assert.equal(params.msg, expected);
			params.args[0]?.res();
		};
		const transportSpy = sinon.spy(testTransport);
		Logger.addTransport('testTransport', {
			log: transportSpy
		});

		await new Promise((res) => {
			this.UUT.info(expected, {args: res});
			setTimeout(res, 1);
		});
		assert.isTrue(transportSpy.called);

		transportSpy.resetHistory();

		Logger.setLogLevel('warn');
		assert.equal(Logger.level, 'warn');

		await new Promise((res) => {
			this.UUT.info(expected, {args: res});
			setTimeout(res, 1);
		});
		assert.isFalse(transportSpy.called, 'Info log not filtered');
		Logger.removeTransport('testTransport');
	});
	it.skip('should be able to test the logging output', function(){
	});
	it.skip('should show metadata when present', function(){
	});
});

describe('Console logging', function(){
	let consoleSpy;

	before(function(){
		Logger.setLogLevel('debug');
	});
	beforeEach(function(){
		this.UUT = new Logger('spec.js');
		consoleSpy = sinon.spy(console);
	});
	afterEach(function(){
		sinon.restore();
	});
	it('should accept timestamp, category, and CSS, and additional args', async function(){
		const method = 'info';
		const category = 'spec.js';
		const expected = 'This is a test (%s)';
		const timestamp = new Date();
		const [dateStyle, categoryStyle] = ['font-style: italic; color: red;', 'font-weight: bold;'];
		const additionalArgs = ['additional argument'];
		await new Promise((res) => {
			this.UUT[method](expected, {timestamp, style: [dateStyle, categoryStyle], args: additionalArgs});
			setTimeout(res, 1);
		});
		// console.log(JSON.stringify(consoleSpy[method].getCall(0), null, 2));

		[
			`%c${timestamp}%c %c[${category}]%c ${expected}`,
			dateStyle,
			'',
			categoryStyle,
			'',
			'additional argument'
		].forEach((arg, i) => {
			assert.equal(consoleSpy[method].getCall(0).args[i], arg);
		});
		assert.isTrue(consoleSpy[method].calledWith(`%c${timestamp}%c %c[${category}]%c ${expected}`, dateStyle, '', categoryStyle, '', ...additionalArgs));
	});
	it('should log tables', async function(){
		const table = [
			{name: 'Alice', age: 30, job: 'Engineer'},
			{name: 'Bob', age: 25, job: 'Designer'},
			{name: 'Charlie', age: 35, job: 'Teacher'}
		];
		await new Promise((res) => {
			this.UUT.info(table, {isTable: true, args: ['Name', 'Age', 'Job']});
			setTimeout(res, 1);
		});
		// console.log(JSON.stringify(consoleSpy.table.getCall(0), null, 2));
		assert.isTrue(consoleSpy.table.calledWith(table, ['Name', 'Age', 'Job']));
	});
	it('should log groups', async function(){
		await new Promise((res) => {
			this.UUT.info('This is a message group', {group: 'group'});
			this.UUT.info('This ends the message group', {group: 'groupEnd'});
			setTimeout(res, 1);
		});
		assert.isTrue(consoleSpy.group.calledOnce);
		assert.isTrue(consoleSpy.groupEnd.calledOnce);
		assert.isTrue(consoleSpy.group.calledWith('This is a message group'));
		assert.isTrue(consoleSpy.groupEnd.calledWith('This ends the message group'));
	});
});

describe('Interpolator', function(){
	it('should interpolate a string with a model', function(){
		assert.equal(interpolate('This is a test: {{test}}', {test: 'pass'}), 'This is a test: pass');
		assert.equal(interpolate('{{action}}, and again I say {{action}}', {action: 'rejoice'}), 'rejoice, and again I say rejoice');
	});
	it('should interpolate an array with a model', function(){
		assert.deepEqual(interpolate(['Test 1: {{result1}}', 'Test 2: {{result1}}'], {
			result1: 'pass',
			result2: 'fail'
		}), ['Test 1: pass', 'Test 2: pass']);
		assert.deepEqual(interpolate(['{{single}}', '{{collection}}'], {
			collection: ['test1', 'test2'],
			single: 'Tests'
		}), ['Tests', ['test1', 'test2']]);
		assert.deepEqual(interpolate('{{elems}}', {elems: ['test1', 'test2']}), '["test1","test2"]');
	});
	it('should interpolate an object with a model', function(){
		assert.deepEqual(interpolate({body: '{{payload}}'}, {payload: {a: 1, b: 2}}), {body: {a: 1, b: 2}});
		assert.deepEqual(interpolate({results: '{{results}}'}, {results: ['pass', 'fail']}), {results: ['pass', 'fail']});
		assert.deepEqual(interpolate('{{body}}', {body: {a: 1, b: 2}}), JSON.stringify({a: 1, b: 2}));
	});
	it('should leave other values alone', function(){
		assert.deepEqual(interpolate({pass: true, test: 1}, {test: 'pass'}), {pass: true, test: 1});
	});
	it('should omit missing values', function(){
		assert.deepEqual(interpolate('This is a test: {{test}}', {}), 'This is a test: ');
		assert.deepEqual(interpolate({body: '{{payload}}'}, {}), {});
	});
});

describe('API logging', function(){
	const fetchConfig = {
		url: 'https://api.example.com/logs',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: '{{msg}}'
	};
	before(function(){
		this.apiTransport = new APITransport(fetchConfig);
		Logger.setLogLevel('debug');
		Logger.addTransport('api', this.apiTransport);
		this.UUT = new Logger('spec.js');

		this.fetchStub = sinon.stub(window, 'fetch');
		this.fetchStub.resolves(new Response(JSON.stringify({success: true})));
	});
	after(function(){
		Logger.removeTransport('api');
		this.fetchStub.restore();
	});
	beforeEach(function(){
		this.UUT = new Logger('spec.js');
	});
	it('should interpolate the config and call params', function(){
		const template = {
			url: 'https://api.example.com/logs/{{id}}',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': '{{apiKey}}'
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
		};

		const model = {
			id: 123,
			apiKey: 'abc123',
			msg: 'This is %s #%d',
			level: 'info',
			category: 'spec.js',
			timestamp: `${Date.now().toLocaleString('en-US')}`,
			args: ['test', 10]
		};

		const result = interpolate(template, model);

		assert.deepEqual(result, {
			url: 'https://api.example.com/logs/123',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': 'abc123'
			},
			body: {
				msg: 'This is %s #%d',
				level: 'info',
				category: 'spec.js',
				timestamp: model.timestamp,
				args: ['test', 10]
			}
		});
	});
	it('should log to an API', async function(){
		const msg = 'This is a test';
		const {url, ...expected} = fetchConfig;
		await this.UUT.info(msg);
		// console.log('expected\n', url, JSON.stringify(expected, null, 2));
		// console.log('actual\n', JSON.stringify(this.fetchStub.getCall(0), null, 2));
		assert.isTrue(this.fetchStub.calledWith(url, interpolate(expected, {msg})));
	});
});
