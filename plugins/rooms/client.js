function main (socket) {
  function create () {
    socket.emit('create room')
  }

  function join (roomId) {
    socket.emit('join room', roomId)
  }

  function leave () {
    socket.emit('leave room')
  }

  return {
    name: 'rooms',
    actions: { create, join, leave }
  }
}

module.exports = () => main
