# react-loopback

A small library to connect [React](https://facebook.github.io/react/)
components to data in a [LoopBack](http://loopback.io) API without the need for
Flux, Redux, etc.

Inspired by Facebook's [Relay](https://facebook.github.io/relay/). The
motivation comes from their website:

> Queries live next to the views that rely on them, so you can easily reason
> about your app.

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
 queries: [
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

     autoLoad: true         // When true (default), query will be fetched as
                            // soon as the component is mounted
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
