import React from 'react';
import config from './config';

/**
 * A wrapper for a React component that manages the data fetching from Loopback
 * server automatically.
 *
 * Options:
 *
 * ```
 * {
 *   queries: [
 *     {
 *       name: 'todo',          // The name of the property passed to Component
 *                              // that will contain the fetched data
 *       endpoint: 'tasks',     // The endpoint on Loopback server
 *       filter: {              // The filter object passed to Loopback API
 *         where: {done: false}
 *       }
 *     },
 *     { ... }
 *   ]
 * }
 *
 * @param  {React.Component} Component The React component that will receive the
 *                                     fetched data
 * @param  {object}          options   The options object
 * @return {React.Component}           The wrapper component
 */
export function createDataLoader(Component, options = {}) {
  if (!Component) {
    throw new Error('Component is required');
  }

  if (!options.queries) {
    throw new Error('options.queries is required');
  }

  /**
   * The wrapper component that will manage the data fetching
   */
  const DataLoader = React.createClass({

    statics: {
      /**
       * Get baseUrl from config and make sure there is a slash at the end.
       * @return {string} The API base URL
       */
      _getBaseUrl() {
        let baseUrl = config.get('baseUrl') || '';
        if (baseUrl.slice(-1) !== '/') {
          baseUrl += '/';
        }
        return baseUrl;
      },

      /**
       * Given the endpoint and its filter, this will build the full
       * URL to query Loopback
       * @param  {string} endpoint Name of the route
       * @param  {object} filter   Filter object
       * @return {string}          Loopback URL
       */
      _buildUrl(endpoint, filter) {
        const baseUrl = DataLoader._getBaseUrl();
        const filterParam = encodeURIComponent(JSON.stringify(filter));
        return baseUrl + endpoint + '?filter=' + filterParam;
      },

      /**
       * Maps the queries object to include a url property
       * @param  {array} queries Array of queries objects
       * @return {array}         Array of queries objects with url property
       */
      _buildUrlsFromQueries(queries) {
        return queries.map(({name, filter, endpoint}) => {
          if (endpoint.slice(0, 1) === '/') {
            endpoint = endpoint.slice(1);
          }
          name = name || endpoint;

          return {
            name,
            filter,
            endpoint,
            url: DataLoader._buildUrl(endpoint, filter)
          };
        });
      }
    },

    /**
     * Data fetching is started as soon as possible
     */
    componentWillMount() {
      this._data = {};
      const urls = DataLoader._buildUrlsFromQueries(options.queries);

      _.map(urls, ({name, url}) => {
        fetch(url)
          .then(response => {
            if (!response.ok) throw new Error(response.statusText);
            return response.json();
          })
          .then(json => {
            this._data[name] = json;
            this.forceUpdate();
          });
      });
    },

    render() {
      return (
        <Component ref="component" {...this.props} {...this._data} />
      );
    }
  });

  return DataLoader;
}
