var room = HBInit({
	roomName: "𝗙𝗨𝗧𝗦𝗔𝗟 𝘅𝟰 + 𝗕𝗢𝗧 🤖 (test)",
	public: false,
	token: "thr1.AAAAAGR2ewvPcMuf12X8UA.RB2QDig98-s",
	maxPlayers: 16,
	noPlayer: true
});

var adminAuths = [ "ob40bCoCsu02IF9ZotmxSUVn57evwhFEoMvuom5eEzM" ];

const teams = {
	spec: 0,
	red: 1,
	blue: 2
}

var gameMode = new Object();

function gameBeingPlayed() {
	return room.getScores() != null;
}

function isPlaying(player) {
	return gameBeingPlayed() && player.team != teams.spec;
}

function setGameMode(newGameMode) {
	gameMode = newGameMode;
	room.setTeamsLock(true);
	room.setScoreLimit(newGameMode.scoreLimit);
	room.setTimeLimit(newGameMode.duration);
	room.setCustomStadium(newGameMode.map);
}

var prefixs = ['⚽', '👟', '🥊', '🧤', '🧠', '💩', '🐴', '🐓'];
var lastLoser = 0;
var playerQueue = new Array();
var guestCount = 0;

function removeFromQueue(player) {
	playerQueue = playerQueue.filter(pid => pid != player.id);
}

function isInQueue(player) {
	return playerQueue.find(pid => pid == player.id);
}

var commandList = new Object();
var botData = new Object();
var shirtData = new Object();
var botIDs = new Object();

function validateNumber(num, minL, maxL) {
	return !isNaN(num) && num > minL && num <= maxL;
}

