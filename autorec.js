// script for match auto-recording
// and send the rec to a discord server

class Recorder {
	webhook = "yourwebhook";
	
	startRecording() {
		room.startRecording();
		this.date = new Date();
	}

	stopRecording() {
		this.rec = new File([room.stopRecording()], this.date.toLocaleString() + ".hbr2", {type: 'application/octet-binary' });
	}

	isSavable (scores) {
		// when should Recorder save a rec
		return scores.time > 60;
	}

	sendToDiscord() {
		const formData = new FormData();
		formData.append("content", "rec");
		formData.append("username", "kkbot");
		formData.append("file", this.rec);
		
		const request = new XMLHttpRequest();
		request.open("POST", webhook);
		request.send(formData);
	}
}

var recorder = new Recorder();

var room = HBInit({
	roomName: "autorecorder",
	public: false,
	token: "thr1.AAAAAGR8ix-vDJ4do3aVKg.ty7FNb1XBlA",
	maxPlayers: 16,
	noPlayer: true
});

room.onGameStart = function(player) {
	recorder.startRecording();
}

room.onGameStop = function(player) {
	recorder.stopRecording();
	
	if (true) {
		recorder.sendToDiscord();
	}
}
