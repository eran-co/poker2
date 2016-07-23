/*jslint plusplus: true, node: true */

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./server/config/routes');
const expressJWT = require('express-jwt');
const cookieParser = require('cookie-parser');

var app = express();
app.set('port', process.env.PORT || 3000);

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(cookieParser());

app.use(expressJWT({
    secret: 'lalakuku',
    getToken: function fromHeaderOrQuerystring (req) {
        if (req.cookies.authorization) {
            return req.cookies.authorization;
        }
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.token) {
            return req.query.token;
        }
        return null;
    }
}).unless({path:['/login', '/']}));

app.use('/', routes);

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});