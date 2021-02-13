const path = require("path");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = env => {

    let mode = env === "production" ? "production" : "development";

    return [
        {
            mode: mode,
            entry: "./editor.jsx",
            target: "electron-renderer",
            devtool: "source-map",
            output: {
                filename: "editor.js",
                path: path.resolve("../dist")
            },
            // resolve: {
            //     extensions: ["", ".js", ".jsx"]
            // },
            module: {
                rules: [
                    {
                        test: /\.jsx$/,
                        exclude: /node_modules/,
                        use: {
                            loader: "babel-loader",
                            options: {
                                presets: ["@babel/preset-env", "@babel/preset-react"]
                            }
                        }
                    }
                ]
            },
            plugins: [
                new HTMLWebpackPlugin({
                    template: "./editor.html",
                    filename: "./editor.html"
                })
            ]
        },
        {
            mode: mode,
            entry: "./main.js",
            target: "electron-main",
            devtool: "source-map",
            output: {
                filename: "main.js",
                path: path.resolve("../dist")
            },
            plugins: [
                new CopyPlugin({
                    patterns: [
                        { from: "./*.css", to: "../dist" },
                        { from: "./*.json", to: "../dist" },
                        { from: "./node_modules/", to: "../dist/node_modules/" },
                    ]
                })
            ]
        }
    ];
}