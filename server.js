const redux = require('redux')
const express = require('express')
const socketio = require('socket.io')

const removeInternalActionsMiddleware = store => next => action => {
  if (action.type.indexOf('@@') !== 0) {
    next(action)
  }
}

const clientActionMiddleware = store => next => action => {
  if (action.type === '@@_ SOCKET_DATA' && action.payload.event === 'player action') {
    next({
      type: 'USER_ACTION',
      payload: {
        socketId: action.payload.socketId,
        type: action.payload.data[0].type,
        data: action.payload.data[0].data
      }
    })
  } else {
    next(action)
  }
}

function main ({
  dataReducer = state => (state.data || {}),
  mapStateToClientProps = state => state,
  plugins = [],
  port = 3000
}) {
  const app = express()
  const server = app.listen(port, () => console.log(`Listening on port ${port}`))
  const io = socketio(server)

  const reducer = (state = {}, action) => {
    const baseState = Object.assign({}, state, {
      data: dataReducer(state, action)
    })

    return plugins.reduce((state, plugin) => {
      if (!plugin.reducer) {
        return state
      }
      return Object.assign(state, {
        [plugin.name]: plugin.reducer(state[plugin.name], action)
      })
    }, baseState)
  }

  const store = redux.createStore(reducer, redux.applyMiddleware(clientActionMiddleware, ...plugins.map(plugin => plugin.middleware), removeInternalActionsMiddleware))

  io.on('connection', socket => {
    store.dispatch({
      type: '@@_SOCKET_EVENT',
      payload: {
        socketId: socket.id,
        event: 'connect'
      }
    })
    socket.on('disconnect', () => {
      store.dispatch({
        type: '@@_SOCKET_EVENT',
        payload: {
          socketId: socket.id,
          event: 'disconnect'
        }
      })
    })
    socket.use(([event, ...data], next) => {
      store.dispatch({
        type: '@@_SOCKET_DATA',
        payload: {
          socketId: socket.id,
          event,
          data
        }
      })
      return next()
    })
  })

  store.subscribe(() => {
    Object.keys(io.sockets.connected).forEach(socketId => {
      const state = store.getState()
      const finalClientOptions = plugins
        .map(plugin => plugin.addClientOptions)
        .reduce((options, addClientOptions) => addClientOptions(state, options), { socketId })

      io.sockets.connected[socketId].emit('data sync', mapStateToClientProps(state, finalClientOptions))
    })
  })
}

module.exports = main
