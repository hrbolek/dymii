// A '.tsx' file enables JSX support in the TypeScript compiler, 
// for more information see the following page on the TypeScript wiki:
// https://github.com/Microsoft/TypeScript/wiki/JSX

var scriptItems = {
    'react': './src/client/_proxy/proxy_react.tsx',
    'prg': './src/client/app.tsx',
    'react-dom': './src/client/_proxy/proxy_reactDOM.tsx',
};

export function configureWebpack (expressApp) {

    var webpackMiddleware = require("webpack-dev-middleware");
    var webpack = require('webpack');

    expressApp.use(webpackMiddleware(
        webpack({
            context: __dirname + "",
            // webpack options
            // webpackMiddleware takes a Compiler object as first parameter
            // which is returned by webpack(...) without callback.

            entry: scriptItems,
            /*
            output: {
                path: path.resolve(__dirname, 'dist'),
                filename: '[name].js'
            },
            */
            //entry: "./app/views/test/b.jsx",
            output: {
                filename: '[name].js',
                path: "/script/"
                //path: path.resolve(__dirname, 'app/views/')
                // no real path is required, just pass "/"
                // but it will work with other paths too.
            },
            module: {
                loaders: [
                    {
                        test: /\.jsx?$/,
                        exclude: /node_modules/,
                        loader: 'babel-loader',
                        query: {
                            presets: ['es2015', 'react']
                        }
                    },
                    {
                        test: /\.tsx?$/,
                        loader: 'awesome-typescript-loader',
                        query: {
                            useBabel: true,
                            useCache: true,
                            babelOptions: {
                                presets : [ [ 'es2015', { modules: false } ], 'react' ],
                                //plugins: [ 'react-hot-loader/babel' ],
                            },
                        },
/*                        
loader: 'awesome-typescript-loader',
                        query: {
                            presets: ['es2015', 'react']
                        }
*/
                    }
                ]
            },
            resolve: {
                extensions: ['.js', '.jsx', '.tsx'],
            }
        }),
        {
            // publicPath is required, whereas all other options are optional

            noInfo: false,
            // display no info to console (only warnings and errors)

            quiet: false,
            // display nothing to the console

            lazy: true,
            // switch into lazy mode
            // that means no watching, but recompilation on every request

            watchOptions: {
                aggregateTimeout: 300,
                poll: true
            },
            // watch options (only lazy: false)

            publicPath: "/script/",
            // public path to bind the middleware to
            // use the same as in webpack

            index: "index.html",
            // The index path for web server, defaults to "index.html".
            // If falsy (but not undefined), the server will not respond to requests to the root URL.

            //headers: { "X-Custom-Header": "yes" },
            // custom headers

            //mimeTypes: { "text/html": ["phtml"] },
            // Add custom mime/extension mappings
            // https://github.com/broofa/node-mime#mimedefine
            // https://github.com/webpack/webpack-dev-middleware/pull/150

            stats: {
                colors: true
            },
            // options for formating the statistics

            reporter: null,
            // Provide a custom reporter to change the way how logs are shown.

            serverSideRender: false,
            // Turn off the server-side rendering mode. See Server-Side Rendering part for more info.
        }));

}

