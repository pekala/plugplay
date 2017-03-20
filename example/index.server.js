const plugplay = require('../server')
const playersPluginFactory = require('../plugins/players/server')
const roomsPluginFactory = require('../plugins/rooms/server')

const getWinner = boardState => {
  const winningScenarios = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6],
    [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]
  ]
  const winningScenario = winningScenarios.find(scenario => {
    const values = scenario.map(index => boardState[index])
    return values.every(value => !!value && (value === values[0]))
  })
  return winningScenario && boardState[winningScenario[0]]
}

const getFreshBoard = players => {
  return {
    board: Array(9).fill(''),
    currentPlayerId: players[Math.floor(Math.random() * 2)],
    playersSymbols: players.reduce((playersSymbols, playerId, index) => Object.assign(playersSymbols, { [playerId]: ['X', 'O'][index] }), {})
  }
}

const roomReducer = (state, action) => {
  if (!state.isReady) {
    return state.data
  }

  if (!state.data || (action.type === 'USER_ACTION' && action.payload.type === 'rematch')) {
    return getFreshBoard(state.players)
  }

  if (action.type === 'USER_ACTION' && action.payload.type === 'cell select') {
    const nextBoard = [...state.data.board]
    nextBoard[action.payload.data] = action.payload.playerId

    return Object.assign({}, state.data, {
      board: nextBoard,
      winner: getWinner(nextBoard),
      currentPlayerId: state.players.find(playerId => playerId !== state.data.currentPlayerId)
    })
  }

  return state.data
}

const playersPlugin = playersPluginFactory()

const roomsPlugin = roomsPluginFactory({
  minPlayers: 2,
  maxPlayers: 2,
  roomReducer
})

const mapStateToClientProps = (state, { playerId, roomId }) => {
  const room = state.rooms.byId[roomId]

  if (roomId && room.data) {
    return {
      board: room.data.board,
      winner: room.data.winner,
      isMyTurn: room.data.currentPlayerId === playerId,
      mySymbol: room.data.playersSymbols[playerId],
      hasWon: room.data.winner === playerId,
      playersSymbols: room.data.playersSymbols,
      players: room.players,
      isReady: room.isReady,
      roomId
    }
  }

  if (roomId) {
    return {
      players: room.players,
      isReady: room.isReady,
      roomId
    }
  }

  return {
    rooms: state.rooms.ids.map(roomId => state.rooms.byId[roomId])
  }
}

plugplay({
  mapStateToClientProps,
  plugins: [playersPlugin, roomsPlugin]
})
