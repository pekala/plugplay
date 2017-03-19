function register (socket) {
  let playerId = window.localStorage.getItem('playerId') || Date.now()
  window.localStorage.setItem('playerId', playerId)
  socket.on('connect', () => {
    socket.emit('register player', playerId)
  })
}

function main () {
  return { register }
}

module.exports = main
