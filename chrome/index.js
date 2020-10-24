
document.getElementById("btn_refresh").addEventListener("click", function() {
	chrome.storage.local.get(null, function(hands) {
		chrome.storage.local.getBytesInUse(null, function(byteInUse) {
			var len = Object.keys(hands).length;
			document.getElementById("div_stats").innerHTML = "num: " + len + ", size: " + byteInUse;
		});
		var result = Object.values(hands).join('\n\n\n');
		document.getElementById("textarea_all_hands").value = result;
	});
});

document.getElementById("btn_download").addEventListener("click", function() {
	chrome.storage.local.get(null, function(items) {

		var hands = Object.values(items);

		var result = Object.values(hands).join('\n\n\n');
		var blob = new Blob([result], {type: "text/plain"});
		var url = URL.createObjectURL(blob);
		var now = new Date();
		var filename = "hand-history-" + now.toISOString().slice(0, 16).replace(":", "-") + ".txt";
		chrome.downloads.download({
			url: url,
			filename: filename
		});
	});
});

document.getElementById("btn_clear").addEventListener("click", function() {
	chrome.storage.local.clear();
});
