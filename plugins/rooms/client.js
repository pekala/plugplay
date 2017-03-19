let socket

function register (providedSocket) {
  socket = providedSocket
}

function create () {
  socket.emit('create room')
}

function join (roomId) {
  socket.emit('join room', roomId)
}

function leave () {
  socket.emit('leave room')
}

function main () {
  return {
    register,
    actions: { create, join, leave }
  }
}

module.exports = main
