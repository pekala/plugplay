function main (socket) {
  let playerId = window.localStorage.getItem('playerId') || Date.now()
  window.localStorage.setItem('playerId', playerId)
  socket.on('connect', () => {
    socket.emit('register player', playerId)
  })
  return { name: 'players' }
}

module.exports = () => main