function showPrefixs() {
	var list = "";
	
	for (var i = 1; i<=prefixs.length; i++) {
		list += i + ". " + prefixs[i-1] + "\t";

		if (i%4 == 0) {
			list += "\n"
		}
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

function registerPlayer(player) {
	botData[player.name] = botData[botIDs[player.id]];
	botIDs[player.id] = player.name;
	botData[player.name].role = "player";
}

function showCmds(player) {
	var role = botData[botIDs[player.id]].role;
	var cmds = Object.keys(commandList).filter(cmd => commandList[cmd].roles.includes(role));

	return cmds.join(", ");
}

function isHaxballColorCommand(cmd) {
	cmd = cmd.split(" ");
	if (cmd[0] != "/colors") {
		return [false, "el comando debe empezar por /color"];
	}

	if (cmd[1] != "red" && cmd[1] != "blue") {
		return [false, "el comando debe tener 'blue' o 'red' como segundo argumento"];
	}

	if (!validateNumber(Number(cmd[2]), -1, 360)) {
		return [false, "angulo invalido"];
	}

	if (!validateNumber(Number("0x" + cmd[3]), -1, 0xffffff)) {
		return [false, "color de texto invalido"];
	}

	for (var i = 4; i<cmd.length; i++) {
		if (!validateNumber(Number("0x" + cmd[i]), -1, 0xffffff)) {
			return [false, "color de franja " + (i-3) + " invalido"];
		}
	}

	return [true, "ok"];
}

function parseShirtColor(cmd) {
	var c = new Array(0);
	cmd = cmd.split(" ");
	for (var i = 4; i < cmd.length; i++) {
		c.push(Number("0x" + cmd[i]));
	}
	
	return { angle: Number(cmd[2]), textColor: Number("0x" + cmd[3]), colors: c };
}

function setTeamShirt(teamID, shirtID) {
	var shirt = shirtData[shirtID]
	room.setTeamColors(teamID, shirt.angle, shirt.textColor, shirt.colors);
}

commandList["frase"] = {
	roles: ["admin", "player"],
	help: " <una frase>: guarda <una frase> para mostrar en tus estadísticas",
	action(player, args) {
		var phrase = args.join(" ");
		if (phrase.length > 30) {
			throwCmd(player, "frase muy larga");
			botAnnounce(player, "Por favor, ingresá una frase mas corta");
			return;
		}

		catchCmd(player, "Se guardó la frase '" + phrase + "'");
		botData[botIDs[player.id]].phrase = phrase;
	}
}

function botShowPlayer(player) {
	var data = botData[botIDs[player.id]];
	var winr = (data.mp > 0 ? data.mw/data.mp * 100 : 0);
	var stats = "[ G: " + data.goals + " | A: " + data.assists + " | PJ: " + data.mp + " | WIN%: " + winr + "% ]"
	room.sendAnnouncement("🤖: " + data.nick + " >> " + stats, null, 0xff00bb, "bold", 1);

	if (data.phrase != null) {
		room.sendAnnouncement("🤖: " + data.nick + " >> '" + data.phrase + "'", null, 0xff00bb, "italic", 1);
	}
}

commandList["mostrarme"] = {
	roles: ["player", "admin"],
	help: ": les muestra tus estadísticas a toda la sala",
	action(player, args) {
		if (botData[botIDs[player.id]].antispam == null) {
			botShowPlayer(player);
			botData[botIDs[player.id]].antispam = true;
			setTimeout(() => botData[botIDs[player.id]].antispam = null, 10000);
		} else {
			throwCmd(player, "todavía no podés volver a mostrarte");
		}
	}
}

commandList["cami"] = {
	roles: ["admin"],
	help: " <blue o red> <id>: carga la camiseta <id> al team <blue o red>",
	action(player, args) {
		if (args[0] != "red" && args[0] != "blue") {
			throwCmd(player, "equipo mal ingresado (recuerda, !color red <id> o !color blue <id>");
			return;
		}

		if (shirtData[args[1]] ==  null) {
			throwCmd(player, "ID inválida");
			return;
		}

		var teamid = (args[0] == "red" ? 1 : 2);
		setTeamShirt(teamid, args[1]);
	}
}

commandList["mcami"] = {
	roles: ["admin"],
	help: ": muestra las camisetas disponibles",
	action(player, args) {
		function shirtsWithCat(v) {
			return Object.keys(shirtData).filter(shirt => shirt != "CAT" && shirtData[shirt].category == v);
		};
		
		var list = shirtData["CAT"].reduce((a,v,i) => a += v + ": " + shirtsWithCat(v).join(", ") + "\n", "");
		list += "Misc: " + shirtsWithCat(null).join(", ");

		botAnnounce(player, list);
	}
}

commandList["scami"] = {
	roles: ["admin"],
	help: " <comando de haxball> <id>: guarda una camiseta en el sistema",
	action(player, args) {
		var haxcmd = args.slice(0,-1).join(" ");
		var id = args[args.length-1];
		var checkCmd = isHaxballColorCommand(haxcmd);

		if (!checkCmd[0]) {
			throwCmd(player, checkCmd[1]);
			return;
		}

		if (id.length < 5) {
			throwCmd(player, id + " es una ID inválida");
			botAnnounce(player, "la ID debe tener como mínimo 5 letras");
			return;
		}

		if (shirtData[id] != null) {
			throwCmd(player, "ID en uso");
			return;
		}

		shirtData[id] = parseShirtColor(haxcmd);
		saveShirtData();
		catchCmd(player, "Camiseta " + id + " guardada con éxito");
	}
}

function showCAT() {
	return shirtData["CAT"].reduce((a, v, i) => a + (i+1) + ". " + v + "\n", "");
}

commandList["tcami"] = {
	roles: ["admin"],
	help: " <id> <cat>: la asigna la categoría <cat> a la camiseta <id>",
	action(player, args) {
		if (shirtData[args[0]] == null) {
			throwCmd(player, "la camiseta no existe");
			return;
		}

		var num = +args[1];
		if (!validateNumber(num, 0, shirtData["CAT"].length)) {
			throwCmd(player, "número invalido");
			botAnnounce(player, "Lista de categorías:\n" + showCAT());
			return;
		}

		var cat = shirtData["CAT"][num-1];
		catchCmd(player, "La camiseta " + args[0] + " se registró en la categoría " + cat);
		shirtData[args[0]].category = cat;
		saveShirtData();
	}
}

commandList["ayuda"] = {
	roles: ["guest", "player", "admin"],
	help: " <comando>: muestra una ayuda del comando ingresado",
	action(player, args) {
		if (args[0] == null) {
			botAnnounce(player, "Lista de comandos: " + showCmds(player));
			botAnnounce(player, "Podes ingresar !ayuda <comando> para ver una ayuda de uno en particular");
			return;
		}

		if (commandList[args[0]] == null || !commandList[args[0]].roles.includes(botData[botIDs[player.id]].role)) {
			throwCmd(player, `"` + args[0] + `" no es un comando válido`);
		} else {
			botAnnounce(player, "!"+ args[0] + commandList[args[0]].help);
		}
	}
}

commandList["radio"] = {
	roles: ["guest", "player", "admin"],
	help: " <número del 12 al 17>: cambia el radio de tu ficha, el radio por defecto es 15",
	action(player, args) {
		if (room.getScores() == null || player.team == teams.spec) {
			throwCmd(player, "solo podés modificar tu radio si estás en juego");
			return;
		}
		
		var num = +args[0]
		if (!validateNumber(num, 11, 17)) {
			throwCmd(player, "no ingresaste un numero válido");
			botAnnounce(player, "Solo se permiten números entre 12 y 17");
			return;
		}

		catchCmd(player, "Radio seteado a " + num);
		room.setPlayerDiscProperties(player.id, {radius: num});
		botData[botIDs[player.id]].radius = num;
	}
}

commandList["registrarme"] = {
	roles: ["guest"],
	help: ": te registra como usuario",
	action(player, args) {
		if (botData[player.name] != null) {
			throwCmd(player, player.name + " ya está registrado");
			botAnnounce(player, player.name + ", probá ingresar con otro nick");
			return;
		}
		
		catchCmd(player, "¡Te registré con éxito, " + player.name + "!");
		catchCmd(player, "Tus estadísticas y customizaciones (prefijos, apodos, tamaño, etc) se guardarán automáticamente de ahora en más");
		registerPlayer(player);
	}
}

commandList["nick"] = {
	roles: ["player", "guest", "admin"],
	help: " <nuevo nick>: cambia tu nick a <nuevo nick>",
	action(player, args) {
		var newNick = args.join(" ");
		if (nickInUse(newNick)) {
			throwCmd(player, "el nick " + newNick + " está en uso");
			return;
		}
		
		catchCmd(player, "Nick cambiado a " + newNick);
		botData[botIDs[player.id]].nick = args.join(" ");
	}
};

commandList["unick"] = {
	roles: ["player", "guest", "admin"],
	help: ": restaura tu nick original",
	action(player, args) {
		botData[botIDs[player.id]].nick = player.name;
		catchCmd(player, "Nick restaurado a " + player.name);
	}
};

commandList["prefijo"] = {
	roles: ["player", "guest", "admin"],
	help: " <numero del 1 al " + (prefixs.length) + ">: cambia tu prefijo",
	action(player, args) {
		var num = +args[0];
		
		if (!validateNumber(num, 0, prefixs.length)) {
			throwCmd(player, "no ingresaste un numero válido");
			botAnnounce(player, "Lista de prefijos:\n" + showPrefixs());
			return;
		}

		catchCmd(player, "Tu nuevo prefijo es " + prefixs[num-1]);
		botData[botIDs[player.id]].prefix = prefixs[num-1];
	}
}

function setAFKmode(player) {
	clearAFK(player);
	room.setPlayerTeam(player.id, teams.spec);
	removeFromQueue(player);
	botData[botIDs[player.id]].last = setTimeout(() => {
		room.kickPlayer(player.id, "🤖: 10 minutos AFK");
	}, 60000 * 10);
}

function clearAFK(player) {
	clearTimeout(botData[botIDs[player.id]].last);
}

commandList["afk"] = {
	roles: ["player", "guest", "admin"],
	help: ": te pone (o te saca) del modo AFK",
	action(player, args) {
		if (player.team != teams.spec || isInQueue(player)) {
			catchCmd(player, "Entraste en modo AFK");
			setAFKmode(player);
		} else {
			catchCmd(player, "Saliste del modo AFK");
			clearAFK(player);
			playerQueue.push(player.id);
		}
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

function teamsCompleted() {
	return room.getPlayerList().filter(player => player.team != teams.spec).length == 2 * gameMode.maxPlayers;
}

function theOtherTeam(teamID) {
	return 3-teamID;
}

room.onTeamVictory = function(scores) {
	lastLoser = (scores.red > scores.blue ? teams.blue : teams.red);
	if (teamsCompleted()) {
		var winnerTeam = getTeam(theOtherTeam(lastLoser));
		room.getPlayerList().filter(player => player.team != teams.spec).forEach(player => botData[botIDs[player.id]].mp += 1);
		winnerTeam.forEach(player => botData[botIDs[player.id]].mw += 1);
	}
	
	var loserTeam = getTeam(lastLoser);

	loserTeam.forEach(player => {
		room.setPlayerTeam(player.id, teams.spec);
		playerQueue.push(player.id);
	});

	setTimeout(room.startGame, 5000);
}

room.onGameTick = function() {
	if (room.getPlayerList().length == teamLength().afks) {
		room.stopGame();
	}
}

room.onPlayerLeave = function(player) {
	removeFromQueue(player);
}

function loadGuestSession(player) {
	botIDs[player.id] = "guest_" + guestCount;
	guestCount += 1;
	
	botData[botIDs[player.id]] = {
		nick: player.name,
		auth: player.auth,
		conn: player.conn,
		role: "guest",
		prefix: null,
		radius: 15
	}
}

function loadPlayerData(player) {
	if (adminAuths.includes(player.auth)) {
		room.setPlayerAdmin(player.id, true);
		botData[player.name].role = "admin";
		botWarning({ id: null }, "Ha entrado el admin " + player.name);
	}
	
	room.setPlayerDiscProperties(player.id, {radius: botData[player.name].radius});
	botIDs[player.id] = player.name;
}

function giveWelcome(player) {
	botAnnounce(player, "¡Bienvenido, " + player.name + "!");
	botAnnounce(player, "Soy el bot de esta sala. Si querés guardar tus estadísticas y customizaciones, usá el comando !registrarme");
	botAnnounce(player, "Mientras tanto, podés usar el comando !ayuda para ver los comandos disponibles");
	loadGuestSession(player);
}

function isRegistered(player) {
	return botData[player.name] != null;
}

function login(player) {
	return player.auth == botData[player.name].auth || player.conn == botData[player.name].conn;
}

room.onPlayerJoin = function(player) {
	playerQueue.push(player.id);

	if (!isRegistered(player)) {
		giveWelcome(player);
		return;
	}
	
	if (login(player)) {
		catchCmd(player, "¡Qué bueno volver a verte, " + player.name + "!");
		loadPlayerData(player);
	} else {
		botWarning(player, "No sos el de siempre, " + player.name);
		botAnnuounce(player, "Te inicié una sesión de invitado. Para verificar que sos vos, contactate con un admin");
		loadGuestSession(player);
	}
}

function nickInUse(nick) {
	return Object.values(botData).some(playerData => playerData.nick == nick);
}

function getPlayerChatColor(player) {
	if (player.admin) {
		return 0xFFD700;
	} else if (player.team == teams.spec) {
		return 0xffffff;
	} else if (player.team == teams.red) {
		return 0xE56E56;
	} else {
		return 0x5689E5;
	}
}

function playerChat(player, msg) {
	var chatMsg = "";
	if (botData[botIDs[player.id]].prefix != null ) {
		chatMsg = "[" + botData[botIDs[player.id]].prefix + "] "
	}
	
	chatMsg += botData[botIDs[player.id]].nick + ": " + msg;
	room.sendAnnouncement(chatMsg, null, getPlayerChatColor(player));
}

function isCommand(msg) {
	return msg.slice(0,1) == "!";
}

function executeCommand(player, cmd) {
	var args = cmd.split(" ").slice(1);
	cmd = cmd.split(" ").slice(0,1);
	
	if (commandList[cmd] != null && commandList[cmd].roles.includes(botData[botIDs[player.id]].role)) {
		commandList[cmd].action(player, args);
	} else {
		throwCmd(player, cmd + " no es un comando válido");
	}
}

function setInactivityTimeout(player) {
	clearAFK(player);
	botData[botIDs[player.id]].last = setTimeout(() => {
		botAnnounce(player, "Inactividad detectada, se te asignará modo AFK en 10 s");
		botData[botIDs[player.id]].last = setTimeout(() => {
			botWarning(player, "Entraste en modo AFK");
			setAFKmode(player);
		}, 10000);
	}, 10000);
}

room.onPlayerActivity = function(player) {
	if (isPlaying(player)) {
		setInactivityTimeout(player);
	}
}

room.onGameStop = function(player) {
	saveBotData();
}

function setRadius(player) {
	room.setPlayerDiscProperties(player.id, { radius: botData[botIDs[player.id]].radius });
}

function chooseShirtColors() {
	var shirts = Object.keys(shirtData).filter(shirt => shirt != "CAT");
	var randi = Math.floor(Math.random() * shirts.length);
	
	if (lastLoser != 0) {
		setTeamShirt(lastLoser, shirts[randi]);
	} else {
		setTeamShirt(teams.red, shirts[randi]);
		shirts = shirts.filter(shirt => shirt != shirts[randi]);
		randi = Math.floor(Math.random() * shirts.length);
		setTeamShirt(teams.blue, shirts[randi]);
	}
}

room.onGameStart = function(player) {
	chooseShirtColors();
	room.getPlayerList().forEach(player => {
		if (player.team != teams.spec) {
			setRadius(player);
			setInactivityTimeout(player);
		}
	});
}

room.onPositionsReset = function() {
	room.getPlayerList().forEach(player => {
		if (player.team != teams.spec) {
			setRadius(player);
		}
	});
}

function manageAdminTeamChange(player, admin) {
	if (player.team == teams.spec) {
		botWarning(player, "El admin " + admin.name + " te puso afk");
		setAFKmode(player);
	} else {
		removeFromQueue(player);
	}
}

room.onPlayerTeamChange = function(player, admin) {
	if (teamLength().reds + teamLength().blues == 1) {
		room.startGame();
	}

	if (admin != null) {
		manageAdminTeamChange(player, admin);
	}

	if (isPlaying(player)) {
		setInactivityTimeout(player);
		setRadius(player);
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

function writeRecord(content, ID) {
	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
	myHeaders.append("x-collection-access-token", "5291cf7e-91d2-4cd4-9dc5-e63ef698e053");

	var urlencoded = new URLSearchParams();
	urlencoded.append("jsonData", content);

	var requestOptions = {
	  method: 'PUT',
	  headers: myHeaders,
	  body: urlencoded,
	  redirect: 'follow'
	};

	fetch("https://api.myjson.online/v1/records/" + ID, requestOptions)
	  .then(response => response.json())
	  .then(result => console.log(result))
	  .catch(error => console.log('error', error));
}

function saveBotData() {
	var keysMinusGuests = Object.keys(botData).filter(id => id.slice(0,6) != "guest_");
	var botDataMinusGuest = {};

	for (key of keysMinusGuests) {
		botDataMinusGuest[key] = botData[key];
	}
			 
	writeRecord(JSON.stringify(botDataMinusGuest), "4bc9bcb0-d74f-4506-a4aa-dd0b137fa329");
}

function saveShirtData() {
	writeRecord(JSON.stringify(shirtData), "92a45d2e-2b82-4bb9-b390-a45f4a37ea0f");
}

function readRecord(ID, f) {
	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json"); 
	myHeaders.append("x-collection-access-token", "5291cf7e-91d2-4cd4-9dc5-e63ef698e053");

	var requestOptions = {
	   method: 'GET',
	   headers: myHeaders,
	   redirect: 'follow'
	};

	fetch("https://api.myjson.online/v1/records/" + ID, requestOptions)
	   .then(response => response.json())
	   .then(result => f(result.data))
	   .catch(error => { return {}; });
}

function loadBotData(data) {
	// playerData
	botData = { ...data };
}

function loadShirtData(data) {
	shirtData = { ...data };
}

setInterval(checkQueue, 500);
readRecord("4bc9bcb0-d74f-4506-a4aa-dd0b137fa329", loadBotData);
readRecord("92a45d2e-2b82-4bb9-b390-a45f4a37ea0f", loadShirtData);
setGameMode({
	maxPlayers: 4,
	scoreLimit: 4,
	duration: 4,
	map: `{"name":"bazinga! x4","width":800,"height":350,"bg":{"type":"hockey","width":700,"height":320,"kickOffRadius":80},"vertexes":[{"x":-700,"y":321,"cMask":["ball"]},{"x":-700,"y":-319,"cMask":["ball"]},{"x":699,"y":319,"cMask":["ball"]},{"x":601,"y":-320,"cMask":["ball"]},{"x":0,"y":350,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-350,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":-700,"y":-99,"bCoef":0.1,"cMask":["ball"]},{"x":-750,"y":-99,"bCoef":0.1,"cMask":["ball"]},{"x":-750,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":-700,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":700,"y":-90,"bCoef":0.1,"cMask":["ball"]},{"x":749,"y":-90,"bCoef":0.1,"cMask":["ball"]},{"x":749,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":699,"y":90,"bCoef":0.1,"cMask":["ball"]},{"x":-700,"y":90,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":321,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":-99,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":-319,"bCoef":1.25,"cMask":["ball"]},{"x":-700,"y":321,"bCoef":2,"cMask":["ball"]},{"x":699,"y":319,"bCoef":2,"cMask":["ball"]},{"x":699,"y":90,"bCoef":1.25,"cMask":["ball"]},{"x":699,"y":319,"bCoef":1.25,"cMask":["ball"]},{"x":699,"y":-321,"bCoef":1.25,"cMask":["ball"]},{"x":699,"y":-90,"bCoef":1.25,"cMask":["ball"]},{"x":601,"y":-320,"bCoef":0,"cMask":["ball"]},{"x":601,"y":-320,"bCoef":0,"cMask":["ball"]},{"x":-699,"y":-320,"bCoef":2,"cMask":["ball"]},{"x":699,"y":-321,"bCoef":2,"cMask":["ball"]},{"x":0,"y":-320,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":320,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-150,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":90,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":0,"y":-80,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"x":-710,"y":90,"cMask":["ball"]},{"x":-710,"y":321,"cMask":["ball"]},{"x":-710,"y":90,"cMask":["ball"]},{"x":-710,"y":321,"cMask":["ball"]},{"x":-710,"y":-315,"cMask":["ball"]},{"x":-710,"y":-99,"cMask":["ball"]},{"x":710,"y":-90,"cMask":["ball"]},{"x":709,"y":-317,"cMask":["ball"]},{"x":709,"y":-90,"cMask":["ball"]},{"x":709,"y":94,"cMask":["ball"]},{"x":709,"y":319,"cMask":["ball"]},{"x":-699,"y":274,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":-141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-506,"y":-141,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-699,"y":-274,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":698,"y":273,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":140,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":140,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":-142,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":505,"y":-142,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":698,"y":-275,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":-701,"y":90,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":-701,"y":-90,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO","blueKO"]},{"x":699,"y":90,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":699,"y":-90,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO","blueKO"]},{"x":-713,"y":90,"cMask":["ball"]},{"x":-713,"y":321,"cMask":["ball"]},{"x":-713,"y":-315,"cMask":["ball"]},{"x":-713,"y":-99,"cMask":["ball"]},{"x":712,"y":-317,"cMask":["ball"]},{"x":712,"y":-90,"cMask":["ball"]},{"x":712,"y":94,"cMask":["ball"]},{"x":712,"y":319,"cMask":["ball"]},{"x":704,"y":-317,"cMask":["ball"]},{"x":704,"y":-90,"cMask":["ball"]},{"x":704,"y":-317,"cMask":["ball"]},{"x":704,"y":-90,"cMask":["ball"]},{"x":704,"y":94,"cMask":["ball"]},{"x":704,"y":319,"cMask":["ball"]},{"x":704,"y":94,"cMask":["ball"]},{"x":704,"y":319,"cMask":["ball"]},{"x":-705,"y":90,"cMask":["ball"]},{"x":-705,"y":321,"cMask":["ball"]},{"x":-705,"y":90,"cMask":["ball"]},{"x":-705,"y":321,"cMask":["ball"]},{"x":-705,"y":-315,"cMask":["ball"]},{"x":-705,"y":-99,"cMask":["ball"]},{"x":-705,"y":-315,"cMask":["ball"]},{"x":-705,"y":-99,"cMask":["ball"]},{"x":-699,"y":319.88890075683594,"bCoef":2,"cMask":["ball"]},{"x":699,"y":318.88890075683594,"bCoef":2,"cMask":["ball"]}],"segments":[{"v0":8,"v1":9,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":9,"v1":10,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":10,"v1":11,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":12,"v1":13,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":13,"v1":14,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":14,"v1":15,"bCoef":0.1,"cMask":["ball"],"color":"F8F8F8"},{"v0":4,"v1":5,"bCoef":0.1,"vis":false,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"v0":5,"v1":6,"bCoef":0.1,"curve":180,"curveF":6.123233995736766e-17,"cMask":["red","blue"],"cGroup":["blueKO"],"color":"F8F8F8"},{"v0":6,"v1":5,"bCoef":0.1,"curve":180,"curveF":6.123233995736766e-17,"cMask":["red","blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":6,"v1":7,"bCoef":0.1,"vis":false,"cMask":["red","blue"],"cGroup":["redKO","blueKO"]},{"v0":16,"v1":17,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":18,"v1":19,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":22,"v1":23,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":24,"v1":25,"bCoef":1.25,"cMask":["ball"],"color":"F8F8F8"},{"v0":26,"v1":27,"bCoef":0,"cMask":["ball"],"color":"F8F8F8"},{"v0":28,"v1":29,"bCoef":2,"cMask":["ball"],"color":"F8F8F8"},{"v0":30,"v1":31,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"],"color":"F8F8F8"},{"v0":32,"v1":33,"bCoef":0.1,"cMask":["red","blue"],"cGroup":["redKO","blueKO"],"color":"F8F8F8"},{"v0":42,"v1":43,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":44,"v1":45,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":46,"v1":47,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":49,"v1":50,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":51,"v1":52,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":54,"v1":53,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":56,"v1":55,"bCoef":0.1,"curve":10,"curveF":11.430052302761343,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":58,"v1":57,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":59,"v1":60,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":61,"v1":62,"bCoef":0.1,"curve":10,"curveF":11.430052302761343,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":63,"v1":64,"bCoef":0.1,"curve":89.99999999999997,"curveF":1.0000000000000004,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":65,"v1":66,"bCoef":0.1,"cMask":["blue"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":67,"v1":68,"bCoef":0.1,"cMask":["red"],"cGroup":["redKO"],"color":"F8F8F8"},{"v0":69,"v1":70,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":71,"v1":72,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":73,"v1":74,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":75,"v1":76,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":77,"v1":78,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":79,"v1":80,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":81,"v1":82,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":83,"v1":84,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":85,"v1":86,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":87,"v1":88,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":89,"v1":90,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":91,"v1":92,"vis":false,"cMask":["ball"],"color":"F8F8F8"},{"v0":93,"v1":94,"bCoef":2,"cMask":["ball"],"color":"F8F8F8"}],"planes":[{"normal":[0,1],"dist":-320,"cMask":["ball"]},{"normal":[0,-1],"dist":-317.5,"cMask":["ball"]},{"normal":[0,1],"dist":-350,"bCoef":0.1},{"normal":[0,-1],"dist":-350,"bCoef":0.1},{"normal":[1,0],"dist":-800,"bCoef":0.1},{"normal":[-1,0],"dist":-800,"bCoef":0.1}],"goals":[{"p0":[-707,-94],"p1":[-707,86],"team":"red"},{"p0":[706,90],"p1":[706,-90],"team":"blue"}],"discs":[{"radius":6.25,"bCoef":0.4,"invMass":1.5,"color":"FFCC00","cGroup":["ball","kick","score"]},{"pos":[-700,89],"radius":6,"invMass":0,"color":"FF0000"},{"pos":[-700,-99],"radius":6,"invMass":0,"color":"FF0000"},{"pos":[700,90],"radius":6,"invMass":0,"color":"33FF"},{"pos":[701,-89],"radius":6,"invMass":0,"color":"33FF"}],"playerPhysics":{"bCoef":0,"acceleration":0.11,"kickingAcceleration":0.083},"ballPhysics":"disc0","spawnDistance":350}`
});
