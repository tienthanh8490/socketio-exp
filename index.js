/*
TODO:
- Add “{user} is typing” functionality
- Show who’s online
- Add private messaging
- Add room functionality
- Username should be unique
- Make a proper app & API doc
- Reliable channel: Acknowledge that message received
- "seen" feature
- Fix duplicate event when leave room
- Stress test to see message drop
- Stats of who are in which room
- UI to click on user in room and send
- Regex to have IRC-like syntax to join / send private msg
- Reference: https://github.com/Zolomon/ShitChat
- Fix private message fail when using namespace
- More proper error handler and unit tests
---------------------------------------
Rules:
- Backend does not handle UI logic. Just pass object to frontend
*/

var app = require('express')();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server).of('/chat');

app.get('/chat', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/conn', function(req,res){
  var result = io.sockets.length.toString();
  res.send(result);
});

io.on('connection', function(socket){

  // io.emit echoes the event to all connected sockets
  io.emit('newConnection', socket.id);

  /**
   * TODO: send to those in lobby only
   */
  socket.on('chatMessage', function(msg){

    // broadcast to room
    // Use io.adapter.rooms for io with namespace
    // Use io.sockets.adapter.rooms for io without namespace
    if ( (msg.broadcastRoom) && (io.adapter.rooms.hasOwnProperty(msg.broadcastRoom)) ){
      socket.broadcast.to(msg.broadcastRoom).emit('chatMessage',{
        sender: msg.sender,
        content: msg.content,
        self: false
      });
    }
    else{ // else, broadcast to all
      // socket.broadcast relays the event to all sockets except the sender

      //console.log('---',io.sockets);
      console.log('||||',io);
      
      socket.broadcast.emit('chatMessage', {
        sender: msg.sender,
        content: msg.content,
        self: false
      });

    }
    
    // socket.emit echoes the event to the same socket only
    socket.emit('chatMessage', {
      content: msg.content,
      self: true
    });

  });

  socket.on('disconnect', function(){
  	io.emit('newDisconnection', socket.username || socket.id);
    //console.log('---->Disconnect',io.sockets);
  });

  socket.on('usernameChanged', function(username){

    // Notify self
    socket.emit('usernameChanged',{
      self: true,
      from: socket.username || socket.id,
      to: username
    })

    // Notify the rest
  	socket.broadcast.emit('usernameChanged', {
      self: false,
  		from: socket.username || socket.id,
  		to: username
  	});

    // Change username finally
    socket.username = username;

  });

  socket.on('login', function(username){
    socket.username = username;

    socket.emit('loggedIn',{
      self: true,
      username: username
    }); 

    socket.broadcast.emit('loggedIn',{
      self: false,
      username: username
    });  
  });

  socket.on('roomChanged', function(room){
    socket.join(room, function(){
      socket.emit('roomChanged',{
        self: true,
        rooms: socket.rooms
      });
      socket.broadcast.emit('roomChanged',{
        self: false,
        user: socket.username || socket.id,
        room: room
      });
    });
  });

  /**
   * TODO: Warning/Reconfirm if leaving lobby
   */
  socket.on('leaveRoom', function(room){
    socket.leave(room, function(){
      socket.emit('leaveRoom',{
        self: true,
        rooms: socket.rooms
      });
      socket.broadcast.emit('leaveRoom',{
        self: false,
        user: socket.username || socket.id,
        room: room
      });
    });
  });

  socket.on('private', function(msg){
    
    /**
     * Works even if peer has left their default room
     * TODO: Handle exception if target not found
     * Alternatives:
     * io.sockets.sockets Array [{socket1}, {socket2}]
     * io.sockets.adapter.sids Object {socket1: {}, socket2: {}}
     * io.sockets.adapter.rooms Object {room1: {}, room2: {}}
     * io.sockets.server.eio.clients Object Client sockets
     * io.sockets.server.engine.clients Object Client sockets
     */
      
    // IO with namespace  
    if (io.connected[msg.target]){
      io.connected[msg.target].emit('private',{
        sender: msg.sender,
        content: msg.content
      });
    }
    else{
      socket.emit('err',{
        err: 'target not found'
      });
    }

    // socket.emit echoes the event to the same socket only
    socket.emit('chatMessage', {
      content: msg.content,
      self: true
    });

    /*
    // IO without namespace
    if (io.sockets.connected[msg.target]){
      io.sockets.connected[msg.target].emit('private',{
        sender: msg.sender,
        content: msg.content
      });
    }
    else{
      socket.emit('err',{
        err: 'target not found'
      });
    }
    */
    
    /*
    // This only works if peer hasn't left her default room (room==socket.id); 
    socket.broadcast.to(msg.target).emit('private',{
      sender: msg.sender,
      content: msg.content
    });
    */

  });

  socket.emit('login');

});

// Temporarily using port 80 due to unfixed client bug when using port other than 80
// https://github.com/Automattic/socket.io-client/issues/812
server.listen(80, function(){
  console.log('listening on *:80');
});






