const path = require('path');
module.exports = {
  mode: 'production',
  output: {
    filename: 'main.min.js',
    path: path.resolve(__dirname, 'dist', 'app'),
  },
}
