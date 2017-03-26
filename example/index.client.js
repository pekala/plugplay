const yo = require('yo-yo')
const plugplay = require('../client')
const playersPlugin = require('../plugins/players/client')()
const roomsPlugin = require('../plugins/rooms/client')()

function Board ({ props, symbols, readOnly, onCellSelect }) {
  return yo`<div class="Board">
    ${props.map((cell, index) =>
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

function Player (me) {
  return yo`<div class="Player">
    Me: <input type="text" id="playerName" value="${me.name}" />
    <button onclick=${() => actions.players.changeName(document.getElementById('playerName').value)}>Change name</button>
  </div>`
}

function Lobby (props) {
  return yo`<div class="Lobby">
    ${Player(props.me)}
    Rooms
    <ul>
      ${props.rooms.map(room => yo`<li>
        ${room.roomId} (${room.players.length} players)
        <button onclick=${() => actions.rooms.join(room.roomId)}>Join</button>
      </li>`)}
    </ul>
    <button onclick=${actions.rooms.create}>Create new room</button>
  </div>`
}

function Room (props) {
  return yo`<div class="Room">
    Currently in ${props.roomId}
    <br> Players in room: ${props.players.length} (${props.players.map(player => player.name).join(',')}) <br>
    ${props.isFull ? 'Room is full' : ''}
    ${props.isReady ? 'Room is ready' : ''}
    <br>${props.isReady && props.isMyTurn ? 'Your turn!' : ''}
    ${props.isReady && !props.isMyTurn ? 'Opponent\'s turn' : ''}<br>
    ${props.mySymbol ? `Your symbol: ${props.mySymbol}` : ''}
    <br><button onclick=${actions.rooms.leave}>Leave room</button><br>

    ${props.board ? Board({
      props: props.board,
      symbols: props.playersSymbols,
      readOnly: !props.isMyTurn || props.winner,
      onCellSelect
    }) : ''}

    ${props.winner ? Results({ hasWon: props.hasWon, onRematch }) : ''}
  </div>`
}

const onCellSelect = cellId => actions.default('cell select', cellId)
const onRematch = cellId => actions.default('rematch')

function Game (props = { rooms: [], me: {} }) {
  if (props.roomId) {
    return Room(props)
  }
  return Lobby(props)
}

const actions = plugplay({
  serverUrl: 'localhost:3000',
  plugins: [playersPlugin, roomsPlugin],
  onPropsUpdated: props => console.log(props) || yo.update(el, Game(props))
})

const el = Game()
document.body.appendChild(el)
