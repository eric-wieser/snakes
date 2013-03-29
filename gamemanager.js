"use strict";

var util = require('util');
var events = require("events");

var facebook = require("./facebook");
var Color = require("./color");
var Player = require("./player");
var Game = require("./game");


function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function GameManager(io) {
	this.io = io;
	this.games = [];
	this.defaultGame = this.createGame('main');
}
util.inherits(GameManager, events.EventEmitter);

GameManager.prototype.getGame = function(name) {
	return this.games.filter(function(g) { return g.name == name; })[0];
}

GameManager.prototype.createGame = function(name) {
	var gm = this;
	var game = new Game(name);
	gm.games.push(game);
	game.log("New game created!");

	game.on('start', function() {

		gm.io.sockets.emit('servermessage', "New game started!");
	})
	.on('player.join', function(p) {
		game.log(p.coloredName + " joined");

		if(this.connectedPlayerCount() == 2) {
			//just left practice mode
			this.reset();
			this.start();
		} else if(this.running) {
			//game is already running
			if(this.joinable())
				p.spawnSnake(this.world);
			else
				p.socket.emit('servermessage', 'You\'ll have to wait for the next game');
		} else {
			//start practice mode
			this.start();
			p.socket.emit('servermessage', 'Practice mode - Waiting for more players');
		}

		p.on('chat', function(msg) {	
			var data = {n: this.name, c: this.color.toInt(), m: msg};
			this.socket.emit('chat', data);
			this.socket.broadcast.emit('chat', data);
			game.log(this.coloredName + ": ".grey + msg)
		});

		game.log(this.connectedPlayerCount().toString() + " players connected");
	})
	.on('player.death', function(p, type, killer) {
		if(type == "enemy") {
			game.log(killer.coloredName + " killed " + p.coloredName);
			// var data = {n: "", c: new Color(192, 192, 192).toInt(), m: "Killed by "+ killer.name};
			// this.socket.emit('chat', data);
			gm.io.sockets.emit(
				'servermessage',
				'<span style="color:' +killer.color.toString()+'">' + htmlEntities(killer.name) + '</span> killed ' + 
				'<span style="color:' +p.color.toString()+'">' +	 htmlEntities(p.name) + '</span>!');
			killer.snake && (killer.snake.maxMass *= 1.5);
		}
		else if(type == "console")
			game.log(this.coloredName + " eliminated");
	})
	.on('player.attack', function(p, target) {
		game.log(p.coloredName + " attacked " + target.coloredName);
	})
	.on('player.quit', function(p) {
		game.log(p.coloredName + " quit");
		game.log(this.connectedPlayerCount().toString() + " players connected");
	})
	.on('player.quit', function(p) {
		//Clear the world if the player is last to leave
		if(Object.size(this.livingPlayers) == 0) {
			this.reset();
			if(this.connectedPlayerCount() >= 2)
				this.start();
		}
	})
	.on('player.death', function(p) {
		//Clear the world if the player is last to leave
		if(Object.size(this.livingPlayers) == 1 && !this.joinable()) {
			var winner = Object.values(this.livingPlayers)[0]
			game.log(p.coloredName + " won");
			gm.io.sockets.emit(
				'servermessage', '<span style="color:' +winner.color.toString()+'">' + htmlEntities(winner.name) + '</span> won!'
			);
			setTimeout(function() {
				this.reset();
				if(this.connectedPlayerCount() >= 2)
					this.start();
			}.bind(this), 2000);
		}
	})

	return game;
}

GameManager.prototype.playerListener = function() {
	var gm = this;
	return function(socket) {
		var player;
		var gotResponse = false;
		var gameName;
		var game;

		socket.on('room', function(name, fn) {
			gameName = name;
			game = gm.getGame(gameName);
			socket.join(gameName);
			console.log("watching " +gameName + ", " + (game ? game.name : "none"));

			facebook.getAPI(socket, function(api) {
				console.log("Retrieved fb info")
				api.me(function(err, user) {
					fn(user);
					if(user) {
						console.log("User is "+user.name)
						player = new Player(socket, user.name, Color.niceColor(Math.random()));

						game = game || gm.createGame(gameName);

						game.addPlayer(player);
						gotResponse = true;
					}
				});
			});
		});

		socket.on('join', function(data, callback) {
			if(!gameName) { console.log('...'); return; }
			//Already had a player join from this socket
			if(gotResponse) return;

			//Sanitize the name - check if a string, and trim
			var name = data.name;
			if(typeof name != "string") return;
			name = name.trim();

			//Prevent names of stupid lengths
			if(name.length < 3 || name.length > 64) {
				callback({error: "Name length invalid"});
				return;
			}

			player = new Player(socket, name, Color.niceColor(data.color));

			if(!game) {
				game = gm.createGame(gameName);

				gotResponse = true;
				callback(true);
				game.addPlayer(player);

			}
			else if(!game.playerByName(name)) {
				gotResponse = true;
				callback(true);
				game.addPlayer(player);
			}
			else {
				callback({error: "Someone else has that name"});
			}
		});
	}
}

module.exports = GameManager;
