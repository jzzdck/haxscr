var room = HBInit({
	roomName: "room",
	public: false,
	token: "thr1.AAAAAGRu29lkvAEltXstNA.bzjj6n1-Tmc",
	maxPlayers: 16,
	noPlayer: true
});

const teams = {
	spec: 0,
	red: 1,
	blue: 2
}

var gameMode = {
	maxPlayers: 4
}

var playerQueue = new Array();
var commandList = new Object();
var botData = new Object();

commandList["nick"] = {
	roles: ["player"],
	action(player, args) {
		botData[player].nick = args.join(" ");
	}
};

commandList["unick"] = {
	roles: ["player"],
	action(player, args) {
		botData[player].nick = player.name;
	}
};

function getTeam(team) {
	var playerList = room.getPlayerList();
	return playerList.filter(player => player.team == team);
}

function teamLength() {
	return {
		spects: getTeam(teams.spec).length,
		reds: getTeam(teams.red).length,
		blues: getTeam(teams.blue).length
	};
}

function calcPriority() {
	var length = teamLength();
	if (length.reds >= gameMode.maxPlayers && length.blues >= gameMode.maxPlayers) {
		return teams.spec;
	}

	if (length.reds > length.blues) {
		return teams.blue;
	} else {
		return teams.red;
	}
}

function playerStillWaiting(player_id) {
	return room.getPlayer(player_id) != null;
}

function checkQueue() {
	var priority = calcPriority();
	if (priority != 0) {
		var player_id = playerQueue.shift();
		if (playerStillWaiting(player_id)) {
			room.setPlayerTeam(player_id, priority);
		} else {
			playerQueue = playerQueue.filter(pid => pid != player_id);
		}
	}
}

room.onTeamVictory = function(scores) {
	var loserTeamId = (scores.red > scores.blue ? teams.blue : teams.red);
	var loserTeam = getTeam(loserTeamId);

	loserTeam.forEach(player => {
		room.setPlayerTeam(player.id, teams.spec);
		playerQueue.push(player.id);
	});
}

room.onPlayerLeave = function(player) {
	playerQueue = playerQueue.filter(pid => pid != player.id);
}

room.onPlayerJoin = function(player) {
	botData[player] = {
		nick: player.name,
		role: "player"
	}
	
	playerQueue.push(player.id);
}

function playerChat(player, msg) {
	var chatMsg = botData[player].nick + ": " + msg;
	
	room.sendAnnouncement(chatMsg, null);
}

function isCommand(msg) {
	return msg.slice(0,1) == "!";
}

function executeCommand(player, cmd) {
	var args = cmd.split(" ").slice(1);
	cmd = cmd.split(" ").slice(0,1);
	
	if (commandList[cmd] != null && commandList[cmd].roles.includes(botData[player].role)) {
		commandList[cmd].action(player, args);
	} else {
		room.sendAnnouncement("Comando Invalido!", player.id);
	}
}

room.onPlayerChat = function(player, msg) {
	if (isCommand(msg)) {
		var cmd = msg.slice(1);
		executeCommand(player, cmd);
	} else {
		playerChat(player, msg);
	}

	return false;
}

setInterval(checkQueue, 150);

