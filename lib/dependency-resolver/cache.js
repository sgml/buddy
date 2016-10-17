'use strict';

const { VERSION_DELIMITER } = require('./config');
let cwd = '';
let fileCache = new Map();
let packageCache = new Map();
let versionedFileCache = new Map();

module.exports = {
  /**
   * Retrieve id or filepath for 'key'
   * @param {String} key
   * @returns {String}
   */
  getCWD () {
    if (!cwd) cwd = process.cwd();
    return cwd;
  },

  /**
   * Retrieve id or filepath for 'key'
   * @param {String} key
   * @returns {String}
   */
  getFile (key) {
    return fileCache.get(key);
  },

  /**
   * Add 'file' to cache
   * @param {Object} file
   */
  setFile (file) {
    // Make sure not to overwrite
    if (file.path && file.id && !fileCache.has(file.path) && !fileCache.has(file.id)) {
      fileCache.set(file.path, file.id);
      fileCache.set(file.id, file.path);
      // Store in versioned cash to enable multiple version check
      if (~file.id.indexOf(VERSION_DELIMITER)) {
        const name = file.id.split(VERSION_DELIMITER)[0];

        if (!versionedFileCache.has(name)) {
          versionedFileCache.set(name, 1);
        } else {
          versionedFileCache.set(name, versionedFileCache.get(name) + 1);
        }
      }
    }
  },

  /**
   * Retrieve package details for 'key',
   * where 'key' is one of pakcage id or path
   * @param {String} key
   * @returns {Object}
   */
  getPackage (key) {
    return packageCache.get(key);
  },

  /**
   * Add 'pkg' to cache
   * @param {Object} pkg
   */
  setPackage (pkg) {
    // Make sure not to overwrite
    if (!packageCache.has(pkg.pkgpath) && !packageCache.has(pkg.id)) {
      packageCache.set(pkg.pkgpath, pkg);
      packageCache.set(pkg.id, pkg);
    }
  },

  /**
   * Determine if there is more than one version of 'id'
   * @param {String} id
   * @returns {Boolean}
   */
  hasMultipleVersions (id) {
    if (~id.indexOf(VERSION_DELIMITER)) {
      return versionedFileCache.get(id.split(VERSION_DELIMITER)[0]) > 1;
    }
    return false;
  },

  /**
   * Clear the cache
   */
  clear () {
    cwd = '';
    fileCache.clear();
    packageCache.clear();
    versionedFileCache.clear();
  }
};