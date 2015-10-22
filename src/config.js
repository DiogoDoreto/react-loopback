import _ from 'lodash';

/**
 * Basic class to store key/value configuration
 */
class Config {
  constructor() {
    this._config = {};
  }

  get(key) {
    return this._config[key];
  }

  set(key, value) {
    if (typeof key === 'object') {
      _.assign(this._config, key);
    } else {
      this._config[key] = value;
    }
  }
}

export default new Config();
