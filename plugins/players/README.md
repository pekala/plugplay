# plugplay-plugin-players

Plugplay plugin for treating connections as players

## Example

```javascript
const plugplay = require('plugplay')
const playersPluginFactory = require('plugplay-plugin-players/server')
const playersPlugin = playersPluginFactory()

plugplay({ plugins: [playersPlugin] })
```