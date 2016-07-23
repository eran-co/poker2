var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var rewire = require('rewire');
var Engine = require('./../pokerLogic/engine');
var innerFunctions = rewire('./../pokerLogic/engine');

describe('Poker engine', function() {
    it('expect engine to have a function findWinners', function() {
        expect(Engine.findWinners).be.function;
    });

    //TODO write findWinners full test suite?

    it('expect all inner engine tests to pass', function() {
        expect(Engine.testEngine()).be.true;

    });
});