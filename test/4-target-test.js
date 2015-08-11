var path = require('path')
	, fs = require('fs')
	, should = require('should')
	, rimraf = require('rimraf')
	, fileFactory = require('../lib/file')
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
				inputPath: path.resolve('src/some.coffee'),
				input: 'src/some.coffee',
				output: 'js',
				runtimeOptions: {},
				fileExtensions: {
					js: ['js', 'json'],
					css: ['css'],
					html: ['html']
				}
			});
			target.should.have.property('output', 'js');
		});
	});

	describe('parse', function () {
		beforeEach(function () {
			target = targetFactory({
				inputPath: path.resolve('src/js'),
				outputPath: path.resolve('temp'),
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
			files.should.have.length(1);
		});
		it('should parse a directory "input" and return several File instances', function () {
			target.inputPath = path.resolve('src/js');
			files = target.parse(true, path.resolve('src/js'), /.js$/, target.fileFactoryOptions);
			files.should.have.length(4);
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
				inputPath: path.resolve('src/js'),
				sources: []
			});
		});
		it('should serially apply a set of commands to a collection of items', function (done) {
			var file1 = fileFactory(path.resolve('src/js/foo.js'), this.options)
				, file2 = fileFactory(path.resolve('src/js/bar.js'), this.options);
			target.process([file1, file2], { js: [['load'], ['compile']] }, function (err, files) {
				files[1].content.should.eql("var bat = require('./bat')\n	, baz = require('./baz')\n	, bar = this;");
				done();
			});
		});
		it('should return one file reference when processing a file with dependencies', function (done) {
			var file1 = fileFactory(path.resolve('src/js/foo.js'), this.options);
			files = target.process([file1], { js: [['load', 'parse', 'wrap'], []] }, function (err, files) {
				files.should.have.length(1);
				files[0].content.should.eql("require.register(\'src/js/foo.js\', function(require, module, exports) {\n  var bar = require(\'./bar\')\n  \t, foo = this;\n});");
				done();
			});
		});
	});

	describe('build', function () {
		beforeEach(function () {
			fileFactory.cache.flush();
			target = targetFactory({
				inputPath: path.resolve('src/js/foo.js'),
				outputPath: path.resolve('temp'),
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
			target.workflows = { js: [['load', 'compile'], []] };
			target.foo = 'bar';
			target.build(function (err, filepaths) {
				target.foo.should.eql('foo');
				done();
			});
		});
		it.skip('should execute an "after" hook after running the build', function (done) {
			target.after = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.foo="foo";done();');
			target.workflows = { js: [['load', 'compile'], []] };
			target.foo = 'bar';
			target.build(function (err, filepaths) {
				filepaths[0].toLowerCase().should.eql(path.resolve('temp/js/foo.js').toLowerCase())
				target.foo.should.eql('foo');
				done();
			});
		});
		it.skip('should execute an "afterEach" hook after each processed file is ready to write to disk', function (done) {
			target.afterEach = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.content="foo";done();');
			target.workflows = { js: [['load', 'compile'], []] };
			target.build(function (err, filepaths) {
				filepaths[0].toLowerCase().should.eql(path.resolve('temp/js/foo.js').toLowerCase())
				fs.readFileSync(filepaths[0], 'utf8').should.eql('/* generated by Buddy  */\n\nfoo');
				done();
			});
		});
		it('should return an error if a "before" hook returns an error', function (done) {
			target.before = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'done("oops");');
			target.workflows = [['load', 'compile'], []];
			target.build(function (err, filepaths) {
				should.exist(err);
				done();
			});
		});
		it('should return an error if an "after" hook returns an error', function (done) {
			target.after = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'done("oops");');
			target.workflows = { js: [['load', 'compile'], []] };
			target.build(function (err, filepaths) {
				should.exist(err);
				done();
			});
		});
	});
});