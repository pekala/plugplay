function main (socket) {
  let playerId = window.localStorage.getItem('playerId') || Date.now()
  window.localStorage.setItem('playerId', playerId)
  socket.on('connect', () => {
    socket.emit('register player', playerId)
  })
  function changeName (name) {
    socket.emit('players:changeName', name)
  }
  return { name: 'players', actions: { changeName } }
}

module.exports = () => main
