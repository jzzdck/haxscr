var room = HBInit({
	roomName: "room",
	public: false,
	token: "thr1.AAAAAGRxWlTYU1hk3VBxXw.2QDyIEYX6Yo",
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

var prefixs = ['⚽', '👟', '🥊', '🧤'];
var playerQueue = new Array();

function removeFromQueue(player) {
	playerQueue = playerQueue.filter(pid => pid != player.id);
}

function isInQueue(player) {
	return playerQueue.find(pid => pid == player.id);
}

var commandList = new Object();
var botData = new Object();

function showPrefixs() {
	var list = "";
	
	for (var i = 0; i<prefixs.length; i++) {
		list += (i+1) + ". " + prefixs[i] + "\n";
	}

	return list;
}

function throwCmd(player, msg) {
	room.sendAnnouncement("🤖: ¡ERROR, " + msg + "!", player.id, 0xff0000,"bold", 2);
}

function catchCmd(player, msg) {
	room.sendAnnouncement("🤖: " + msg, player.id, 0x00ff00,"bold", 1);
}

function botAnnounce(player, msg) {
	room.sendAnnouncement("🤖: " + msg, player.id, 0x57a9c2,"bold", 1);
}

function botWarning(player, msg) {
	room.sendAnnouncement("🤖: ¡" + msg + "!", player.id, 0xffff00, "bold", 2);
}

commandList["nick"] = {
	roles: ["player"],
	action(player, args) {
		var newNick = args.join(" ");
		if (nickInUse(newNick)) {
			throwCmd(player, "el nick " + newNick + " está en uso");
			return;
		}
		
		catchCmd(player, "nick cambiado a " + newNick);
		botData[player.id].nick = args.join(" ");
	}
};

commandList["unick"] = {
	roles: ["player"],
	action(player, args) {
		botData[player.id].nick = player.name;
	}
};

commandList["prefijo"] = {
	roles: ["player"],
	action(player, args) {
		var num = +args[0];
		
		if (isNaN(num) || num <= 0 || num > prefixs.length) {
			throwCmd(player, "no ingresaste un numero válido.");
			room.sendAnnouncement("Lista de prefijos:\n" + showPrefixs(), player.id);
			return;
		}

		catchCmd(player, "tu nuevo prefijo es " + prefixs[num-1]);
		botData[player.id].prefix = prefixs[num-1];
	}
}

function setAFKmode(player) {
	room.setPlayerTeam(player.id, teams.spec);
	removeFromQueue(player);
}

commandList["afk"] = {
	roles: ["player"],
	action(player, args) {
		if (player.team != teams.spec || isInQueue(player)) {
			catchCmd(player, "entraste en modo AFK");
			clearTimeout(botData[player.id].last);
			setAFKmode(player);
		} else {
			catchCmd(player, "saliste del modo AFK");
			playerQueue.push(player.id);
		}
	}
}

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
			removeFromQueue(player_id);
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
	removeFromQueue(player);
}

room.onPlayerJoin = function(player) {
	botData[player.id] = {
		nick: player.name,
		role: "player",
		prefix: null
	}

	room.sendAnnouncement(`¡Bienvenido, ` + player.name + `!`, player.id);
	playerQueue.push(player.id);
}

function nickInUse(nick) {
	for (playerData of Object.values(botData)) {
		if (playerData.nick == nick) {
			return true;
		}
	}

	return false;
}

function getPlayerChatColor(player) {
	if (player.team == teams.spec) {
		return 0xffffff;
	} else if (player.team == teams.red) {
		return 0xE56E56;
	} else {
		return 0x5689E5;
	}
}

function playerChat(player, msg) {
	var chatMsg = "";
	if (botData[player.id].prefix != null ) {
		chatMsg = "[" + botData[player.id].prefix + "] "
	}
	
	chatMsg += botData[player.id].nick + ": " + msg;
	room.sendAnnouncement(chatMsg, null, getPlayerChatColor(player));
}

function isCommand(msg) {
	return msg.slice(0,1) == "!";
}

function executeCommand(player, cmd) {
	var args = cmd.split(" ").slice(1);
	cmd = cmd.split(" ").slice(0,1);
	
	if (commandList[cmd] != null && commandList[cmd].roles.includes(botData[player.id].role)) {
		commandList[cmd].action(player, args);
	} else {
		throwCmd(player, cmd + " no es un comando válido");
	}
}

function setInactivityTimeout(player) {
	if (player.team == teams.spec) return;
	
	botData[player.id].last = setTimeout(() => {
		botAnnounce(player, "Inactividad detectada, se te asignará modo AFK en 5 s");
		botData[player.id].last = setTimeout(() => {
			botWarning(player, "Entraste en modo AFK");
			setAFKmode(player);
		}, 5000);
	}, 5000);
}

room.onPlayerActivity = function(player) {
	if (player.team == teams.spec) return;
	
	clearTimeout(botData[player.id].last);
	setInactivityTimeout(player);
}

room.onPlayerTeamChange = function(player) {
	if (player.team == teams.spec) return;
	
	setInactivityTimeout(player);
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
