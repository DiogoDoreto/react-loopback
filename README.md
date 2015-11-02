# react-loopback

[![npm package](https://img.shields.io/npm/v/react-loopback.svg?style=flat-square)](https://www.npmjs.org/package/react-loopback)
[![build status](https://img.shields.io/travis/DiogoDoreto/react-loopback/master.svg?style=flat-square)](https://travis-ci.org/DiogoDoreto/react-loopback)

A small library to connect [React](https://facebook.github.io/react/)
components to data in a [LoopBack](http://loopback.io) API without the need for
Flux, Redux, etc.

Inspired by Facebook's [Relay](https://facebook.github.io/relay/). The
motivation comes from their website:

> Queries live next to the views that rely on them, so you can easily reason
> about your app.

# Installation

Install using [npm](https://www.npmjs.com/):

```
$ npm install react-loopback
```

Note that this library depends on `fetch` and `Promise` being available globally.
I recommend using the following polyfills:

- [es6-promise](https://www.npmjs.com/package/es6-promise)
- [whatwg-fetch](https://www.npmjs.com/package/whatwg-fetch)

```
$ npm install es6-promise whatwg-fetch
```

Then on code:

```javascript
import {polyfill} from 'es6-promise';
polyfill();
import 'whatwg-fetch';
```

## Example

In your initialization script, set the LoopBack's base URL:

```javascript
import { config } from 'react-loopback';
config.set('baseUrl', 'http://localhost:3000/api/');
```

Then in `Todo.jsx`:

```javascript
import React, { PropTypes } from 'react';
import { createDataLoader } from 'react-loopback';

let Todos = React.createClass({
  propTypes: {
    todos: PropTypes.array
  },

  render() {
    const {todos} = this.props;

    return (
      <ul>
        {todos.map(todo => (
          <li>
            <input type="checkbox" checked={todo.done} />
            {todo.description}
          </li>
        ))}
      </ul>
    );
  }
});

Todos = createDataLoader(Todos, {
  queries: [{
    endpoint: 'todos',
    filter: {
      where: {archived: false}
    }
  }]
});

export default Todos;
```

Now your `Todos` component will load all your todos automatically from LoopBack
server. No need for Flux, Redux, etc.

## Docs

### config

```javascript
import { config } from 'react-loopback';
```

This is the global configuration manager for `react-loopback`. The current used
keys are:

- **baseUrl** → The base URL used to communicate with LoopBack REST API.
- **access_token** → When set, all further requests will contain the access_token.

#### config.get(key: string): any

Gets a previously set config.

#### config.set(key: string, value: any)

Sets a value in the specified key.

### createDataLoader

```javascript
import { createDataLoader } from 'react-loopback';
```

#### createDataLoader(Component: React.Component, options: object): DataLoader

A wrapper for a React component that manages the data fetching from LoopBack
server automatically. The wrapped component will receive the `DataLoader`
instance as `dataloader` property. And, for each query, two extra parameters
will be passed:

- `{name}` → The data received from LoopBack API
- `{name}_status` → A string that can have the following values:
  - `'loading'` → When new data is currently being loaded;
  - `'ok'` → When data was correctly loaded;
  - `'error: {error_message}'` → When an error occurs.

The options object:

```javascript
{
  extendMethods: [           // (Optional) Array of component methods that
    'method_a'               // should still be available on wrapper
  ],

  queries: [                 // (Required) Array of queries to be made
    {
      name: 'todo',          // (Optional: defaults to endpoint value)
                             // The name of the property passed to Component
                             // that will contain the fetched data

      endpoint: 'tasks',     // (Required) The endpoint on Loopback server

      filter: {              // (Optional / object or function)
        where: {done: false} // The filter object passed to Loopback API
      },

      filter: function (params) {       // function version of filter
        if (!params.page) return false;
        return {
          limit: 30,
          skip: 30 * params.page - 30
        };
      },

      params: {              // (Optional) Default parameters passed to
        page: 1              // filter function
      },

      autoLoad: true,        // When true (default), query will be fetched as
                             // soon as the component is mounted

      transform: 'array',    // Transform function that will receive new data
                             // and return the data passed to inner component.
                             // When equal to 'array' (default), the data is
                             // kept as an array of objects.
                             // When equal to 'object', the data is kept as a
                             // key-value object, where key is the id field.
                             // You can pass a custom function as well.

      transform: function (json, data, filter, params, options) {
                             // Parameters:
                             // json: The new data from LoopBack API
                             // data: The existent data
                             // filter: The filter object used to request data
                             // params: The params object passed to filter function
                             // options: The options object passed to load method
                             //
                             // Is recommended that you don't modify the data
                             // parameter. Instead create and return a new
                             // object.
      }
    },
    { ... }
  ]
}
```

### DataLoader

The wrapper component that will manage the data fetching. It is the return value
of the `createDataLoader` function and the value of `dataloader` property of
wrapped component.

#### DataLoader.load(name: string, param: object, options: object)

Loads data from LoopBack API. Receives the name of the query to be used, the
aditional parameters to pass to filter function (if existent) and a options
object:

```
{
  resetParams: false, // When true, previous parameters will be replaced.
                      // When false (default), they will be merged.

  append: false       // When true, new data will be appended to the old data.
                      // When false (default), new data will replace old data.
}
```
