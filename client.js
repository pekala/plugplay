const io = require('socket.io-client')

function main ({
  serverUrl,
  plugins = [],
  onPropsUpdated = () => {}
}) {
  const socket = io(serverUrl)
  socket.on('data sync', props => onPropsUpdated(props))
  const actions = plugins.map(plugin => plugin(socket))

  function action (type, data) {
    socket.emit('player action', { type, data })
  }

  return actions.reduce((all, current) => Object.assign(all, { [current.name]: current.actions }), {
    default: action
  })
}

module.exports = main
