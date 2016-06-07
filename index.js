// 3RES Messager Sample App
// index.js

// Express
var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');

// Socket.io
var io = require('socket.io')(server);

// Rethinkdb
var r = require('rethinkdb');

// Socket.io changefeed events
var changefeedSocketEvents = function(socket, entityName) {
	return function(rows) {
		rows.each(function(err, row) {
			if (err) { return console.log(err); }
			else if (row.new_val && !row.old_val) {
				socket.emit("insert", row.new_val);
			}
		});
	};
};

app.use(express.static('public'));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
});


r.connect({ db: 'Messenger' })
.then(function(connection) {
	io.on('connection', function (socket) {

		// insert new messages
		socket.on('insert', function(message) {
			r.table('Messages').insert(message).run(connection);
		});

		// emit events for changes to todos
		r.table('Messages').changes({ includeInitial: true, squash: true }).run(connection)
		.then(changefeedSocketEvents(socket, 'message'));
	});
	server.listen(9000, () => {
		console.log("listening at port 9000")
	});
})
.error(function(error) {
	console.log('Error connecting to RethinkDB!');
	console.log(error);
});


