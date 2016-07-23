var Game = require('../models/game').GameModel,
    gameStates = require('../models/game').states,
    Table = require('../models/table').TableModel,
    Player = require('../models/player').PlayerModel,
    Engine = require('./engine');
getDeck = require('./deck');


var PokerGame = function (gameId, cbError, cbAddPlayer, cbRemovePlayer, cbStartRound, cbAction, cbWinner) {

    var sortPlayers = function (players) {
        players.sort(function (a, b) {
            return a.seat - b.seat;
        });
    };

    var findNextPlayer = function (players, seat) {
        //TODO refactor!!!!
        var biggerSeats = players.filter(function (player) {
            return player.seat > seat && !player.folded;
        });

        if (biggerSeats.length > 0) {
            sortPlayers(biggerSeats);
            return biggerSeats[0];
        }
        else {
            var smallerSeats = players.filter(function (player) {
                return player.seat < seat && !player.folded;
            });
            sortPlayers(smallerSeats);
            return smallerSeats[0];
        }
    };

    this.addPlayer = function (user) {
        var that = this;
        Game.findById(gameId, function (err, game) {
            if (err) {
                console.log(err);
                cbError(err);
            }
            else {
                if (game.isPlayerSitting(user._id)) {
                    cbError('player already sit in table');
                }

                else {
                    var seat = game.findSeat();
                    var player = new Player({
                        seat: seat,
                        name: user.username,
                        balance: user.balance,
                        bet: 0,
                        imageUrl: user.imageUrl,
                        cards: [],
                        userId: user._id
                    });

                    game.players.push(player);
                    game.save(function (err) {
                        if (err) {
                            cbError(err);
                        }
                        else {
                            cbAddPlayer(player, gameId);
                            //TODO move to constant
                            var minNumberOfPlayers = 3;
                            if (!game.isPlaying && game.players.length >= minNumberOfPlayers) {
                                that.startRound();
                            }
                        }
                    });
                }
            }
        });
    };

    this.removePlayer = function (user) {
        Game.findById(gameId, function (err, game) {
            if (err) {
                cbError(err);
            }
            else {
                if (!game) {
                    cbError('game was not found');
                }
                for (var i = 0; i < game.players.length; i++) {
                    if (game.players[i].userId.id === user._id.id) {
                        var player = game.players[i];
                        user.updateBalance(player.balance);
                        //TODO handle error?
                        user.save();
                        var playerId = player.id;
                        player.remove();
                        game.save();
                        cbRemovePlayer(playerId, gameId);
                        return;
                    }
                }
                cbError('user not found');
            }
        });
    };

    this.startRound = function () {
        //TODO check for players to remove

        Game.findById(gameId, function (err, game) {
            if (err) {
                console.log(err);
                cbError(err);
            }
            else {
                // reset game properties
                //TODO get actual blinds from table
                var smallBlind = 50;
                var bigBlind = 100;
                game.pot = smallBlind + bigBlind;
                game.bet = bigBlind;
                game.state = gameStates.preFlop;
                game.flop = [];
                game.turn = "";
                game.river = "";
                game.deck = getDeck();

                //TODO remove players without money from the game (either mark as fold or call leave table callback)

                // reset player properties and draw players cards
                for (var i = 0; i < game.players.length; i++) {
                    var player = game.players[i];
                    player.bet = 0;
                    player.folded = false;
                    player.talked = false;
                    player.cards = [];
                    player.cards.push(game.deck.pop());
                    player.cards.push(game.deck.pop());
                }

                //TODO handle heads up game - see http://en.wikipedia.org/wiki/Betting_in_poker "When there are only two players"
                // set dealer, small and big blind, active player
                // if dealer is already selected, move the dealer to the next player
                if (game.dealer && !isNaN(game.dealer)) {
                    game.dealer = findNextPlayer(game.players, game.dealer).seat;
                }
                // select the first player
                else {
                    game.dealer = game.players[0].seat;
                }
                //update blinds
                var smallBlindPlayer = findNextPlayer(game.players, game.dealer);
                smallBlindPlayer.bet = smallBlind;
                smallBlindPlayer.balance -= smallBlind;
                game.smallBlind = smallBlindPlayer.seat;
                var bigBlindPlayer = findNextPlayer(game.players, game.smallBlind);
                bigBlindPlayer.bet = bigBlind;
                bigBlindPlayer.balance -= bigBlind;
                game.bigBlind = bigBlindPlayer.seat;
                game.activePlayer = findNextPlayer(game.players, game.bigBlind).seat;

                // populate deck
                game.deck = getDeck();

                // change game status to playing

                game.save(function (err) {
                    if (err) {
                        cbError(err);
                    }
                    else {
                        cbStartRound(game);
                    }
                });

            }
        });
    };

    this.handleAction = function (user, actionData) {
        Game.findById(gameId, function (err, game) {
            if (err) {
                console.log(err);
                cbError(err);
            }
            else {
                // check if it's the user turn
                var player = game.getPlayerByUserId(user.id);
                if (player.seat != game.activePlayer) {
                    cbError('player played out of turn!');
                    return;
                }

                // handle action (check constrains)
                switch (actionData.action) {
                    case "fold":
                        performFold(game, player);
                        break;
                    case "check":
                        performCheck(game, player);
                        break;
                    case "call":
                        performCall(game, player);
                        break;
                    case "raise":
                        performRaise(game, player, actionData.amount);
                        break;
                    default:
                        cbError('wrong action sent');
                }
            }
        });
    };

    var performFold = function (game, player) {
        player.folded = true;
        player.talked = true;
        checkGameStatus(game, player);
    };

    var performCheck = function (game, player) {

        // "check"
        if (player.bet === game.bet) {
            player.talked = true;
            checkGameStatus(game, player);
        }
        else {
            cbError("player can't check, must call or raise!");
        }
    };

    var performCall = function (game, player) {
        // verify player can call, TODO: if he can't, go all in and start a side pot
        var sumToCall = game.bet - player.bet;
        if (player.canCall(sumToCall)) {
            player.balance = player.balance - sumToCall;
            player.talked = true;
            player.bet = game.bet;
            game.pot += sumToCall;
        }
        else {
            game.pot += player.balance;
            player.talked = true;
            player.bet += player.balance;
            player.balance = 0;

            //TODO start side pot
        }

        checkGameStatus(game, player);

    };

    var performRaise = function (game, player, amount) {
        //TODO check/handle raise rules

        if (player.canRaise(game.bet, amount)) {
            player.talked = true;
            var raise = (amount - player.bet);
            player.balance = player.balance - raise;
            player.bet = amount;
            game.pot = game.pot + raise;
            game.bet = amount;
            checkGameStatus(game, player);
        }
        else {
            cbError("player can't raise!");
        }


    };

    var checkGameStatus = function (game, player) {
        if (game.isRoundEnded()) {
            endRound(game, player);
        }
        else {
            sendAction(game, player, false);
        }
    };

    var endRound = function (game, player) {

        // check for "default" winner - all other players folded
        var winner = game.findWinner();
        if (winner) {
            var win = {
                players: [{
                    id: winner.id,
                    seat: winner.seat
                }
                ]
            };
            handleWin(game, win);
        }
        else {
            // if ended round is the flop calculate winner by hand
            if (game.state === gameStates.river) {
                var remainingPlayers = game.findActivePlayers();
                //TODO add cards propery/function to game that return an array of all 5 cards (flop+turn+river)
                calculateWinner(game, game.getFullHand(), remainingPlayers);
            }
            else {
                startNewBetRound(game, player);
            }

        }
    };
    var calculateWinner = function (game, hand, remainingPlayers) {
        var players = remainingPlayers.map(function (player) {
            return {
                id: player.id,
                seat: player.seat,
                cards: player.cards,
                hand: hand.concat(player.cards)
            };
        });
        var engine = new Engine();
        var win = engine.findWinners(players);
        handleWin(game, win);
    };
    var handleWin = function (game, win) {
        var numOfWinners = win.players.length;
        var prize = game.pot / numOfWinners;

        for (var i = 0; i < win.players.length; i++) {
            game.players.id(win.players[i].id).balance += prize;
            win.players[i].balance = game.players.id(win.players[i].id).balance;
        }

        win.prize = prize;
        game.save(function (err) {
            if (err) {
                console.log(err);
                cbError(err);
            }
            else {
                cbWinner(game, win);
            }
        });
    };

    var startNewBetRound = function (game, player) {
        // reset player properties TODO refactor
        for (var i = 0; i < game.players.length; i++) {
            var player = game.players[i];
            if (!player.folded && player.balance) {
                player.talked = false;
                player.bet = 0;
            }
        }
        game.bet = 0;

        // set active player
        //game.activePlayer = findNextPlayer(game.players, game.dealer);

        switch (game.state) {
            case gameStates.preFlop:
                game.flop.push(game.deck.pop());
                game.flop.push(game.deck.pop());
                game.flop.push(game.deck.pop());
                game.state = gameStates.flop;
                break;
            case gameStates.flop:
                game.turn = game.deck.pop();
                game.state = gameStates.turn;
                break;
            case gameStates.turn:
                game.river = game.deck.pop();
                game.state = gameStates.river;
                break;
            default:
                cbError('wrong game state!');
                break;
        }
        sendAction(game, player, true);
    };

    var sendAction = function (game, player, isNewBetRound) {
        game.save(function (err) {
            if (err) {
                console.log(err);
                cbError(err);
            }
            else {
                cbAction(game, player, isNewBetRound);
            }
        });
    };

};

module.exports = PokerGame;


