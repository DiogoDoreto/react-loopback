/*eslint-env mocha */
import {hello} from '../Hello';

describe('hello', () => {
  it('should say hello!', () => {
    expect(hello()).to.equal('hello!');
  });
});
