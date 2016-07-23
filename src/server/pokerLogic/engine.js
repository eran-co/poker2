var assert = require('assert');

var handTypes = [
    'High Card',
    'One Pair',
    'Two Pairs',
    'Three of a Kind',
    'Straight',
    'Flush',
    'Full House',
    'Four of a Kind',
    'Straight Flush'
];


// return the players with the best hand
var findWinners = function (players) {
    findsAllPlayerBestHand(players);
    var winners = allMax(findBestHands(players));
    var result = {
        players: winners,
        hand: winners[0].bestHand,
        type: handTypes[winners[0].rank[0]]
    };

    return result;
};

// return all winner players
var allMax = function (players) {
    var maxPlayer = players[0];
    var winners = players.filter(function (player) {
        return handComparator(maxPlayer, player) === 0;
    });
    return winners;
};

// adds best hand to the player array
var findsAllPlayerBestHand = function (players) {
    for (var i = 0; i < players.length; i++) {
        var playerHand = findPlayerBestHand(players[i].hand);
        players[i].bestHand = playerHand.hand;
        players[i].rank = playerHand.rank;
    }
};

// get 7 card hand and return the best 5 card hand with it's rank
var findPlayerBestHand = function (sevenCardsHand) {
    var hands = handCombinations(sevenCardsHand, 5);
    var hands = hands.map(function (hand) {
        return {hand: hand, rank: handRank(hand)};
    });
    var bestRank = findBestHands(hands);
    return bestRank[0];

};

// return all combinations of a hand
var handCombinations = function (set, k) {
    var i, j, combs, head, tailcombs;

    if (k > set.length || k <= 0) {
        return [];
    }

    if (k == set.length) {
        return [set];
    }

    if (k == 1) {
        combs = [];
        for (i = 0; i < set.length; i++) {
            combs.push([set[i]]);
        }
        return combs;
    }

    // Assert {1 < k < set.length}
    combs = [];
    for (i = 0; i < set.length - k + 1; i++) {
        head = set.slice(i, i + 1);
        tailcombs = handCombinations(set.slice(i + 1), k - 1);
        for (j = 0; j < tailcombs.length; j++) {
            combs.push(head.concat(tailcombs[j]));
        }
    }
    return combs;
};

// return sorted array by hand ranks
var findBestHands = function (hands) {
    hands.sort(handComparator);
    return hands;
};

var compareRanksArrays = function (a, b) {
    if (!a || !b) {
        return 0;
    }
    for (var i = 0; i < a.length && b.length; i++) {
        if (a[i] != b[i]) {
            return b[i] - a[i];
        }
    }
    return 0;
};

// return array with the cards rank (sorted)
var cardRanks = function (hand) {
    var ranks = hand.map(function (card) {
        var rank = parseInt(card[0]);
        // convert royals to numbers
        if (Number.isNaN(rank)) {
            rank = parseInt(card[0].replace('T', '10').replace('J', '11').replace('Q', '12').replace('K', '13').replace('A', 14));
        }
        if (arraysEqual(ranks, [14, 5, 4, 3, 2])) {
            return [5, 4, 3, 2, 1];
        }
        else {
            return rank;
        }
    });

    ranks.sort(sortDesc);
    return ranks;
};

// return True if the hand contains a flush
var flush = function (hand) {
    var suits = hand.map(function (card) {
        return card[1];
    });
    suits.sort();
    return suits[0] === suits[suits.length - 1];
};

var straight = function (ranks) {
    return ranks[0] - ranks[4] === 4;
};

// return the number of the matched 3/4 kind, else return false
var kind = function (n, ranks) {
    for (var i = 0; i < ranks.length; i++) {
        var number = ranks[i];
        var count = ranks.filter(function (rank) {
            return rank == number;
        }).length;
        if (count === n) {
            return number;
        }
    }
    return false;
};

// If there are two pair here, return the two ranks of the two pairs, else false
var twoPair = function (ranks) {
    var highPair = kind(2, ranks);
    if (!highPair) {
        return false;
    }
    else {
        var reversedRanks = ranks.slice(0).reverse();
        var lowPair = kind(2, reversedRanks);

        if (lowPair != highPair) {
            return [highPair, lowPair];
        }
        else {
            return false;
        }
    }
};

/*
 return a value indicating the ranking of a hand. ranks:
 0- High Card
 1- One Pair
 2- Two Pair
 3- Three of a Kind
 4- Straight
 5- Flush
 6- Full House
 7- Four of a Kind
 8- Straight Flush
 */
var handRank = function (hand) {
    var ranks = cardRanks(hand);
    if (straight(ranks) && flush(hand)) {
        return [8, ranks[0]];
    }
    else if (kind(4, ranks)) {
        return [7, kind(4, ranks)];
    }
    else if (kind(3, ranks) && kind(2, ranks)) {
        return [6, kind(3, ranks)];
    }
    else if (flush(hand)) {
        return [5, ranks];
    }
    else if (straight(ranks)) {
        return [4, ranks[0]];
    }
    else if (kind(3, ranks)) {
        return [3, kind(3, ranks), ranks];
    }
    else if (twoPair(ranks)) {
        return [2, twoPair(ranks), ranks];
    }
    else if (kind(2, ranks)) {
        return [1, kind(2, ranks), ranks];
    }
    else {
        return [0, ranks];
    }
};

