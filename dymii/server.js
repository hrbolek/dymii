"use strict";
exports.__esModule = true;
/// <reference path="src/client/app.tsx" />
/// <reference path="src/client/_proxy/proxy_reactDOM.tsx" />
//import * as http from 'http';
var express = require("express");
var server_config_webpack_1 = require("./server_config_webpack");
var app = express();
var options = {
    doctype: '<!DOCTYPE html>',
    beautify: true,
    transformViews: true,
    babel: {
        presets: [
            'react',
            'es2015',
        ]
    }
};
app.set('views', __dirname + '/src/server/views');
app.set('view engine', 'js');
app.engine('js', require('express-react-views').createEngine(options));
app.use(express.static('public'));
server_config_webpack_1.configureWebpack(app);
// respond with "hello world" when a GET request is made to the homepage
/*
app.get('/', function (req, res) {
    res.send('hello world')
})
*/
app.get('/', function (req, res) {
    var controller = require('./src/server/controllers/index');
    controller.index(req, res);
});
var port = process.env.port || 1337;
var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});
//# sourceMappingURL=server.js.map