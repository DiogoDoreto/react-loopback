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
 *
 *   queries: [
 *     {
 *       name: 'todo',          // (Optional: defaults to endpoint value)
 *                              // The name of the property passed to Component
 *                              // that will contain the fetched data
 *
 *       endpoint: 'tasks',     // (Required) The endpoint on Loopback server
 *
 *       filter: {              // (Optional / object or function)
 *         where: {done: false} // The filter object passed to Loopback API
 *       },
 *
 *       filter: function (params) {       // function version of filter
 *         if (!params.page) return false;
 *         return {
 *           limit: 30,
 *           skip: 30 * params.page - 30
 *         };
 *       },
 *
 *       params: {              // (Optional) Default parameters passed to
 *         page: 1              // filter function
 *       },
 *
 *       autoLoad: true         // When true (default), query will be fetched as
 *                              // soon as the component is mounted
 *     },
 *     { ... }
 *   ]
 * }
 * ```
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
        let url = baseUrl + endpoint
        if (filter) {
          url += '?filter=' + encodeURIComponent(JSON.stringify(filter));
        }
        return url;
      },

      /**
       * Normalizes the queries objects.
       * @param  {array} queries Array of queries objects
       * @return {array}         Array of normalized queries objects
       */
      _normalizeQueries(queries) {
        return queries.map(({name, filter, endpoint, params = {}, autoLoad = true}) => {
          // Remove leading slash
          if (endpoint.slice(0, 1) === '/') {
            endpoint = endpoint.slice(1);
          }
          // Remove trailing slash
          if (endpoint.slice(-1) === '/') {
            endpoint = endpoint.slice(0,-1);
          }

          name = name || endpoint.replace(/\W+/g, '-');

          return {
            name,
            filter,
            endpoint,
            params,
            autoLoad
          };
        });
      }
    },

    /**
     * Data fetching is started as soon as possible
     */
    componentWillMount() {
      this._queries = _.indexBy(DataLoader._normalizeQueries(options.queries), 'name');
      this._data = _(this._queries)
        .map(q => [q.name, []])
        .zipObject()
        .value();

      _.map(this._queries, ({name, autoLoad}) => autoLoad && this.load(name));
    },

    /**
     * Load data from Loopback API.
     *
     * Options:
     *
     * ```
     * {
     *   resetParams: false  // When true, previous parameters will be replaced.
     *                       // When false (default), they will be merged.
     *   append: false       // When true, new data will be appended to the old data.
     *                       // When false (default), new data will replace old data.
     * }
     * ```
     *
     * @param  {string} name    The name of the query to load
     * @param  {object} params  Parameters to be passed to filter function, if existent
     * @param  {object} options Options object
     */
    load(name, params = {}, options = {}) {
      const cfg = this._queries[name];

      if (options.resetParams) {
        cfg.params = {};
      }

      _.assign(cfg.params, params);

      const filter = typeof cfg.filter === 'function' ?
        cfg.filter(cfg.params) :
        cfg.filter;

      if (filter === false) {
        return;
      }

      const url = DataLoader._buildUrl(cfg.endpoint, filter);

      const status = cfg.name + '_status';
      this._data[status] = 'loading';

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(response.statusText);
          return response.json();
        })
        .then(json => {
          if (options.append) {
            this._data[cfg.name] = this._data[cfg.name].concat(json);
          } else {
            this._data[cfg.name] = json;
          }
        })
        .then(
          () => this._data[status] = 'ok',
          (err) => this._data[status] = 'error: ' + err.message
        )
        .then(() => this.forceUpdate());
    },

    render() {
      return (
        <Component
          ref="component"
          dataloader={this}
          {...this.props}
          {...this._data}
        />
      );
    }
  });

  return DataLoader;
}