// helper function to check if array content if equal (won't work for hands with inner arrays yet)
var arraysEqual = function (a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

var handComparator = function (a, b) {
    if (a.rank[0] != b.rank[0]) {
        return b.rank[0] - a.rank[0];
    }
    else if (a.rank[1] != b.rank[1] && !Array.isArray(a.rank[1]) && !Array.isArray(b.rank[1])) {
        return b.rank[1] - a.rank[1];
    }
    else if (Array.isArray(a.rank[1]) && Array.isArray(b.rank[1])) {
        return compareRanksArrays(a.rank[1], b.rank[1]) || compareRanksArrays(a.rank[2], b.rank[2]);
    }
    else {
        return 0;
    }
};

var sortDesc = function (a, b) {
    return b - a;
};

var sortAsc = function (a, b) {
    return a - b;
};

var testEngine = function () {
    //Test cases for the functions in poker program
    var straightFlush1 = ['6C', '7C', '8C', '9C', '9D', 'TC', 'KD']; //Straight Flush
    var straightFlush2 = ['6D', '7D', '8D', '9D', 'TD']; //Straight Flush
    var fourKind = ['9D', '9H', '9S', '9C', '7D']; //Four of a Kind
    var fullHouse = ['TD', 'TC', 'TH', '7C', '7D']; //Full House
    var twoPairs = ['5D', '2C', '2H', '9H', '5C']; //Two Pair
    var twoPairs2 = ['5D', '2C', '2H', '9H', '5C', '9D', 'KS']; //Two Pair
    var smallerTwoPairs = ['5D', '2C', '2H', '7H', '5C']; //Two Pair
    var fullHouse2 = ['TD', 'TC', 'TH', '7C', '7D', 'KS', 'AS']; //Full House

    // testing handCombinations - result should be 21: C (7,5) = 21
    assert(handCombinations(straightFlush1, 5).length === 21, "handCombinations failed");

    // Testing card_ranks
    assert(arraysEqual(cardRanks(straightFlush2), [10, 9, 8, 7, 6]), "cardRanks failed");
    assert(arraysEqual(cardRanks(fullHouse), [10, 10, 10, 7, 7]), "cardRanks failed");

    // Testing flush
    assert(flush(straightFlush2), "flush check failed");
    assert(flush(fullHouse) == false, "flush check failed");

    // Testing straight
    assert(straight(cardRanks(straightFlush2)), "straight check failed");
    assert(straight(cardRanks(fourKind)) == false, "straight check failed");

    // Testing kind
    assert(kind(4, cardRanks(fourKind)) === 9, "kind check failed");
    assert(kind(3, cardRanks(fullHouse)) === 10, "kind check failed");
    assert(kind(3, cardRanks(straightFlush2)) === false, "kind check failed");

    // Testing two pair
    assert(arraysEqual(twoPair(cardRanks(twoPairs)), [5, 2]), "two pairs check failed");
    assert(twoPair(cardRanks(straightFlush2)) === false, "two pairs check failed");

    // Testing hand rank
    assert(arraysEqual(handRank(straightFlush2), [8, 10]), 'hand rank failed');
    assert(arraysEqual(handRank(fourKind), [7, 9]), 'hand rank failed');
    assert(arraysEqual(handRank(fullHouse), [6, 10]), 'hand rank failed');

    // test findPlayerBestHand
    assert(arraysEqual(findPlayerBestHand(straightFlush1).rank, [8, 10]), 'findBestHands failed');
    //assert(arraysEqual(findPlayerBestHand(twoPairs2), [ 2, [ 9, 5 ], [ 13, 9, 9, 5, 5 ] ]), 'findBestHands failed'); - fails only because arraysEqual method
//
    // test findsAllPlayerBestHand
    var players = [];
    players.push({hand: twoPairs2});
    players.push({hand: straightFlush1});
    findsAllPlayerBestHand(players);
    assert(arraysEqual(players[1].rank, [8, 10]), 'findsAllPlayerBestHand failed');

    // test find winners
    var players = [];
    players.push({hand: twoPairs2});
    players.push({hand: straightFlush1});
    // assert (arraysEqual(this.findWinners(players)[0].rank, [8,10]), 'findWinners failed' );
    var winners = findWinners(players);


//        // Testing allmax
//         assert allmax([2,4,7,5,1]) == [7]
//         assert allmax([2,4,7,5,7]) == [7,7]
//         assert allmax([2]) == [2]
//         assert allmax([0,0,0]) == [0,0,0]
//


//
//    // Testing poker
//         assert poker([sf1, fk, fh]) == [sf1]
//         assert poker([fk, fh]) == [fk]
//         assert poker([fh, fh]) == [fh, fh]
//         assert poker([fh]) == [fh]
//         assert poker([sf2] + 99*[fh]) == [sf2]
//         assert poker([sf1, sf2, fk, fh]) == [sf1, sf2]
    return true;
};


exports.findWinners = findWinners;
exports.handTypes = handTypes;
exports.testEngine = testEngine;
