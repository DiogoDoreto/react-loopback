/*eslint-env mocha */
/*global expect */
import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-addons-test-utils';
import config from '../config';
import {createDataLoader} from '../createDataLoader';

describe('createDataLoader', () => {

  describe('static methods', () => {
    let DataLoader;

    beforeEach(() => {
      config.set('baseUrl', '');
      DataLoader = createDataLoader(() => '', {queries: []});
    });

    it('_getBaseUrl should return return URL with a slash at the end', () => {
      config.set('baseUrl', 'http://example.com/api');
      const url = DataLoader._getBaseUrl();
      expect(url).to.equal('http://example.com/api/');
    });

    it('_getBaseUrl should not duplicate the slash at the end', () => {
      config.set('baseUrl', 'http://example.com/api/');
      const url = DataLoader._getBaseUrl();
      expect(url).to.equal('http://example.com/api/');
    });

    it('_getBaseUrl should accept empty baseUrl', () => {
      const url = DataLoader._getBaseUrl();
      expect(url).to.equal('/');
    });

    it('_buildUrl should build url', () => {
      const filter = {limit: 10};
      const endpoint = 'users'
      const result = '/users?filter=' + encodeURIComponent(JSON.stringify(filter));

      const url = DataLoader._buildUrl(endpoint, filter);
      expect(url).to.equal(result);
    });

    it('_buildUrlsFromQueries should build all urls', () => {
      const queries = [
        {
          endpoint: 'users',
          limit: 20
        },
        {
          name: 'my-orders',
          endpoint: 'orders',
          where: {user_id: 7}
        }
      ];
      const urls = DataLoader._buildUrlsFromQueries(queries);
      urls.map(item =>
        expect(item)
          .to.have.property('url')
          .that.is.a('string'));
    });
  });

  describe('DataLoader', () => {

    function stubFecth() {
      const oldFetch = window.fetch;

      window.fetch = () => new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok: true,
            json() {
              return [
                {name: 'John'},
                {name: 'Mary'},
                {name: 'Lucy'}
              ];
            }
          });
        }, 500);
      });

      window.fetch.restore = () => window.fetch = oldFetch;
    }

    const MyUsersCount = React.createClass({
      render () {
        const {myUsers=[]} = this.props;
        return <span ref="content">Count: {myUsers.length}</span>;
      }
    });

    it('should fetch data and send to Component', (done) => {
      stubFecth();

      const options = {
        queries: [{
          name: 'myUsers',
          endpoint: 'users'
        }]
      };

      const Component = createDataLoader(MyUsersCount, options);

      const dataLoader = ReactTestUtils.renderIntoDocument(<Component />);
      const comp = dataLoader.refs.component.refs.content;
      expect(comp).to.have.property('textContent', 'Count: 0');

      setTimeout(() => {
        expect(comp).to.have.property('textContent', 'Count: 3');
        done();
      }, 600);

      window.fetch.restore();
    });
  });

});
