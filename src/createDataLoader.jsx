import React from 'react';
import config from './config';
import { debounce } from './util'

/**
 * A wrapper for a React component that manages the data fetching from LoopBack
 * server automatically. The wrapped component will receive the `DataLoader`
 * instance as `dataloader` property. And, for each query, two extra parameters
 * will be passed:
 *
 * - `{name}` → The data received from LoopBack API
 * - `{name}_status` → A string that can have the following values:
 *   - `'loading'` → When new data is currently being loaded;
 *   - `'ok'` → When data was correctly loaded;
 *   - `'error: {error_message}'` → When an error occurs.
 *
 * The options object:
 *
 * ```javascript
 * {
 *  extendMethods: [           // (Optional) Array of component methods that
 *    'method_a'               // should still be available on wrapper
 *  ],
 *
 *  queries: [                 // (Required) Array of queries to be made
 *    {
 *      name: 'todo',          // (Optional: defaults to endpoint value)
 *                             // The name of the property passed to Component
 *                             // that will contain the fetched data
 *
 *      endpoint: 'tasks',     // (Required) The endpoint on Loopback server
 *
 *      filter: {              // (Optional / object or function)
 *        where: {done: false} // The filter object passed to Loopback API
 *      },
 *
 *      filter: function (params) {       // function version of filter
 *        if (!params.page) return false;
 *        return {
 *          limit: 30,
 *          skip: 30 * params.page - 30
 *        };
 *      },
 *
 *      params: {              // (Optional) Default parameters passed to
 *        page: 1              // filter function
 *      },
 *
 *      autoLoad: true,        // When true (default), query will be fetched as
 *                             // soon as the component is mounted
 *
 *      transform: 'array',    // Transform function that will receive new data
 *                             // and return the data passed to inner component.
 *                             // When equal to 'array' (default), the data is
 *                             // kept as an array of objects.
 *                             // When equal to 'object', the data is kept as a
 *                             // key-value object, where key is the id field.
 *                             // You can pass a custom function as well.
 *
 *      transform: function (json, data, filter, params, options) {
 *                             // Parameters:
 *                             // json: The new data from LoopBack API
 *                             // data: The existent data
 *                             // filter: The filter object used to request data
 *                             // params: The params object passed to filter function
 *                             // options: The options object passed to load method
 *                             //
 *                             // Is recommended that you don't modify the data
 *                             // parameter. Instead create and return a new
 *                             // object.
 *      }
 *    },
 *    { ... }
 *  ]
 * }
 * ```
 *
 * @param  {React.Component} Component The React component that will receive the
 *                                     fetched data
 * @param  {object}          options   The options object
 * @return {DataLoader}                The DataLoader wrapper component
 */
export function createDataLoader(Component, options = {}) {
  if (!Component) {
    throw new Error('Component is required');
  }

  if (!options.queries) {
    throw new Error('options.queries is required');
  }

  const spec = {
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
        const token = config.get('access_token') || '';
        if (token) {
          url += filter ? '&' : '?';
          url += 'access_token=' + token;
        }
        return url;
      },

      /**
       * Normalizes the queries objects.
       * @param  {array} queries Array of queries objects
       * @return {array}         Array of normalized queries objects
       */
      _normalizeQueries(queries) {
        return queries.map(({
          name,
          filter,
          endpoint,
          params = {},
          autoLoad = true,
          transform = 'array'
        }) => {
          // Remove leading slash
          if (endpoint.slice(0, 1) === '/') {
            endpoint = endpoint.slice(1);
          }
          // Remove trailing slash
          if (endpoint.slice(-1) === '/') {
            endpoint = endpoint.slice(0,-1);
          }

          if (typeof transform === 'string') {
            transform = this['_transform_' + transform];
          }
          if (typeof transform !== 'function') {
            throw new Error('Unknown type of transform option:' + (typeof transform));
          }

          name = name || endpoint.replace(/\W+/g, '-');

          return {
            name,
            filter,
            endpoint,
            params,
            autoLoad,
            transform
          };
        });
      },

      /**
       * Transform function that keeps data as array, optionally concatening new
       * results.
       * @param  {array}  json    JSON data received from LoopBack API
       * @param  {array}  data    Previouly received data
       * @param  {object} filter  Filter object used to query LoopBack API
       * @param  {object} params  Params object passed to filter function
       * @param  {object} options Options object passed to load method
       * @return {array}          The resulting array that inner component will
       *                          receive
       */
      _transform_array(json, data, filter, params, {append = false}) {
        return append ?
          data.concat(json) :
          json;
      },

      /**
       * Transform function that keeps data as a key-value object, where key is
       * the id of the row and value is the row.
       * @param  {array}  json    JSON data received from LoopBack API
       * @param  {array}  data    Previouly received data
       * @param  {object} filter  Filter object used to query LoopBack API
       * @param  {object} params  Params object passed to filter function
       * @param  {object} options Options object passed to load method
       * @return {object}         The resulting object that inner component will
       *                          receive
       */
      _transform_object(json, data, filter, params, {id = 'id', reset = false}) {
        const newData = _.indexBy(json, id);
        if (reset) {
          return newData;
        }
        return _.assign({}, data, newData);
      }
    },

    /**
     * Data fetching is started as soon as possible
     */
    componentWillMount() {
      // creates internal structures
      this._queries = _.indexBy(DataLoader._normalizeQueries(options.queries), 'name');
      this._data = _(this._queries)
        .map(q => [q.name, []])
        .zipObject()
        .value();


      // creates a debounced version of load function for each query
      this._queries = _.mapValues(this._queries, q => ({
        ...q,
        load: debounce((options) => this._load(q.name, options), 200, false)
      }));

      // autoload, if allowed
      _.map(this._queries, ({name, autoLoad}) => autoLoad && this.load(name));
    },

    /**
     * Loads data from LoopBack API. Receives the name of the query to be used, the
     * aditional parameters to pass to filter function (if existent) and a options
     * object:
     *
     * ```
     * {
     *   resetParams: false, // When true, previous parameters will be replaced.
     *                       // When false (default), they will be merged.
     *
     *   append: false       // (used only with 'array' transform function)
     *                       // When true, new data will be appended to the old data.
     *                       // When false (default), new data will replace old data.
     *
     *   id: 'id'            // (used only with 'object' transform function)
     *                       // The name of id field to be used as key

     *   reset: false        // (used only with 'object' transform function)
     *                       // When true, the new data will replace old data.
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

      cfg.load(options);
    },

    _load(name, options) {
      const cfg = this._queries[name];

      const filter = typeof cfg.filter === 'function' ?
        cfg.filter(cfg.params) :
        cfg.filter;

      if (filter === false) {
        return;
      }

      const url = DataLoader._buildUrl(cfg.endpoint, filter);

      const status = cfg.name + '_status';
      this._data[status] = 'loading';
      this.forceUpdate();

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(response.statusText);
          return response.json();
        })
        .then(json => {
          this._data[cfg.name] = cfg.transform(
            json,
            this._data[cfg.name],
            filter,
            cfg.params,
            options);
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
  };

  /**
   * Create the methods of inner component directly on wrapper
   */
  const { extendMethods = [] } = options;
  extendMethods.forEach(methodName => {
    spec[methodName] = function (...args) {
      return this.refs.component[methodName](...args);
    };
  });

  /**
   * The wrapper component that will manage the data fetching. It is the return
   * value of the `createDataLoader` function and the value of `dataloader`
   * property of wrapped component.
   */
  const DataLoader = React.createClass(spec);

  return DataLoader;
}
