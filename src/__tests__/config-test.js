/*eslint-env mocha */
/*global expect */
import config from '../config';

describe('config', () => {
  it('should set string key', () => {
    config.set('_my_string_key_', 'my value');
    const value = config.get('_my_string_key_');
    expect(value).to.be.equal('my value');
  });

  it('should set object keys', () => {
    config.set({
      '_my_object_key1_': 'value1',
      '_my_object_key2_': 'value2'
    });

    const value1 = config.get('_my_object_key1_');
    expect(value1).to.be.equal('value1');

    const value2 = config.get('_my_object_key2_');
    expect(value2).to.be.equal('value2');
  });
});
