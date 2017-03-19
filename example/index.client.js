const yo = require('yo-yo')
const plugplay = require('../client')
const playersPlugin = require('../plugins/players/client')()
const roomsPlugin = require('../plugins/rooms/client')()

function Board ({ boardState, symbols, readOnly, onCellSelect }) {
  return yo`<div class="Board">
    ${boardState.map((cell, index) =>
      yo`<label for="board_${index}">
        ${cell === '' ? '' : symbols[cell]}
        <input type="radio" id="board_${index}" onchange=${() => onCellSelect(index)} name="board" ${!readOnly && cell === '' ? '' : 'disabled'} />
      </label>`
    )}
  </div>`
}

function Results ({ hasWon, onRematch }) {
  return yo`<div class="Results">
    ${hasWon ? 'You won!' : 'You lost!'}
    <button onclick=${onRematch}>Rematch!</button>
  </div>`
}

const onCellSelect = cellId => actions.playerAction('cell select', cellId)
const onRematch = cellId => actions.playerAction('rematch')

function Game (state) {
  if (state.roomId) {
    return yo`<div>
      Currently in ${state.roomId}
      <br> Players in room: ${state.players.length} <br>
      ${state.isFull ? 'Room is full' : ''}
      ${state.isReady ? 'Room is ready' : ''}
      <br>${state.isReady && state.myTurn ? 'Your turn!' : ''}
      ${state.isReady && !state.myTurn ? 'Opponent\'s turn' : ''}<br>
      ${state.mySymbol ? `Your symbol: ${state.mySymbol}` : ''}
      <br><button onclick=${roomsPlugin.actions.leave}>Leave room</button><br>

      ${state.data ? Board({
        boardState: state.data.board,
        symbols: state.data.playersSymbols,
        readOnly: !state.myTurn || state.winner,
        onCellSelect
      }) : ''}

      ${state.data && state.data.winner ? Results({ hasWon: state.hasWon, onRematch }) : ''}
    </div>`
  }
  return yo`<div>
    Rooms
    <ul>
      ${state.rooms.ids.map(roomId => yo`<li>
        ${roomId} (${state.rooms.byId[roomId].players.length} players)
        <button onclick=${() => roomsPlugin.actions.join(roomId)}>Join</button>
      </li>`)}
    </ul>
    <button onclick=${roomsPlugin.actions.create}>Create new room</button>
  </div>`
}

const el = Game({ rooms: { ids: [], byId: {} } })
document.body.appendChild(el)

const { actions } = plugplay(
  'https://plugplay-dusotaetuw.now.sh',
  [playersPlugin, roomsPlugin],
  state => yo.update(el, Game(state))
)
