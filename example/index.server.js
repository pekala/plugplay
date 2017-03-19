const gamegine = require('../server')
const playersPluginFactory = require('../plugins/players/server')
const roomsPluginFactory = require('../plugins/rooms/server')

const playersPlugin = playersPluginFactory()
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
const emptyBoard = Array(9).fill('')
const symbols = ['X', 'O']
const roomsPlugin = roomsPluginFactory({
  minPlayers: 2,
  maxPlayers: 2,
  roomReducer: (state, action) => {
    if (!state.isReady) {
      return state.data
    }

    if (!state.data || (action.type === 'players/ACTION' && action.payload.type === 'rematch')) {
      return {
        board: emptyBoard,
        currentPlayerId: state.players[Math.floor(Math.random() * 2)],
        playersSymbols: state.players.reduce((playersSymbols, playerId, index) => Object.assign(playersSymbols, { [playerId]: symbols[index] }), {})
      }
    }

    if (action.type === 'players/ACTION' && action.payload.type === 'cell select') {
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
})

const gameReducer = state => (state.game || {})
const mapStateToProps = (state, socketId) => {
  const playerId = playersPlugin.getPlayerForSocket(state, socketId)
  const roomId = roomsPlugin.getRoomForPlayer(state, playerId)
  const room = state.rooms.byId[roomId]
  if (roomId && room.data) {
    return Object.assign({}, room, {
      myTurn: room.data.currentPlayerId === playerId,
      mySymbol: room.data.playersSymbols[playerId],
      hasWon: room.data.winner === playerId
    })
  }
  if (roomId) {
    return room
  }
  return {
    players: state.players,
    rooms: state.rooms,
    playerId,
    roomId
  }
}

gamegine(gameReducer, mapStateToProps, [playersPlugin, roomsPlugin])
