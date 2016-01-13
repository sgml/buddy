'use strict';

const expect = require('expect.js')
  , fileFactory = require('../lib/file')
  , fs = require('fs')
  , path = require('path')
  , rimraf = require('rimraf')
  , targetFactory = require('../lib/target');

let target, options;

describe('target', () => {
  before(() => {
    process.chdir(path.resolve(__dirname, 'fixtures/target'));
  });
  beforeEach(() => {
    if (!fs.existsSync(path.resolve('temp'))) fs.mkdirSync(path.resolve('temp'));
  });
  afterEach(() => {
    fileFactory.cache.flush();
    rimraf.sync(path.resolve('temp'));
  });

  describe('factory', () => {
    it('should decorate a new Target instance with passed data', () => {
      target = targetFactory({
        inputpath: path.resolve('src/some.coffee'),
        input: 'src/some.coffee',
        output: 'js'
      },
      {
        fileExtensions: {
          js: ['js', 'json'],
          css: ['css'],
          html: ['html']
        },
        runtimeOptions: {}
      });
      expect(target).to.have.property('output', 'js');
    });
  });

  describe('parse', () => {
    beforeEach(() => {
      target = targetFactory({
        inputpath: path.resolve('src/js'),
        outputpath: path.resolve('temp')
      },
      {
        fileExtensions: {
          js: ['js', 'coffee'],
          css: ['css'],
          html: ['html']
        },
        runtimeOptions: {}
      });
    });
    it('should parse a file "input" and return a File instance', () => {
      const files = target.parse(false, path.resolve('src/js/foo.js'), null, target.options);

      expect(files).to.have.length(1);
    });
    it('should parse a directory "input" and return several File instances', () => {
      target.inputpath = path.resolve('src/js');
      const files = target.parse(true, path.resolve('src/js'), /.js$/, target.options);

      expect(files).to.have.length(4);
    });
  });

  describe('process', () => {
    before(() => {
      options = {
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
      }, options);
    });

    it('should serially apply a set of commands to a collection of items', (done) => {
      const file1 = fileFactory(path.resolve('src/js/foo.js'), options)
        , file2 = fileFactory(path.resolve('src/js/bar.js'), options);

      target.process([file1, file2], { js: [['load'], [], []] }, false, (err, files) => {
        expect(files[1].content).to.eql("var bat = require(\'./bat\')\n\t, baz = require(\'./baz\')\n\t, bar = this;");
        done();
      });
    });
    it('should return one file reference when processing a file with dependencies', (done) => {
      const file1 = fileFactory(path.resolve('src/js/foo.js'), options);

      target.process([file1], { js: [['load', 'parse', 'wrap'], [], []] }, false, (err, files) => {
        expect(files).to.have.length(1);
        expect(files[0].content).to.eql("require.register(\'src/js/foo.js\', function(require, module, exports) {\n    var bar = require(\'./bar\')\n    \t, foo = this;\n});");
        done();
      });
    });
  });

  describe('build', () => {
    beforeEach(() => {
      fileFactory.cache.flush();
      target = targetFactory({
        inputpath: path.resolve('src/js/foo.js'),
        outputpath: path.resolve('temp'),
        sources:['src']
      },
      {
        compilers: {
          css: '',
          js: '',
          html: ''
        },
        fileExtensions: {
          js: ['js', 'json'],
          css: ['css'],
          html: ['html']
        },
        runtimeOptions: {},
        sources:['src'],
        workflows: { js: [['load', 'compile'], [], []] }
      });
    });
    afterEach(() => {
      target.reset();
    });

    it('should execute a "before" hook before running the build', (done) => {
      target.before = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.foo="foo";done();');
      target.foo = 'bar';
      target.build((err, filepaths) => {
        expect(target.foo).to.eql('foo');
        done();
      });
    });
    it('should execute an "after" hook after running the build', (done) => {
      target.after = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.foo="foo";done();');
      target.foo = 'bar';
      target.build((err, filepaths) => {
        expect(filepaths[0].toLowerCase()).to.eql(path.resolve('temp/js/foo.js').toLowerCase())
        expect(target.foo).to.eql('foo');
        done();
      });
    });
    it('should execute an "afterEach" hook after each processed file is ready to write to disk', (done) => {
      target.afterEach = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'context.content="foo";done();');
      target.build((err, filepaths) => {
        expect(filepaths[0].toLowerCase()).to.eql(path.resolve('temp/js/foo.js').toLowerCase())
        expect(fs.readFileSync(filepaths[0], 'utf8')).to.eql('foo');
        done();
      });
    });
    it('should return an error if a "before" hook returns an error', (done) => {
      target.before = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'done("oops");');
      target.build((err, filepaths) => {
        expect(err).to.be('oops');
        done();
      });
    });
    it('should return an error if an "after" hook returns an error', (done) => {
      target.after = new Function('global', 'process', 'console', 'require', 'context', 'options', 'done', 'done("oops");');
      target.build((err, filepaths) => {
        expect(err).to.be('oops');
        done();
      });
    });
  });
});