const getSillyName = require('sillyname')
const debug = require('debug')('plugplay-plugin-players')
const PLAYER_LEFT_TIMEOUT = 5000

function getSocketsForPlayer (state, playerId) {
  return Object
    .keys(state.players.connections)
    .filter(socketId => state.players.connections[socketId] === playerId)
}

function getPlayerForSocket (state, socketId) {
  return state.players.connections[socketId]
}

const middleware = store => next => action => {
  debug(`Calling the middleware with ${action}`)

  if (!action.payload) {
    return
  }

  const state = store.getState()

  if (getPlayerForSocket(state, action.payload.socketId)) {
    debug(`Decorating ${action} playload with playerId`)
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
    const socketId = action.payload.socketId

    if (state.players.ids.indexOf(playerId) === -1) {
      debug(`Connection from new client detected, player ${playerId} joining from socket ${socketId}`)
      store.dispatch({
        type: 'players/JOINED',
        payload: { socketId, playerId }
      })
    } else {
      debug(`Connection from known client detected, player ${playerId} reconnected from socket ${socketId}`)
      store.dispatch({
        type: 'players/RECONNECTED',
        payload: { socketId, playerId }
      })
    }
  }

  if (action.type === '@@_SOCKET_EVENT' && action.payload.event === 'disconnect') {
    const playerId = getPlayerForSocket(state, action.payload.socketId)
    const socketId = action.payload.socketId
    debug(`Player ${playerId} termianted connection on socket ${socketId}`)
    store.dispatch({
      type: 'players/DISCONNECTED',
      payload: { socketId, playerId }
    })
    setTimeout(() => {
      if (getSocketsForPlayer(state, playerId).length === 0) {
        debug(`Player ${playerId} had no connections for ${PLAYER_LEFT_TIMEOUT}ms, player left`)
        store.dispatch({
          type: 'players/LEFT',
          payload: { playerId }
        })
      }
    }, PLAYER_LEFT_TIMEOUT)
  }

  if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'players:changeName') {
    const playerId = getPlayerForSocket(state, action.payload.socketId)
    const newName = action.payload.data[0]
    debug(`Player ${playerId} requested to change the name to ${newName}`)
    store.dispatch({
      type: 'players/CHANGE_NAME',
      payload: { playerId, newName }
    })
  }
}

const reducer = (state = { ids: [], connections: {}, byId: {} }, action) => {
  debug('Reducer called with state:%o and action:%o', state, action)
  if (!action.payload) {
    return state
  }
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
