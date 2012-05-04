var express = require('express');
var socketio = require('socket.io');


var app = express.createServer();
app.listen(8090);
app.use(express.static(__dirname));
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io = socketio.listen(app);
io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});