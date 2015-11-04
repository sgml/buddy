var expect = require('expect.js')
	, fileFactory = require('../lib/file')
	, fs = require('fs')
	, path = require('path')
	, rimraf = require('rimraf')
	, targetFactory = require('../lib/target')

	, target;

describe('target', function () {
	before(function () {
		process.chdir(path.resolve(__dirname, 'fixtures/target'));
	});
	beforeEach(function () {
		if (!fs.existsSync(path.resolve('temp'))) fs.mkdirSync(path.resolve('temp'));
	});
	afterEach(function () {
		fileFactory.cache.flush();
		rimraf.sync(path.resolve('temp'));
	});

	describe('factory', function () {
		it('should decorate a new Target instance with passed data', function () {
			target = targetFactory({
				inputpath: path.resolve('src/some.coffee'),
				input: 'src/some.coffee',
				output: 'js',
				runtimeOptions: {},
				fileExtensions: {
					js: ['js', 'json'],
					css: ['css'],
					html: ['html']
				}
			});
			expect(target).to.have.property('output', 'js');
		});
	});

	describe('parse', function () {
		beforeEach(function () {
			target = targetFactory({
				inputpath: path.resolve('src/js'),
				outputpath: path.resolve('temp'),
				fileExtensions: {
					js: ['js', 'coffee'],
					css: ['css'],
					html: ['html']
				},
				sources: [],
				runtimeOptions: {}
			});
		});
		it('should parse a file "input" and return a File instance', function () {
			var files = target.parse(false, path.resolve('src/js/foo.js'), null, target.fileFactoryOptions);
			expect(files).to.have.length(1);
		});
		it('should parse a directory "input" and return several File instances', function () {
			target.inputpath = path.resolve('src/js');
			files = target.parse(true, path.resolve('src/js'), /.js$/, target.fileFactoryOptions);
			expect(files).to.have.length(4);
		});
	});

	describe('process', function () {
		before(function () {
			this.options = {
				fileExtensions: {
					js: ['js', 'json'],
					css: ['css'],
					html: ['html']
				},
				runtimeOptions: {}
			};
			target = targetFactory({
				inputpath: path.resolve('src/js'),
				sources: []
			});
		});
		it('should serially apply a set of commands to a collection of items', function (done) {
			var file1 = fileFactory(path.resolve('src/js/foo.js'), this.options)
				, file2 = fileFactory(path.resolve('src/js/bar.js'), this.options);
			target.process([file1, file2], { js: [['load'], [], ['compile']] }, false, function (err, files) {
				expect(files[1].content).to.eql("'use strict';\n\nvar bat = require(\'./bat\'),\n    baz = require(\'./baz\'),\n    bar = undefined;");
				done();
			});
		});
		it('should return one file reference when processing a file with dependencies', function (done) {
			var file1 = fileFactory(path.resolve('src/js/foo.js'), this.options);
			files = target.process([file1], { js: [['load', 'parse', 'wrap'], [], []] }, false, function (err, files) {
				expect(files).to.have.length(1);
				expect(files[0].content).to.eql("require.register(\'src/js/foo.js\', function(require, module, exports) {\n    var bar = require(\'./bar\')\n    \t, foo = this;\n});");
				done();
			});
		});
	});

	describe('build', function () {
		beforeEach(function () {
			fileFactory.cache.flush();
			target = targetFactory({
				inputpath: path.resolve('src/js/foo.js'),
				outputpath: path.resolve('temp'),
				fileExtensions: {
					js: ['js', 'json'],
					css: ['css'],
					html: ['html']
				},
				sources:['src'],
				runtimeOptions:{}
			});
		});
		afterEach(function () {
			target.reset();
		});
		it('should execute a "before" hook before running the build', function (done) {
			target.before = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.foo="foo";done();');
			target.workflows = { js: [['load', 'compile'], [], []] };
			target.foo = 'bar';
			target.build(function (err, filepaths) {
				expect(target.foo).to.eql('foo');
				done();
			});
		});
		it('should execute an "after" hook after running the build', function (done) {
			target.after = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.foo="foo";done();');
			target.workflows = { js: [['load', 'compile'], [], []] };
			target.foo = 'bar';
			target.build(function (err, filepaths) {
				expect(filepaths[0].toLowerCase()).to.eql(path.resolve('temp/js/foo.js').toLowerCase())
				expect(target.foo).to.eql('foo');
				done();
			});
		});
		it('should execute an "afterEach" hook after each processed file is ready to write to disk', function (done) {
			target.afterEach = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.content="foo";done();');
			target.workflows = { js: [['load', 'compile'], [], []] };
			target.build(function (err, filepaths) {
				expect(filepaths[0].toLowerCase()).to.eql(path.resolve('temp/js/foo.js').toLowerCase())
				expect(fs.readFileSync(filepaths[0], 'utf8')).to.eql('foo');
				done();
			});
		});
		it('should return an error if a "before" hook returns an error', function (done) {
			target.before = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'done("oops");');
			target.workflows = [['load', 'compile'], [], []];
			target.build(function (err, filepaths) {
				expect(err).to.be('oops');
				done();
			});
		});
		it('should return an error if an "after" hook returns an error', function (done) {
			target.after = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'done("oops");');
			target.workflows = { js: [['load', 'compile'], [], []] };
			target.build(function (err, filepaths) {
				expect(err).to.be('oops');
				done();
			});
		});
	});
});