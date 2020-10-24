'use strict';

let _Converter = require('./Converter');

let _GlobalPokerHand = require('./GlobalPokerHand');

let _GlobalPokerHand2 = _interopRequireDefault(_GlobalPokerHand);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

chrome.browserAction.onClicked.addListener(function(currentTab) {
	chrome.tabs.create({url: "index.html", active: true}, function(newTab) {
		chrome.debugger.attach({tabId: currentTab.id}, "1.0",function() {
			chrome.debugger.sendCommand({tabId:currentTab.id}, "Network.enable", function() {
				chrome.debugger.onEvent.addListener(networkListener);
			});
		});
	});
});

function networkListener(source, method, params) {
	if (method == "Network.loadingFinished") {
		chrome.debugger.sendCommand({
			tabId: source.tabId
		}, "Network.getResponseBody", {
			"requestId": params.requestId
		}, function(response) {
			if (response && response.body) {
				let handHistories = JSON.parse(response.body);
				if (!handHistories || !handHistories.hands) {
					return;
				}
				handHistories.hands.forEach(handJson => {
					let id = handJson.id;
					let record = _Converter.convertHand(new _GlobalPokerHand.default(handJson));
					chrome.storage.local.set({[id]: record});
				})
			}
		});
	}
}
