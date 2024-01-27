const path = require('path');
module.exports = {
    optimization: {
        minimize: false,
      },
      output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist', 'app', 'assets'),
      },
}
