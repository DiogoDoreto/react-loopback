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

    it('_normalizeQueries should transform name and endpoint properties', () => {
      const queries = [
        {
          endpoint: 'users'
        },
        {
          endpoint: '/users'
        },
        {
          endpoint: 'users/'
        },
        {
          endpoint: '/users/'
        },
        {
          endpoint: 'users/1/orders'
        },
        {
          name: 'my-users',
          endpoint: 'users'
        }
      ];

      const results = DataLoader._normalizeQueries(queries);

      for (let i = 0; i <= 3; i++) {
        expect(results[i]).to.have.property('name', 'users');
        expect(results[i]).to.have.property('endpoint', 'users');
      }

      expect(results[4]).to.have.property('name', 'users-1-orders');
      expect(results[4]).to.have.property('endpoint', 'users/1/orders');

      expect(results[5]).to.have.property('name', 'my-users');
    });
  });

  describe('DataLoader', () => {
    function stubFecth({result, ok = true, statusText = ''}) {
      const oldFetch = window.fetch;

      window.fetch = () => new Promise(resolve => {
        setTimeout(() => {
          resolve({
            ok,
            statusText,
            json: () => result
          });
        }, 300);
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
      const options = {
        queries: [{
          name: 'myUsers',
          endpoint: 'users'
        }]
      };

      stubFecth({
        result: [ {name: 'John'}, {name: 'Mary'}, {name: 'Lucy'} ]
      });

      const Component = createDataLoader(MyUsersCount, options);

      const dataLoader = ReactTestUtils.renderIntoDocument(<Component />);
      const innerComponent = dataLoader.refs.component;
      const contentNode = innerComponent.refs.content;

      expect(innerComponent.props).to.have.property('myUsers_status', 'loading');
      expect(contentNode).to.have.property('textContent', 'Count: 0');

      setTimeout(() => {
        expect(innerComponent.props).to.have.property('myUsers_status', 'ok');
        expect(contentNode).to.have.property('textContent', 'Count: 3');
        done();
      }, 400);

      window.fetch.restore();
    });

    it('should inform when an error occurs', (done) => {
      const options = {
        queries: [{
          name: 'myUsers',
          endpoint: 'users'
        }]
      };

      stubFecth({
        ok: false,
        statusText: 'Some error message'
      });

      const Component = createDataLoader(MyUsersCount, options);

      const dataLoader = ReactTestUtils.renderIntoDocument(<Component />);
      const innerComponent = dataLoader.refs.component;

      expect(innerComponent.props).to.have.property('myUsers_status', 'loading');

      setTimeout(() => {
        expect(innerComponent.props).to.have.property('myUsers_status', 'error: Some error message');
        done();
      }, 400);

      window.fetch.restore();
    });

    it('should accept filter as a function', () => {
      const options = {
        queries: [{
          name: 'myUsers',
          endpoint: 'users',
          filter: ({id, page}) => ({
            id,
            limit: 10,
            skip: 10 * page - 10
          }),
          params: {
            id: 42
          },
          autoLoad: false
        }]
      };

      stubFecth({ok: false});

      const Component = createDataLoader(MyUsersCount, options);

      const oldBuildFn = Component._buildUrl;
      Component._buildUrl = (endpoint, filter) => {
        expect(filter).to.have.property('id', 42);
        expect(filter).to.have.property('limit', 10);
        expect(filter).to.have.property('skip', 60);

        return oldBuildFn(endpoint, filter);
      };

      const dataLoader = ReactTestUtils.renderIntoDocument(<Component />);

      dataLoader.load('myUsers', {page: 7});

      Component._buildUrl = oldBuildFn;
      window.fetch.restore();
    })
  });

});
