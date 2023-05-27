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

var gameMode = new Object();

function setGameMode(newGameMode) {
	gameMode = newGameMode;
	room.setScoreLimit(newGameMode.scoreLimit);
	room.setTimeLimit(newGameMode.duration);
	room.setCustomStadium(newGameMode.map);
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
			throwCmd(player, "no ingresaste un numero válido");
			botAnnounce(player, "Lista de prefijos:\n" + showPrefixs());
			return;
		}

		catchCmd(player, "tu nuevo prefijo es " + prefixs[num-1]);
		botData[player.id].prefix = prefixs[num-1];
	}
}

function setAFKmode(player) {
	room.setPlayerTeam(player.id, teams.spec);
	removeFromQueue(player);
	botData[player].last = setTimeout(() => {
		room.kick(player.id, "10 minutos AFK");
	}, 60000 * 10);
}

commandList["afk"] = {
	roles: ["player"],
	action(player, args) {
		if (player.team != teams.spec || isInQueue(player)) {
			catchCmd(player, "entraste en modo AFK");
			setAFKmode(player);
		} else {
			catchCmd(player, "saliste del modo AFK");
			playerQueue.push(player.id);
		}

		// clear afk timeout (if not afk) or kick timeout (if afk)
		clearTimeout(botData[player.id].last);
	}
}

function getTeam(team) {
	var playerList = room.getPlayerList();
	return playerList.filter(player => player.team == team);
}

function countAFKs() {
	 var players = room.getPlayerList();
	 players = players.filter(player => player.team == teams.spec);
	 players = players.filter(player => !isInQueue(player.id));

	 return players.length;
}

function teamLength() {
	return {
		spects: getTeam(teams.spec).length,
		reds: getTeam(teams.red).length,
		blues: getTeam(teams.blue).length,
		afks: countAFKs()
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

room.onGameTick = function() {
	if (room.getPlayerList().length == teamLength().afks) {
		room.stopGame();
	}
}

room.onPlayerLeave = function(player) {
	removeFromQueue(player);
}

function playerInit(player) {
	botData[player.id] = {
		nick: player.name,
		role: "player",
		prefix: null
	}
	
	playerQueue.push(player.id);
}

function giveWelcome(player) {
	botAnnounce(player, "¡Bienvenido, " + player.name + "!");
	botAnnounce(player, "Soy el bot de esta sala. El comando !ayuda te permite ver los comandos disponibles");
}

room.onPlayerJoin = function(player) {
	playerInit(player);
	giveWelcome(player);
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
		botAnnounce(player, "Inactividad detectada, se te asignará modo AFK en 8 s");
		botData[player.id].last = setTimeout(() => {
			botWarning(player, "Entraste en modo AFK");
			setAFKmode(player);
		}, 8000);
	}, 7000);
}

room.onPlayerActivity = function(player) {
	if (player.team == teams.spec) return;
	
	clearTimeout(botData[player.id].last);
	setInactivityTimeout(player);
}

room.onGameStart = function(player) {
	room.getPlayerList().forEach(player => {
		if (player.team != teams.spec) {
			setInactivityTimeout(player);
		}
	});
}

