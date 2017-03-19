const redux = require('redux')
const express = require('express')
const socketio = require('socket.io')

const removeInternalActions = store => next => action => {
  if (action.type.indexOf('@@') !== 0) {
    next(action)
  }
}

function main (gameReducer = state => (state.game || {}), mapStateToProps, plugins) {
  const app = express()
  const server = app.listen(3000, () => console.log('App listening on port 3000'))
  const io = socketio(server)

  const reducer = (state = {}, action) => {
    const baseState = Object.assign({}, state, {
      game: gameReducer(state, action)
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

  const store = redux.createStore(reducer, redux.applyMiddleware(...plugins.map(plugin => plugin.middleware), removeInternalActions))

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
      io.sockets.connected[socketId].emit('data sync', mapStateToProps(store.getState(), socketId))
    })
  })
}

module.exports = main
