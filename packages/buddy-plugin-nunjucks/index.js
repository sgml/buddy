'use strict';

const nunjucks = require('nunjucks');

const FILE_EXTENSIONS = ['nunjucks', 'nunjs', 'njk'];
const RE_INCLUDE = /{%\s(?:extends|include)\s['"]([^'"]+)['"]\s?%}/g;
const WORKFLOW_WRITE = [
  'inline',
  'compile',
  'parseInline',
  'inlineInline'
];

module.exports = {
  name: 'nunjucks',
  type: 'html',

  /**
   * Register plugin
   * @param {Config} config
   */
  register (config) {
    config.registerFileDefinitionAndExtensionsForType(define, FILE_EXTENSIONS, this.type);
  }
};

/**
 * Extend 'File' with new behaviour
 * @param {Class} File
 * @param {Object} utils
 * @returns {Class}
 */
function define (File, utils) {
  const { debug, strong, warn } = utils.cnsl;
  const { uniqueMatch } = utils.string;

  return class NUNJUCKSFile extends File {
    /**
     * Constructor
     * @param {String} id
     * @param {String} filepath
     * @param {Object} options
     *  - {Object} fileExtensions
     *  - {Function} fileFactory
     *  - {Object} runtimeOptions
     *  - {Array} sources
     */
    constructor (id, filepath, options) {
      super(id, filepath, options);

      this.workflows.write = WORKFLOW_WRITE;
    }

    /**
     * Parse file contents for dependency references
     * @param {Object} buildOptions
     *  - {Boolean} bootstrap
     *  - {Boolean} boilerplate
     *  - {Boolean} bundle
     *  - {Boolean} compress
     *  - {Array} ignoredFiles
     *  - {Boolean} includeHeader
     *  - {Boolean} includeHelpers
     *  - {Boolean} watchOnly
     * @param {Function} fn(err)
     */
    parse (buildOptions, fn) {
      // Add sidecar json file
      const sidecarData = super.findSidecarDependency();
      // Parse includes
      let matches = uniqueMatch(this.content, RE_INCLUDE)
        .map((match) => {
          match.id = match.match;
          return match;
        });

      if (sidecarData) matches.push(sidecarData);
      super.addDependencies(matches, buildOptions);
      fn();
    }

    /**
     * Inline include dependency content
     * @param {Object} buildOptions
     *  - {Boolean} bootstrap
     *  - {Boolean} boilerplate
     *  - {Boolean} bundle
     *  - {Boolean} compress
     *  - {Array} ignoredFiles
     *  - {Boolean} includeHeader
     *  - {Boolean} includeHelpers
     *  - {Boolean} watchOnly
     * @param {Function} fn(err)
     */
    inline (buildOptions, fn) {
      super.inlineDependencyReferences();
      debug(`inline: ${strong(this.relpath)}`, 4);
      fn();
    }

    /**
     * Compile file contents
     * @param {Object} buildOptions
     *  - {Boolean} bootstrap
     *  - {Boolean} boilerplate
     *  - {Boolean} bundle
     *  - {Boolean} compress
     *  - {Array} ignoredFiles
     *  - {Boolean} includeHeader
     *  - {Boolean} includeHelpers
     *  - {Boolean} watchOnly
     * @param {Function} fn(err)
     */
    compile (buildOptions, fn) {
      let data = {};

      // Find sidecar data
      this.dependencies.some((dependency) => {
        if (dependency.type == 'json') {
          try {
            data = JSON.parse(dependency.content);
          } catch (err) {
            warn(`malformed json file: ${strong(dependency.filepath)}`);
          }
          return true;
        }
      });

      nunjucks.renderString(this.content, data, (err, content) => {
        if (err) return fn(err);
        this.content = content;
        debug(`compile: ${strong(this.relpath)}`, 4);
        fn();
      });
    }

    /**
     * Parse file contents for inline dependency references
     * @param {Object} buildOptions
     *  - {Boolean} bootstrap
     *  - {Boolean} boilerplate
     *  - {Boolean} bundle
     *  - {Boolean} compress
     *  - {Array} ignoredFiles
     *  - {Boolean} includeHeader
     *  - {Boolean} includeHelpers
     *  - {Boolean} watchOnly
     * @param {Function} fn(err)
     */
    parseInline (buildOptions, fn) {
      super.parse(buildOptions, fn);
    }

    /**
     * Inline css/img/js dependency content
     * @param {Object} buildOptions
     *  - {Boolean} bootstrap
     *  - {Boolean} boilerplate
     *  - {Boolean} bundle
     *  - {Boolean} compress
     *  - {Array} ignoredFiles
     *  - {Boolean} includeHeader
     *  - {Boolean} includeHelpers
     *  - {Boolean} watchOnly
     * @param {Function} fn(err)
     */
    inlineInline (buildOptions, fn) {
      super.inline(buildOptions, fn);
    }
  };
}