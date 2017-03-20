const moniker = require('moniker')

function getRoomForPlayer (state, playerId) {
  return state.rooms.ids.find(id => state.rooms.byId[id].players.indexOf(playerId) > -1)
}

function getRoom (state, roomId) {
  return state.rooms.byId[roomId]
}

module.exports = function init ({ roomReducer = state => state, maxPlayers = Infinity, minPlayers = 0 }) {
  const middleware = store => next => action => {
    if (getRoomForPlayer(store.getState(), action.payload.playerId)) {
      next(Object.assign({}, action, {
        payload: Object.assign({}, action.payload, {
          roomId: getRoomForPlayer(store.getState(), action.payload.playerId)
        })
      }))
    } else {
      next(action)
    }

    if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'create room') {
      if (getRoomForPlayer(store.getState(), action.payload.playerId)) {
        return
      }
      store.dispatch({
        type: 'rooms/CREATE',
        payload: {
          roomId: moniker.choose(),
          playerId: action.payload.playerId
        }
      })
    }

    if (action.type === '@@_SOCKET_DATA' && action.payload.event === 'join room') {
      const state = store.getState()
      const roomId = action.payload.data[0]
      if (getRoomForPlayer(state, action.payload.playerId)) {
        return
      }
      if (getRoom(state, roomId).isFull) {
        return
      }
      store.dispatch({
        type: 'rooms/PLAYER_JOINED',
        payload: {
          roomId,
          playerId: action.payload.playerId
        }
      })
    }

    if (
      (action.type === '@@_SOCKET_DATA' && action.payload.event === 'leave room') ||
      (action.type === 'players/LEFT')
    ) {
      const state = store.getState()
      const roomId = getRoomForPlayer(state, action.payload.playerId)
      if (!roomId) {
        return
      }

      if (state.rooms.byId[roomId].players.length === 1) {
        store.dispatch({
          type: 'rooms/DESTROY',
          payload: { roomId }
        })
      } else {
        store.dispatch({
          type: 'rooms/PLAYER_LEFT',
          payload: {
            roomId,
            playerId: action.payload.playerId
          }
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
    const roomId = action.payload && action.payload.roomId
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
