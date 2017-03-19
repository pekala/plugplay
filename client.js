const io = require('socket.io-client')

function main (serverUrl, plugins, subscribe) {
  const socket = io(serverUrl)
  socket.on('data sync', state => subscribe(state))
  plugins.forEach(plugin => plugin.register(socket))

  function playerAction (type, data) {
    socket.emit('player action', { type, data })
  }

  return { actions: { playerAction } }
}

module.exports = main
