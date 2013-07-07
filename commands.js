var util = require('util');

function Command(name, f) {
	this.name = name;
	this.f = f;
}
Command.prototype.tryRun = function(line, g) {
	var matches = new RegExp("^\s*"+this.name).test(line);
	if(matches)
		this.f(g);
	return matches;
};

function PlayerCommand(name, f) {
	Command.call(this, name, f);
}
util.inherits(PlayerCommand, Command);
PlayerCommand.prototype.tryRun = function(line, g) {
	var matches = new RegExp("^\s*"+this.name + ' (.+)').exec(line);
	if(matches) {
		var player = g.players[matches[1]]
		this.f(g, player);
	}
	return matches != null;
};

function NumberCommand(name, f) {
	Command.call(this, name, f);
}
util.inherits(NumberCommand, Command);
NumberCommand.prototype.tryRun = function(line, g) {
	var matches = new RegExp("^\s*"+this.name + ' (\\d+)').exec(line);
	console.log(matches);
	if(matches) {
		var n = +matches[1];
		this.f(g, n);
	}
	return matches != null;
};

var list = exports.list = [
	new Command('players', function(g) {
		util.log(Object.values(g.players).pluck('coloredName').join(', '));
	}),
	new Command('game', function(g) {
		console.log(g);
	}),
	new Command('mass', function(g) {
		console.log('Total mass of the universe: '+g.world.totalMass);
	}),
	new Command('score', function(g, cli) {
		var width = cli ? cli.columns : 50;
		var perMass = width / g.world.totalMass;
		var bar = "";
		var barLength = 0;
		var scoreSoFar = 0;

		Object.forEach(g.players, function(g, p) {
			if(p.snake) {
				var score = p.snake.mass;
				scoreSoFar += score;
				var thisBar = "";
				while(barLength + thisBar.length < scoreSoFar * perMass)
					thisBar += '█';

				barLength += thisBar.length;
				bar += thisBar.colored(p.color);
			}
		});

		console.log(bar);
		console.log(Object.values(g.players).pluck('coloredName').join(', '));
	}),
	new NumberCommand('balls', function(g, n) {
		g.generateBalls(n);
	}),
	new PlayerCommand('kick', function(g, player) {
		player && player.disconnect();
	}),
	new PlayerCommand('kill', function(g, player) {
		player && player.kill();
	}),
	new PlayerCommand('spawn', function(g, player) {
		player && !player.snake && player.spawnSnake(g.world);
	}),
	new PlayerCommand('help', function(g, player) {
		player && player.snake && (player.snake.maxMass *= 2);
	})
]

exports.tryRun = function(line, game, cli) {
	return list.some(function(c) {
		return c.tryRun(line, game, cli);
	});
}
