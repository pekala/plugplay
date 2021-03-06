# plugplay
<img align="right" src="./logo.jpg">

Plug-and-play solution for multiplayer games using WebSockets.

## Server
Server component is a node application responsible for managing global game state and WebSocket connections. It's
basically a Redux application running on the server.

### Example
The most basic, noop example:
```javascript
const plugplay = require('plugplay/server')

const dataReducer = (state, action) => {
    //...modify `state.data` based on action and return it
};
const mapStateToClientProps = (state, clientInfo) => {
    // construct and return properties object recieved by each client
};
const plugins = [/** initialized server plugins **/]

plugplay({ dataReducer, mapStateToClientProps, plugins })
```

### API
The server component exposes one function as a default export. Calling the function starts the server and returns a
dispatch function that can be used to dispatch actions to the reducers.
```javascript
plugplay(options: OptionsObject) => dispatch: (action: Object) => any
```
The `OptionsObject` has the following shape:
```javascript
OptionsObject: {
    dataReducer: (state: Object, action: Object) => nextGameState: any,
    mapStateToClientProps: (state: Object, clientInfo: Object) => clientProps: any,
    plugins: Object[],
    port: number
}
```

#### `dataReducer`
Function used to change the state of the game in response to actions occuring. The function is called every
time an action is dispatched, with the full game state and the action as arguments. The reducer should
return value that will be saved as `state.data` (which is the subtree designated for custom part of the
game state).
*Default value:* `state => (state.data || {})`

#### `mapStateToClientProps`
Function used to construct property objects sent to each connected client. The function is called every time after
the `dataReducer` produces new game state, with the full game state and `clientInfo` object as properties. By default,
`clientInfo` object has only `socketId` property, but it can be extended using plugins. The `clientInfo` can be used
to provide each client with customized properties that reflect the state of the game from the client perspective.
*Default value:* `state => state`

#### `plugins`
Plugins array provides a way of extending the default `pluginplay` functionality using plugins. The array expects
a list of initialized plugins, in an order that matters (see plugin's readme for specific requirements). See "Plugins"
section for information on their API.
*Default value:* `[]`

#### `port`
The port on which the application should listen for WebSocket connections
*Default value:* `3000`

## Client
The client component is a browser module responsible for connecting to server component.

### Example
```javascript
const plugplay = require('plugplay/client')
const onPropsUpdated = props => {
    // perform view updates based on changes in the client props
}
const actions = plugplay({
    onPropsUpdated,
    serverUrl: 'localhost:3000',
    plugins: [/** initialized client plugins **/]
})

actions.default('some action', 10) // triggers a reducer run on the server

```

### API
The client component exposes one function as a default export. Calling the function connects the client to the
server and starts listening for props changes. It returns the actions object with methods that can be used to
send information back to the server.

```javascript
plugplay(options: OptionsObject) => actions: ActionsObject
```
The `OptionsObject` has the following shape:
```javascript
OptionsObject: {
    onPropsUpdated: (props: Object) => void
    serverUrl: string,
    plugins: Object[],
}
```

#### `onPropsUpdated`
Function that can be used to update the view the reflect the new state of the game. The function is called every
time new client properties are recieved from the server, with the properties object as arguments. The return value is ignored.
*Default value:* `() => {}` *(noop)*

#### `serverUrl`
The URL to the running server `plugplay` component
*Required*

#### `plugins`
Plugins array provides a way of extending the default `pluginplay` functionality using plugins. The array expects
a list of initialized plugins, in an order that matters (see plugin's readme for specific requirements). See "Plugins"
section for information on their API.
*Default value:* `[]`

The `ActionsObject` contains action creator methods, and has the following shape by default (but can be extended by plugins):
```javascript
ActionsObject: {
    default: (type: string, data: any) => void
}
```
#### `default` action
Can be used to send a generic client action to the server. It will trigger server-side reducer with an action of shape:
```javascript
{
    type: 'USER_ACTION',
    payload: {
        socketId: string,
        ... // other props from plugins
        type: string, // type provided to action creator
        data: any // data provided to action creator
    }
}
```

## Plugins

You can extend the functionality provided by plugplay using plugins. Plugins can do one or more of these things:
- modify a subtree of the state, named after the plugin's name
- dispatch actions to the state, namespaced by the plugin's name
- decorate the payload of actions dispatched by other plugins or plugplay's core
- decorate the `clientInfo` object provided to `mapStateToClientProps` function
- extend action creators object on the client
- any other side effects on both server and client (e.g. persistance of data)

### Existing plugins
See documentation for each to learn how to use them:

 - [players](plugins/players) - adds a notion of players
 - [rooms](plugins/rooms) - adds an ability to create rooms, which players can join

### Creating plugins
The following only concerns plugins developers, and is not required to know to make games with `plugplay`.
#### Server API
Server-side, plugins expose a factory function, which can be used to customize plugin's behaviour using options.
The factory function returns an instance of the plugin, which should passed to `plugplay` using `plugins`
array in options.

```javascript
pluginFactory(options: Object) => pluginInstance: PluginInstanceObject
```
```javascript
PluginInstanceObject: {
    name: string,
    middleware: (store: Object) => (next: () => void) => (action: Object) => void,
    reducer: (state: Object, action: Object) => nextState: Object,
    addClientOptions (state: Object, clientInfo: Object) => decoratedClientInfo: Object,
}
```