const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const config = {
  devtool: 'eval-source-map',
  entry: __dirname + '/js/index.tsx',
  output:{
    path: path.resolve('./public/'),
    filename: 'bundle.js',
    publicPath: 'auto'
  },
  performance: {
    hints: false
  },
  // webpack-dev-server configuration
  devServer: {    // Can be omitted unless you are using 'docker'
    host: '0.0.0.0',    // This is where webpack-dev-server serves your bundle which is created in memory.
    // To use the in-memory bundle,
    // your <script> 'src' should point to the bundle
    // prefixed with the 'publicPath', e.g.:
    //   <script src='http://localhost:9001/assets/bundle.js'>
    //   </script>
    publicPath: '/public/',    // The local filesystem directory where static html files
    // should be placed.
    // Put your main static html page containing the <script> tag
    // here to enjoy 'live-reloading'
    // E.g., if 'contentBase' is '../views', you can
    // put 'index.html' in '../views/main/index.html', and
    // it will be available at the url:
    //   https://localhost:9001/main/index.html
    contentBase: path.resolve(__dirname, "./views"),    // 'Live-reloading' happens when you make changes to code
    // dependency pointed to by 'entry' parameter explained earlier.
    // To make live-reloading happen even when changes are made
    // to the static html pages in 'contentBase', add
    // 'watchContentBase'
    watchContentBase: true,
    compress: true,
    port: 8082
  },
  plugins: [new HtmlWebpackPlugin({
    favicon: "./css/favicon.ico",
    template: 'views/index.html'
  })],
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.css'],
    alias: {
      fs: 'pdfkit/js/virtual-fs.js'
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/i,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-react',
                     {
                       'runtime': 'automatic'
                     }],
                    '@babel/preset-env'],
          plugins: ['@babel/plugin-proposal-class-properties']
        }
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader',],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpe?g|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext][query]'
        }
      },
      {
        test: /\/assets\//,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext][query]'
        }
      },
      //{ enforce: 'post', test: /fontkit[/\\]index.js$/, loader: "transform-loader?brfs" },
      //{ enforce: 'post', test: /unicode-properties[/\\]index.js$/, loader: "transform-loader?brfs" },
      //{ enforce: 'post', test: /linebreak[/\\]src[/\\]linebreaker.js/, loader: "transform-loader?brfs" },
      { test: /src[/\\]assets/, loader: 'arraybuffer-loader'},
      { test: /\.afm$/, type: 'asset/source'}
    ]
  }
};

module.exports = config;
