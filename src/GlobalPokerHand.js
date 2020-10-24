var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

import moment from 'moment-timezone';
import { CARDS, SUITS, HAND_VALUES, BETTING_TYPES, GAME_TYPES } from './PokerStars';

var GlobalPokerHand = function () {
    function GlobalPokerHand(handData) {
        _classCallCheck(this, GlobalPokerHand);

        this._handData = handData;

        this.handId = this.handData.startTime; // Using the global poker handId uuid overflows PT4 db column

        var timestamp = this.handData.startTime;

        // 2014/01/06 7:47:13 ET
        this.timePlayed = moment(timestamp).tz('America/New_York').format('YYYY/MM/DD H:m:s') + ' ET';

        this.tableName = this.handData.table.tableName;
        this.minBuyIn = 40; // Todo
        this.maxBuyIn = 100; // Todo
        this.maxSeats = this.handData.settings.capacity;

        this.gameType = GAME_TYPES[this.handData.settings.variant];
        this.betting = BETTING_TYPES[this.handData.settings.betStrategyType];

        this.cardsMap = {
            ACE: CARDS.ACE,
            TWO: CARDS.TWO,
            THREE: CARDS.THREE,
            FOUR: CARDS.FOUR,
            FIVE: CARDS.FIVE,
            SIX: CARDS.SIX,
            SEVEN: CARDS.SEVEN,
            EIGHT: CARDS.EIGHT,
            NINE: CARDS.NINE,
            TEN: CARDS.TEN,
            JACK: CARDS.JACK,
            QUEEN: CARDS.QUEEN,
            KING: CARDS.KING
        };

        this.suitsMap = {
            SPADES: SUITS.SPADES,
            CLUBS: SUITS.CLUBS,
            HEARTS: SUITS.HEARTS,
            DIAMONDS: SUITS.DIAMONDS
        };

        this.handTypeMap = {
            STRAIGHT: HAND_VALUES.STRAIGHT,
            PAIR: HAND_VALUES.PAIR,
            TWO_PAIRS: HAND_VALUES.TWO_PAIR
        };
    }

    _createClass(GlobalPokerHand, [{
        key: 'getAdditionalBlindsPosted',
        value: function getAdditionalBlindsPosted() {
            var _this = this;

            return this.handData.events.filter(function (event) {
                return event.action === 'ENTRY_BET' || event.action === 'DEAD_SMALL_BLIND' || event.action === 'DEAD_BIG_BLIND' || event.action === 'BIG_BLIND_PLUS_DEAD_SMALL_BLIND';
            }).map(function (event) {
                var type = '';

                if (event.amount.amount === _this.bigBlind.amount) {
                    type = 'big';
                } else if (event.amount.amount < _this.bigBlind.amount) {
                    type = 'small';
                } else {
                    type = 'small & big';
                }

                return {
                    playerName: _this.getPlayerNameById(event.playerId),
                    amount: event.amount.amount,
                    type: type
                };
            });
        }
    }, {
        key: 'convertCards',
        value: function convertCards(cards) {
            var _this2 = this;

            return cards.map(function (card) {
                return _this2.convertCard(card);
            }).join(' ');
        }

        // Converts a global poker hand to a poker stars hand. belongs in converter but im lazy

    }, {
        key: 'convertCard',
        value: function convertCard(card) {
            var number = this.cardsMap[card.rank];
            var suit = this.suitsMap[card.suit];

            return '' + number + suit;
        }

        /**
         *
         * @returns {Array}
         * [ { type: 'PlayerAction',
        time: 1515047425736,
        cards: [],
        action: 'CALL',
        amount: { type: 'BET', amount: 0.04 },
        timeout: false,
        playerId: 4531,
        balanceAfterAction: 2.07 },
         { type: 'PlayerAction',
           time: 1515047440390,
           cards: [],
           action: 'CALL',
           amount: { type: 'BET', amount: 0.02 },
           timeout: false,
           playerId: 1359767,
           balanceAfterAction: 4.76 },
         { type: 'PlayerAction',
           time: 1515047441110,
           cards: [],
           action: 'CHECK',
           amount: { type: 'BET', amount: 0 },
           timeout: false,
           playerId: 3699,
           playerName: 'mr_feek'
           balanceAfterAction: 9.5 } ]
         */

    }, {
        key: 'getActionsAfterFlopCardsDealt',
        value: function getActionsAfterFlopCardsDealt() {
            var events = this.handData.events;

            var flopCardsDealtIndex = events.findIndex(function (event) {
                return event.type === 'TableCardsDealt';
            });
            return events.slice(flopCardsDealtIndex + 1);
        }
    }, {
        key: 'getActionsAfterTurnCardDealt',
        value: function getActionsAfterTurnCardDealt() {
            var events = this.getActionsAfterFlopCardsDealt();
            var turnCardsDealtIndex = events.findIndex(function (event) {
                return event.type === 'TableCardsDealt';
            });
            return events.slice(turnCardsDealtIndex + 1);
        }
    }, {
        key: 'getActionsAfterRiverCardDealt',
        value: function getActionsAfterRiverCardDealt() {
            var events = this.getActionsAfterTurnCardDealt();
            var riverCardDealtIndex = events.findIndex(function (event) {
                return event.type === 'TableCardsDealt';
            });
            return events.slice(riverCardDealtIndex + 1);
        }
    }, {
        key: 'getPlayerNameById',
        value: function getPlayerNameById(playerId) {
            return this.handData.seats.find(function (seat) {
                return seat.playerId === playerId;
            }).name;
        }
    }, {
        key: 'parseHandEvents',
        value: function parseHandEvents(handActions) {
            var _this3 = this;

            var previousBet = this.bigBlind.amount;
            var totalBetAmount = 0;
            var raiseAmount = 0;

            return handActions.map(function (event) {
                var action = '';

                switch (event.action) {
                    case 'CALL':
                        action = 'calls $' + event.amount.amount;

                        if (event.balanceAfterAction <= 0) {
                            action += ' and is all-in';
                        }

                        event.action = action;
                        break;
                    case 'CHECK':
                        event.action = 'checks';
                        break;
                    case 'FOLD':
                        event.action = 'folds';
                        break;
                    case 'MUCK_CARDS':
                        event.action = 'mucks hand';
                        break;
                    case 'RAISE':
                        totalBetAmount = event.amount.amount;
                        raiseAmount = (totalBetAmount - previousBet).toFixed(2);
                        action = 'raises $' + raiseAmount + ' to $' + totalBetAmount;
                        previousBet = totalBetAmount;

                        if (event.balanceAfterAction <= 0) {
                            action += ' and is all-in';
                        }

                        event.action = action;
                        break;
                    case 'ENTRY_BET':
                        if (event.amount.amount === _this3.bigBlind.amount) {
                            action = 'posts big blind';
                        } else {
                            action = 'posts small blind';
                        }

                        break;
                    case 'BET':
                        totalBetAmount = event.amount.amount;
                        action = 'bets $' + totalBetAmount;
                        previousBet = totalBetAmount;

                        if (event.balanceAfterAction <= 0) {
                            action += ' and is all-in';
                        }

                        event.action = action;
                        break;
                    case 'TIME_BANK':
                        // Todo what does poker stars say when hand isn't shown at showdown?
                        event.action = 'UNKNOWN';
                        break;
                    default:
                        throw new Error('unknown action ' + event.action);
                }

                event.playerName = _this3.getPlayerNameById(event.playerId);
                return event;
            }).filter(function (event) {
                return event.action !== 'UNKNOWN';
            });
        }

        /**
         * @return Array { playerName: '', cards: 'Ah Th' }
         */

    }, {
        key: 'getPlayerHandType',
        value: function getPlayerHandType(playerId) {
            var event = this.handData.events.filter(function (e) {
                return e.type === 'PlayerBestHand';
            }).find(function (e) {
                return e.playerHand.playerId === playerId;
            });
            if (!event) {
                return 'hand';
            }
            return this.handTypeMap[event.handInfoCommon.handType];
        }
    }, {
        key: 'buttonSeatNumber',
        get: function get() {
            // Man this sucks but theres literally no other way to figure it out..
            var playerName = this.bigBlind.playerName;


            if (this.smallBlind.playerName) {
                playerName = this.smallBlind.playerName;
            }

            var blindIndex = this.players.findIndex(function (player) {
                return player.name === playerName;
            });
            if (blindIndex === 0) {
                // Go to end of array
                return this.players[this.players.length - 1].seatId;
            }

            var player = this.players[blindIndex - 1];

            if (!player) {
                // Sometimes there is no button
                return;
            }

            return player.seatId;
        }
    }, {
        key: 'smallBlind',
        get: function get() {
            var blindEvent = this.handData.events.find(function (event) {
                return event.action === 'SMALL_BLIND';
            });

            var playerName = '';

            if (blindEvent) {
                playerName = this.getPlayerNameById(blindEvent.playerId);
            }

            return {
                playerName: playerName,
                amount: this.handData.settings.smallBlind,
                type: 'small'
            };
        }
    }, {
        key: 'bigBlind',
        get: function get() {
            var blindEvent = this.handData.events.find(function (event) {
                return event.action === 'BIG_BLIND';
            });
            var playerName = '';

            if (blindEvent) {
                playerName = this.getPlayerNameById(blindEvent.playerId);
            }

            return {
                playerName: playerName,
                amount: this.handData.settings.bigBlind,
                type: 'big'
            };
        }
    }, {
        key: 'blindsPosted',
        get: function get() {
            return [this.smallBlind, this.bigBlind].concat(this.getAdditionalBlindsPosted());
        }
    }, {
        key: 'pots',
        get: function get() {
            var totalRake = this.handData.results.totalRake;

            // If there are no transfers, that means there was no small blind, and everyone folded. weird hand..
            var totalPot = this.handData.results.transfers ? this.handData.results.transfers.reduce(function (accumulator, transfer) {
                return accumulator + transfer.pot.potSize;
            }, 0).toFixed(2) : 0;

            var pots = [{
                description: 'Total pot $' + totalPot + '.'
            }];

            if (this.handData.results.transfers && this.handData.results.transfers.length > 1) {
                this.handData.results.transfers.forEach(function (transfer) {
                    pots.push({
                        description: transfer.pot.type.charAt(0) + transfer.pot.type.slice(1).toLowerCase() + ' pot $' + transfer.pot.potSize + '.'
                    });
                });
            }

            pots.push({
                description: '| Rake $' + totalRake
            });

            return pots;
        }
    }, {
        key: 'handData',
        get: function get() {
            return JSON.parse(JSON.stringify(this._handData));
        }

        /**
         *
         * @returns [] of Players. {
          "playerId":1359767,
          "initialBalance":4.8,
          "seatId":0,
          "name":"mr_feek"
        },
         {
           "playerId":3699,
           "initialBalance":9.54,
           "seatId":2,
           "name":"Player#3699"
         },
         {
           "playerId":4531,
           "initialBalance":2.11,
           "seatId":3,
           "name":"Player#4531"
         }
         *
         */

    }, {
        key: 'players',
        get: function get() {
            return this.handData.seats.map(function (seat) {
                // global poker does seats 0-5, pt4 expects 1-6
                seat.seatId++;

                return seat;
            });
        }
    }, {
        key: 'holeCards',
        get: function get() {
            var event = this.handData.events.find(function (e) {
                return e.type === 'PlayerCardsDealt' && e.cards[0].suit && e.cards[0].rank;
            });
            if (!event) {
                return;
            }
            return {
                playerName: this.getPlayerNameById(event.playerId),
                cards: this.convertCards(event.cards)
            };
        }
    }, {
        key: 'flopCards',
        get: function get() {
            var event = this.handData.events.find(function (e) {
                return e.type === 'TableCardsDealt';
            });
            return this.convertCards(event.cards);
        }
    }, {
        key: 'turnCard',
        get: function get() {
            var cardEvent = GlobalPokerHand.getNextCardEvent(this.getActionsAfterFlopCardsDealt());
            return this.convertCard(cardEvent.cards[0]);
        }
    }, {
        key: 'riverCard',
        get: function get() {
            var cardEvent = GlobalPokerHand.getNextCardEvent(this.getActionsAfterTurnCardDealt());
            return this.convertCard(cardEvent.cards[0]);
        }
    }, {
        key: 'preFlopActions',
        get: function get() {
            var events = this.handData.events;


            var lastCardDealtIndex = events.length - 1 - events.slice().reverse().findIndex(function (event) {
                return event.type === 'PlayerCardsDealt';
            });

            var preFlopEvents = events.slice(lastCardDealtIndex + 1, events.findIndex(function (event) {
                return event.type === 'PotUpdate';
            }));

            return this.parseHandEvents(preFlopEvents);
        }
    }, {
        key: 'flopActions',
        get: function get() {
            var slicedLeft = this.getActionsAfterFlopCardsDealt();
            var sliced = slicedLeft.slice(0, slicedLeft.findIndex(function (event) {
                return event.type === 'PotUpdate';
            }));

            return this.parseHandEvents(sliced);
        }
    }, {
        key: 'turnActions',
        get: function get() {
            var slicedLeft = this.getActionsAfterTurnCardDealt();
            var sliced = slicedLeft.slice(0, slicedLeft.findIndex(function (event) {
                return event.type === 'PotUpdate';
            }));
            return this.parseHandEvents(sliced);
        }
    }, {
        key: 'riverActions',
        get: function get() {
            var slicedLeft = this.getActionsAfterRiverCardDealt();
            var sliced = slicedLeft.slice(0, slicedLeft.findIndex(function (event) {
                return event.type === 'PotUpdate';
            }));
            return this.parseHandEvents(sliced);
        }
    }, {
        key: 'cardsShown',
        get: function get() {
            var _this4 = this;

            return this.handData.events.filter(function (event) {
                return event.type === 'PlayerCardsExposed';
            }).map(function (event) {
                return {
                    playerName: _this4.getPlayerNameById(event.playerId),
                    cards: _this4.convertCards(event.cards),
                    handType: _this4.getPlayerHandType(event.playerId)
                };
            });
        }
    }, {
        key: 'madeItToFlop',
        get: function get() {
            return this.handData.events.filter(function (event) {
                return event.type === 'TableCardsDealt';
            }).length >= 1;
        }
    }, {
        key: 'madeItToTurn',
        get: function get() {
            return this.handData.events.filter(function (event) {
                return event.type === 'TableCardsDealt';
            }).length >= 2;
        }
    }, {
        key: 'madeItToRiver',
        get: function get() {
            return this.handData.events.filter(function (event) {
                return event.type === 'TableCardsDealt';
            }).length >= 3;
        }
    }, {
        key: 'madeItToShowDown',
        get: function get() {
            return Boolean(this.handData.events.find(function (event) {
                return event.type === 'ShowDownSummary';
            }));
        }

        /**
         *
         * @return {Array} { playerName: '', totalWin: 10.00, netWin: 5.00 }
         */

    }, {
        key: 'playerSummaries',
        get: function get() {
            var _this5 = this;

            var results = Array.from(Object.values(this.handData.results.results));

            return results.map(function (result) {
                var playerName = _this5.getPlayerNameById(result.playerId);
                var cardsShownObject = _this5.cardsShown.find(function (player) {
                    return player.playerName === playerName;
                });

                var cardsShown = void 0;
                var handType = 'hand';

                if (cardsShownObject) {
                    cardsShown = cardsShownObject.cards;
                    handType = cardsShownObject.handType;
                }

                return {
                    seatNumber: _this5.players.find(function (player) {
                        return player.playerId === result.playerId;
                    }).seatId,
                    playerName: playerName,
                    cardsShown: cardsShown,
                    totalWin: result.totalWin, // Total pot awarded
                    netWin: result.netWin, // Money won in this hand
                    handType: handType
                };
            });
        }
    }], [{
        key: 'getNextCardEvent',
        value: function getNextCardEvent(events) {
            return events.find(function (event) {
                return event.type === 'TableCardsDealt';
            });
        }
    }]);

    return GlobalPokerHand;
}();

export default GlobalPokerHand;