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

      const url1 = DataLoader._buildUrl(endpoint, filter);
      expect(url1).to.equal(result);

      const token = 'abc123';
      config.set('access_token', token);

      const url2 = DataLoader._buildUrl(endpoint, filter);
      expect(url2).to.equal(result + '&access_token=' + token);
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

    it('_transform_array should return data as array', () => {
      const data_a = [{id: 1}, {id: 2}, {id: 3}];
      const data_b = [{id: 4}, {id: 5}];
      let result;

      result = DataLoader._transform_array(data_a, [], {}, {}, {});
      expect(result).to.deep.equal(data_a);

      result = DataLoader._transform_array(data_a, data_b, {}, {}, {});
      expect(result).to.deep.equal(data_a);

      result = DataLoader._transform_array(data_a, data_b, {}, {}, {append: true});
      expect(result).to.deep.equal(data_b.concat(data_a));
    });

    it('_transform_object should return data as object', () => {
      const data_a = [{id: 1}, {id: 2}, {id: 3}];
      const res_a = {
        1: {id: 1},
        2: {id: 2},
        3: {id: 3}
      };
      const data_b = [{key: 4}, {key: 5}];
      const res_b = {
        4: {key: 4},
        5: {key: 5}
      };
      const res_ab = {
        1: {id: 1},
        2: {id: 2},
        3: {id: 3},
        4: {key: 4},
        5: {key: 5}
      };
      let result;

      result = DataLoader._transform_object(data_a, [], {}, {}, {});
      expect(result).to.deep.equal(res_a);

      result = DataLoader._transform_object(data_b, [], {}, {}, {id: 'key'});
      expect(result).to.deep.equal(res_b);

      result = DataLoader._transform_object(data_a, res_b, {}, {}, {});
      expect(result).to.deep.equal(res_ab);

      result = DataLoader._transform_object(data_a, res_b, {}, {}, {reset: true});
      expect(result).to.deep.equal(res_a);
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
      let filterWasCalled = false;
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
        filterWasCalled = true;

        expect(filter).to.have.property('id', 42);
        expect(filter).to.have.property('limit', 10);
        expect(filter).to.have.property('skip', 60);

        return oldBuildFn(endpoint, filter);
      };

      const dataLoader = ReactTestUtils.renderIntoDocument(<Component />);

      dataLoader.load('myUsers', {page: 7});
      expect(filterWasCalled).to.be.true;

      Component._buildUrl = oldBuildFn;
      window.fetch.restore();
    });

    it('should accept a custom transform function', (done) => {
      const fetchData = [ {name: 'John'}, {name: 'Mary'}, {name: 'Lucy'} ];
      let transformWasCalled = false;
      const options = {
        queries: [{
          endpoint: 'users',
          filter: {limit: 10},
          params: {page: 4},
          transform: (json, data, filter, params, options) => {
            transformWasCalled = true;

            expect(json).to.deep.equal(fetchData);
            expect(data).to.be.an('array')
              .that.has.length(0);
            expect(filter).to.deep.equal({limit: 10});
            expect(params).to.deep.equal({page: 4, id: 10});
            expect(options).to.deep.equal({key: 'value'});
          }
        }]
      };

      stubFecth({
        result: fetchData
      });

      const Component = createDataLoader(MyUsersCount, options);

      const dataLoader = ReactTestUtils.renderIntoDocument(<Component />);
      dataLoader.load('users', {id: 10}, {key: 'value'});

      setTimeout(() => {
        expect(transformWasCalled).to.be.true;
        done();
      }, 400);

      window.fetch.restore();
    });
  });

});
