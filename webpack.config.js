/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');

const urlDev = "https://localhost:3001/";
const urlProd = "https://www.contoso.com/";

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      taskpane: "./src/taskpane/index.jsx",
      commands: "./src/commands/commands.js"
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".html", ".js", ".jsx"]
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-react"]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane"]
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"]
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]"
          }
        ]
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(options.mode)
      })
    ],
    devServer: {
      server: {
        type: "https",
        options: await getHttpsOptions()
      },
      port: 3001,
      proxy: [{
        '/api': {
          target: 'https://127.0.0.1:8000',
          secure: false,
          changeOrigin: true,
          pathRewrite: { '^/api': '/api' },
          headers: {
            "Connection": "keep-alive"
          },
          onProxyReq: function(proxyReq, req, res) {
            // Add CORS headers
            proxyReq.setHeader('Origin', 'https://localhost:3001');
            // Add authorization if needed
            const token = req.headers.authorization;
            if (token) {
              proxyReq.setHeader('Authorization', token);
            }
            // Log proxy requests
            console.log('Proxying request:', {
              path: proxyReq.path,
              method: proxyReq.method,
              headers: proxyReq.getHeaders()
            });
          },
          onProxyRes: function(proxyRes, req, res) {
            // Log proxy response
            console.log('Proxy response:', {
              status: proxyRes.statusCode,
              headers: proxyRes.headers
            });
          },
          onError: function(err, req, res) {
            console.error('Proxy error:', err);
            res.writeHead(500, {
              'Content-Type': 'text/plain'
            });
            res.end('Proxy error: ' + err.message);
          }
        }
      }],
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": [
          "X-Requested-With",
          "Content-Type",
          "Authorization",
          "X-Office-Context",
          "Origin",
          "Accept"
        ].join(', '),
        "Access-Control-Allow-Credentials": "true"
      },
      historyApiFallback: true,
      hot: true,
      setupMiddlewares: function(middlewares, devServer) {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }

        // Add CORS preflight handler
        middlewares.unshift({
          name: 'cors-preflight',
          path: '/api/*',
          middleware: function(req, res, next) {
            if (req.method === 'OPTIONS') {
              res.writeHead(200, {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                "Access-Control-Allow-Headers": [
                  "X-Requested-With",
                  "Content-Type",
                  "Authorization",
                  "X-Office-Context",
                  "Origin",
                  "Accept"
                ].join(', '),
                "Access-Control-Allow-Credentials": "true"
              });
              res.end();
              return;
            }
            next();
          }
        });

        return middlewares;
      }
    }
  };

  return config;
};