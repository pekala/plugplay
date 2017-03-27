const redux = require('redux')
const express = require('express')
const socketio = require('socket.io')
const debug = require('debug')('plugplay')

const removeInternalActionsMiddleware = store => next => action => {
  if (action.type.indexOf('@@') !== 0) {
    next(action)
  }
}

const clientActionMiddleware = store => next => action => {
  if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'player action') {
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
  const server = app.listen(port, () => debug(`Started the server on port ${port}`))
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

  const store = redux.createStore(
    reducer,
    redux.applyMiddleware(
      clientActionMiddleware,
      ...plugins.map(plugin => plugin.middleware),
      removeInternalActionsMiddleware
    )
  )

  io.on('connection', socket => {
    debug(`Socket connection opened id:${socket.id}`)
    store.dispatch({
      type: '@@_SOCKET_EVENT',
      payload: {
        socketId: socket.id,
        event: 'connect'
      }
    })
    socket.on('disconnect', () => {
      debug(`Socket connection closed id:${socket.id}`)
      store.dispatch({
        type: '@@_SOCKET_EVENT',
        payload: {
          socketId: socket.id,
          event: 'disconnect'
        }
      })
    })
    socket.use(([event, ...data], next) => {
      debug(`Socket data recevied id:${socket.id} event:${event} data:%o`, data)
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

      const props = mapStateToClientProps(state, finalClientOptions)
      io.sockets.connected[socketId].emit('data sync', props)
      debug(`Props sent to socket ${socketId} data: %o`, props)
    })
  })

  return store.dispatch.bind(store)
}

module.exports = main
