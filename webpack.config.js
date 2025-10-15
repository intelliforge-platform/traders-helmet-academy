const path = require('path');

module.exports = {
  // Entry point - your main JavaScript file
  entry: './assets/js/main.js',

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist/js'),
    filename: 'main.min.js',
    clean: true // Cleans the output directory before each build
  },

  // Mode will be set by npm script (--mode production)
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  // Module rules for processing different file types
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[hash][ext][query]'
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]'
        }
      }
    ]
  },

  // Resolve configuration
  resolve: {
    extensions: ['.js', '.json']
  },

  // Development server configuration
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 9000,
  }
};