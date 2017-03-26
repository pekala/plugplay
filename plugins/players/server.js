const getSillyName = require('sillyname')

function getSocketsForPlayer (state, playerId) {
  return Object
    .keys(state.players.connections)
    .filter(socketId => state.players.connections[socketId] === playerId)
}

function getPlayerForSocket (state, socketId) {
  return state.players.connections[socketId]
}

const middleware = store => next => action => {
  const state = store.getState()

  if (getPlayerForSocket(state, action.payload.socketId)) {
    next(Object.assign({}, action, {
      payload: Object.assign({}, action.payload, {
        playerId: getPlayerForSocket(state, action.payload.socketId)
      })
    }))
  } else {
    next(action)
  }

  if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'register player') {
    const playerId = action.payload.data[0]

    if (state.players.ids.indexOf(playerId) === -1) {
      store.dispatch({
        type: 'players/JOINED',
        payload: {
          socketId: action.payload.socketId,
          playerId
        }
      })
    } else {
      store.dispatch({
        type: 'players/RECONNECTED',
        payload: {
          socketId: action.payload.socketId,
          playerId
        }
      })
    }
  }

  if (action.type === '@@_SOCKET_EVENT' && action.payload.event === 'disconnect') {
    const playerId = getPlayerForSocket(state, action.payload.socketId)
    store.dispatch({
      type: 'players/DISCONNECTED',
      payload: {
        socketId: action.payload.socketId,
        playerId
      }
    })
    setTimeout(() => {
      if (getSocketsForPlayer(state, playerId).length === 0) {
        store.dispatch({
          type: 'players/LEFT',
          payload: { playerId }
        })
      }
    }, 5000)
  }

  if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'players:changeName') {
    const playerId = getPlayerForSocket(state, action.payload.socketId)
    const newName = action.payload.data[0]
    store.dispatch({
      type: 'players/CHANGE_NAME',
      payload: { playerId, newName }
    })
  }
}

const reducer = (state = { ids: [], connections: {}, byId: {} }, action) => {
  switch (action.type) {
    case 'players/JOINED': {
      const playerId = action.payload.playerId
      const ids = [...state.ids, playerId]
      const connections = Object.assign({}, state.connections, {
        [action.payload.socketId]: playerId
      })
      const byId = Object.assign({}, state.byId, {
        [playerId]: Object.assign({}, state.byId[playerId], { name: getSillyName() })
      })
      return Object.assign({}, state, { ids, connections, byId })
    }
    case 'players/LEFT': {
      const playerId = action.payload.playerId
      const ids = state.ids.filter(id => id !== playerId)
      const byId = Object.assign({}, state.byId, {
        [playerId]: undefined
      })
      return Object.assign({}, state, { ids, byId })
    }
    case 'players/DISCONNECTED': {
      const connections = Object.assign({}, state.connections, {
        [action.payload.socketId]: undefined
      })
      return Object.assign({}, state, { connections })
    }
    case 'players/RECONNECTED': {
      const connections = Object.assign({}, state.connections, {
        [action.payload.socketId]: action.payload.playerId
      })
      return Object.assign({}, state, { connections })
    }
    case 'players/CHANGE_NAME': {
      const playerId = action.payload.playerId
      const byId = Object.assign({}, state.byId, {
        [playerId]: Object.assign({}, state.byId[playerId], { name: action.payload.newName })
      })
      return Object.assign({}, state, { byId })
    }
    default:
      return state
  }
}

const addClientOptions = (state, options) => {
  return Object.assign({}, options, {
    playerId: getPlayerForSocket(state, options.socketId)
  })
}

module.exports = function init () {
  return { name: 'players', middleware, reducer, addClientOptions }
}
