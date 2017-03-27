const moniker = require('moniker')
const debug = require('debug')('plugplay-plugin-rooms')

function getRoomForPlayer (state, playerId) {
  return state.rooms.ids.find(id => state.rooms.byId[id].players.indexOf(playerId) > -1)
}

function getRoom (state, roomId) {
  return state.rooms.byId[roomId]
}

module.exports = function init ({ roomReducer = state => state, maxPlayers = Infinity, minPlayers = 0 }) {
  const middleware = store => next => action => {
    if (!action.payload) {
      return
    }

    if (getRoomForPlayer(store.getState(), action.payload.playerId)) {
      debug(`Decorating ${action} playload with roomId`)
      next(Object.assign({}, action, {
        payload: Object.assign({}, action.payload, {
          roomId: getRoomForPlayer(store.getState(), action.payload.playerId)
        })
      }))
    } else {
      next(action)
    }

    if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'create room') {
      const playerId = action.payload.playerId
      if (getRoomForPlayer(store.getState(), playerId)) {
        debug(`Player ${playerId} tried to create a room, but is already in one, ignoring`)
        return
      }
      const roomId = moniker.choose()
      debug(`Player ${playerId} created a new room (roomId will be ${roomId})`)
      store.dispatch({
        type: 'rooms/CREATE',
        payload: { roomId, playerId }
      })
    }

    if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'join room') {
      const state = store.getState()
      const roomId = action.payload.data[0]
      const playerId = action.payload.playerId
      if (getRoomForPlayer(state, playerId)) {
        debug(`Player ${playerId} tried to join ${roomId}, but is already in one, ignoring`)
        return
      }
      if (getRoom(state, roomId).isFull) {
        debug(`Player ${playerId} tried to join ${roomId}, but it is full, ignoring`)
        return
      }
      debug(`Player ${playerId} will join ${roomId}`)
      store.dispatch({
        type: 'rooms/PLAYER_JOINED',
        payload: { roomId, playerId }
      })
    }

    if (
      (action.type === '@@_SOCKET_DATA' && action.payload.event === 'leave room') ||
      (action.type === 'players/LEFT')
    ) {
      const playerId = action.payload.playerId
      const state = store.getState()
      const roomId = getRoomForPlayer(state, playerId)
      if (!roomId) {
        return
      }

      if (state.rooms.byId[roomId].players.length === 1) {
        debug(`The last player (${playerId}) has left ${roomId}, closing the room`)
        store.dispatch({
          type: 'rooms/DESTROY',
          payload: { roomId, playerId }
        })
      } else {
        debug(`The last player ${playerId} has left ${roomId}, closing the room`)
        store.dispatch({
          type: 'rooms/PLAYER_LEFT',
          payload: { roomId, playerId }
        })
      }
    }
  }

  const updateState = (state, action, roomState, roomId) => {
    const nextRoomState = Object.assign({}, state.byId[roomId], roomState)
    const data = roomReducer(nextRoomState, action, roomId)
    const byId = Object.assign({}, state.byId, {
      [roomId]: Object.assign(nextRoomState, { data, roomId })
    })
    return Object.assign({}, state, { byId })
  }

  const reducer = (state = { ids: [], byId: {} }, action) => {
    debug('Reducer called with state:%o and action:%o', state, action)
    if (!action.payload) {
      return state
    }
    const roomId = action.payload.roomId
    switch (action.type) {
      case 'rooms/PLAYER_JOINED': {
        const players = [...state.byId[roomId].players, action.payload.playerId]
        const roomState = {
          players,
          isFull: players.length === maxPlayers,
          isReady: players.length >= minPlayers
        }
        return updateState(state, action, roomState, roomId)
      }
      case 'rooms/PLAYER_LEFT': {
        const players = state.byId[roomId].players.filter(playerId => playerId !== action.payload.playerId)
        const roomState = {
          players,
          isFull: players.length === maxPlayers,
          isReady: players.length >= minPlayers
        }
        return updateState(state, action, roomState, roomId)
      }
      case 'rooms/CREATE': {
        const ids = [...state.ids, roomId]
        const roomState = {
          players: [action.payload.playerId],
          isFull: maxPlayers <= 1,
          isReady: minPlayers <= 1
        }
        const stateWithIds = Object.assign({}, state, { ids })
        return updateState(stateWithIds, action, roomState, roomId)
      }
      case 'rooms/DESTROY': {
        const ids = state.ids.filter(id => id !== roomId)
        const byId = Object.assign({}, state.byId, {
          [roomId]: undefined
        })
        return Object.assign({}, state, { ids, byId })
      }
      default:
        if (roomId) {
          return updateState(state, action, state.byId[roomId], roomId)
        } else {
          return state
        }
    }
  }

  const addClientOptions = (state, options) => {
    return Object.assign({}, options, {
      roomId: getRoomForPlayer(state, options.playerId)
    })
  }

  return { name: 'rooms', middleware, reducer, addClientOptions }
}
