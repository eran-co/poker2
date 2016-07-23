var express = require('express');
var router = express.Router();
var Users = require('../dataLayer/Users');
const JWT = require('jsonwebtoken');


router.get('/', (req, res) => {
    res.send('home page');
});

router.get('/login', (req, res) => {
    res.send('login');
});

router.post('/login', (req, res) => {
    Users.getUser(
        req.body.user,
        user => {
            if (user && user.password === req.body.password) {
                //TODO send token here
                const myToken = JWT.sign({user: req.body.user}, 'lalakuku');
                res.cookie('authorization', myToken, { maxAge: 900000, httpOnly: true });
                res.json(myToken);
            } else {
              res.status(401).send('authentication error')
            }
        },
        error => res.status(500).send(error)
    );
});

router.get('/user', (req, res) => {
    Users.getUser(
        'eran',
        user => res.send(user),
        error => res.status(500).send(error)
    )
});

module.exports = router;
