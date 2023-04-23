/*     
    The output from these steps are:
        Production bundle for your javascript
        Minified HTML pages 
        Minified CSS
        The rest of your static assets

    DEV-DEPENDENCIES (npm i --save-dev):
        "copy-webpack-plugin": "^7.0.0",
        "css-loader": "^5.0.1",
        "css-minimizer-webpack-plugin": "^1.1.5",
        "file-loader": "^6.2.0",
        "html-webpack-plugin": "^4.5.0",
        "mini-css-extract-plugin": "^1.3.3",
        "path": "^0.12.7",
        "style-loader": "^2.0.0",
        "webpack": "^5.10.3",
        "webpack-cli": "^4.2.0"
        
    DEPENDENCIES (npm i) if necessary
        @babel/polyfill 
*/

const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require("terser-webpack-plugin");



/***** Steps to copy and minify existing HTML files using html-webpack-plugin *****/
let indexConfig = new HtmlWebpackPlugin({
    template: path.resolve(__dirname + "/index.html"),
    file: 'index.html',
    inject: 'head',
    scriptLoading: 'defer',
    hash: true,
    minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: false,
        removeStyleLinkTypeAttributes: false,
        useShortDoctype: true
    }
})
/***** END bundling HTML *****/



/***** JS/CSS Bundle + Static Assets creation *****/
module.exports = {
    devServer: {
        client: {
          overlay: {
                errors: true,
                warnings: false
            }
        }
    },
    entry: path.resolve(__dirname + "/lib/js/map.js"),
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/
            },
            // load styles
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'style-loader',
                    'css-loader'
                ]
            },
            // load imgs
            {
                test: /\.(png|svg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'img/[name].[ext]'
                        }
                    }
                ]
            }
        ]
    },
    optimization: {
        minimize: true,
        minimizer: [
            new CssMinimizerPlugin(),
            new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            })
        ]
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'build')
    },
    plugins: [
        // CopyWebpackPlugin moves assets into the build folder
        // we use it here for the img & css folders b/c this set up assumes you aren't using 'require' or 'import' to load either asset
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: './lib/images',
                    to: 'lib/images',
                    toType: 'dir'
                },
                {
                    from: './lib/css',
                    to: 'lib/css',
                    toType: 'dir'
                },
                {
                    from: './lib/files',
                    to: 'lib/files',
                    toType: 'dir' 
                },
                {
                    from: './data/search_locations.js',
                    to: 'lib/data',
                    toType: 'dir'
                },
                {
                    from: './lib/js/vendor.min.js',
                    to: 'vendor.min.js',
                    toType: 'file'
                },
                {
                    from: './lib/js/dvrpc.draw.js',
                    to: 'dvrpc.draw.js',
                    toType: 'file'
                }
            ]
        }),
        indexConfig
    ]
}
/***** END bundle *****/