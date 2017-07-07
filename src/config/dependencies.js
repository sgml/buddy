// @flow

'use strict';

const { error, print, strong } = require('../utils/cnsl');
const { execSync: exec } = require('child_process');
const { isEmptyArray } = require('../utils/is');
const { resolve } = require('../resolver');
const fs = require('fs');
const path = require('path');

const useNPM = !fs.existsSync(path.resolve('yarn.lock'));

module.exports = {
  find,
  install
};

/**
 * Resolve dependency filepath from 'id'
 */
function find(id: string): string {
  let filepath = '';

  if (typeof id === 'string') {
    try {
      // Resolve relative to buddy package
      filepath = require.resolve(id);
    } catch (err) {
      // Resolve relative to project package
      filepath = resolve(path.resolve('package.json'), id);
    }
  }

  return filepath;
}

/**
 * Install dependencies based on 'ids'
 */
function install(ids: Array<string>, dev: boolean) {
  if (isEmptyArray(ids)) {
    return;
  }

  const missingDependencies = ids.filter(id => find(id) === '');

  if (!isEmptyArray(missingDependencies)) {
    try {
      const cmd = useNPM
        ? `npm ${dev ? '--save-dev' : ''} --save-exact install ${missingDependencies.join(' ')}`
        : `yarn add ${dev ? '--dev' : ''} --exact ${missingDependencies.join(' ')}`;

      print(`installing the following missing ${dev ? 'dev' : ''} dependencies:`, 0);
      missingDependencies.forEach(id => {
        print(strong(id), 1);
      });
      exec(cmd);
    } catch (err) {
      error(err);
    }
  }
}