room.onPlayerTeamChange = function(player) {
	if (teamLength().reds + teamLength().blues == 1) {
		room.startGame();
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
setGameMode({
	maxPlayers: 4,
	scoreLimit: 4,
	duration: 4,
	map: `{"name":"bazinga! x4","width":800,"height":350,"bg":{"type":"hockey","width":700,"height":320,"kickOffRadius":80},"vertexes":[{"x":-700,"y":321,"cMask":["ball"]},{"x":-700,"y":-319,"cMask":["ball"]},{"x":699,"y":319,"cMask":["ball"]},{"x":601,"y":-320,"cMask":["ball"]},{"x":0,"y":350,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-350,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":-700,"y":-99,"bCoef":0.1,"cMask":["ball"]},{"x":-750,"y":-99,"bCoef":0.1,"cMask":["ball"]},{"x":-750,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":-700,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":700,"y":-90,"bCoef":0.1,"cMask":["ball"]},{"x":749,"y":-90,"bCoef":0.1,"cMask":["ball"]},{"x":749,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":699,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":-700,"y":90,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":321,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":-99,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":-319,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":321,"bCoef":2,"cMask":["ball"]},{"x":699,"y":319,"bCoef":2,"cMask":["ball"]},{"x":699,"y":90,"bCoef":1.25,"cMask":["ball"]},{"x":699,"y":319,"bCoef":1.25,"cMask":["ball"]},{"x":699,"y":-321,"bCoef":1.25,"cMask":["ball"]},{"x":699,"y":-90,"bCoef":1.25,"cMask":["ball"]},{"x":601,"y":-320,"bCoef":0,"cMask":["ball"]},{"x":601,"y":-320,"bCoef":0,"cMask":["ball"]},{"x":-699,"y":-320,"bCoef":2,"cMask":["ball"]},{"x":699,"y":-321,"bCoef":2,"cMask":["ball"]},{"x":0,"y":-320,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":320,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-150,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":90,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":-710,"y":90,"cMask":["ball"]},{"x":-710,"y":321,"cMask":["ball"]},{"x":-710,"y":90,"cMask":["ball"]},{"x":-710,"y":321,"cMask":["ball"]},{"x":-710,"y":-315,"cMask":["ball"]},{"x":-710,"y":-99,"cMask":["ball"]},{"x":710,"y":-90,"cMask":["ball"]},{"x":709,"y":-317,"cMask":["ball"]},{"x":709,"y":-90,"cMask":["ball"]},{"x":709,"y":94,"cMask":["ball"]},{"x":709,"y":319,"cMask":["ball"]},{"x":-699,"y":274,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":-141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":-141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-699,"y":-274,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":698,"y":273,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":140,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":140,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":-142,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":-142,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":698,"y":-275,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":-701,"y":90,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-701,"y":-90,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":699,"y":90,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":699,"y":-90,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":-713,"y":90,"cMask":["ball"]},{"x":-713,"y":321,"cMask":["ball"]},{"x":-713,"y":-315,"cMask":["ball"]},{"x":-713,"y":-99,"cMask":["ball"]},{"x":712,"y":-317,"cMask":["ball"]},{"x":712,"y":-90,"cMask":["ball"]},{"x":712,"y":94,"cMask":["ball"]},{"x":712,"y":319,"cMask":["ball"]},{"x":704,"y":-317,"cMask":["ball"]},{"x":704,"y":-90,"cMask":["ball"]},{"x":704,"y":-317,"cMask":["ball"]},{"x":704,"y":-90,"cMask":["ball"]},{"x":704,"y":94,"cMask":["ball"]},{"x":704,"y":319,"cMask":["ball"]},{"x":704,"y":94,"cMask":["ball"]},{"x":704,"y":319,"cMask":["ball"]},{"x":-705,"y":90,"cMask":["ball"]},{"x":-705,"y":321,"cMask":["ball"]},{"x":-705,"y":90,"cMask":["ball"]},{"x":-705,"y":321,"cMask":["ball"]},{"x":-705,"y":-315,"cMask":["ball"]},{"x":-705,"y":-99,"cMask":["ball"]},{"x":-705,"y":-315,"cMask":["ball"]},{"x":-705,"y":-99,"cMask":["ball"]},{"x":-699,"y":319.88890075683594,"bCoef":2,"cMask":["ball"]},{"x":699,"y":318.88890075683594,"bCoef":2,"cMask":["ball"]}],"segments":[{"v0":8,"v1":9,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":9,"v1":10,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":10,"v1":11,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":12,"v1":13,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":13,"v1":14,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":14,"v1":15,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":4,"v1":5,"bCoef":0.1,"vis":false,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"v0":5,"v1":6,"bCoef":0.1,"curve":180,"curveF":6.123233995736766e-17,"cMask":["red","blue"],"cGroup":["blueKO"],"color":"F8F8F8"},{"v0":6,"v1":5,"bCoef":0.1,"curve":180,"curveF":6.123233995736766e-17,"cMask":["red","blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":6,"v1":7,"bCoef":0.1,"vis":false,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"v0":16,"v1":17,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":18,"v1":19,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":22,"v1":23,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":24,"v1":25,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":26,"v1":27,"bCoef":0,"cMask":["ball"],"color":"F8F8F8"},{"v0":28,"v1":29,"bCoef":2,"cMask":["ball"],"color":"F8F8F8"},{"v0":30,"v1":31,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"],"color":"F8F8F8"},{"v0":32,"v1":33,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"],"color":"F8F8F8"},{"v0":42,"v1":43,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":44,"v1":45,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":46,"v1":47,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":49,"v1":50,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":51,"v1":52,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":54,"v1":53,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":56,"v1":55,"bCoef":0.1,"curve":10,"curveF":11.430052302761343,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":58,"v1":57,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":59,"v1":60,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":61,"v1":62,"bCoef":0.1,"curve":10,"curveF":11.430052302761343,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":63,"v1":64,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":65,"v1":66,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":67,"v1":68,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":69,"v1":70,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":71,"v1":72,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":73,"v1":74,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":75,"v1":76,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":77,"v1":78,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":79,"v1":80,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":81,"v1":82,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":83,"v1":84,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":85,"v1":86,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":87,"v1":88,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":89,"v1":90,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":91,"v1":92,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":93,"v1":94,"bCoef":2,"cMask":["ball"],"color":"F8F8F8"}],"planes":[{"normal":[0,1],"dist":-320,"cMask":["ball"]},{"normal":[0,-1],"dist":-317.5,"cMask":["ball"]},{"normal":[0,1],"dist":-350,"bCoef":0.1},{"normal":[0,-1],"dist":-350,"bCoef":0.1},{"normal":[1,0],"dist":-800,"bCoef":0.1},{"normal":[-1,0],"dist":-800,"bCoef":0.1}],"goals":[{"p0":[-707,-94],"p1":[-707,86],"team":"red"},{"p0":[706,90],"p1":[706,-90],"team":"blue"}],"discs":[{"radius":6.25,"bCoef":0.4,"invMass":1.5,"color":"FFCC00","cGroup":["ball","kick","score"]},{"pos":[-700,89],"radius":6,"invMass":0,"color":"FF0000"},{"pos":[-700,-99],"radius":6,"invMass":0,"color":"FF0000"},{"pos":[700,90],"radius":6,"invMass":0,"color":"33FF"},{"pos":[701,-89],"radius":6,"invMass":0,"color":"33FF"}],"playerPhysics":{"bCoef":0,"acceleration":0.11,"kickingAcceleration":0.083},"ballPhysics":"disc0","spawnDistance":350}`
});
