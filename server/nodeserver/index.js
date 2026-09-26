const io = require('socket.io')(3000)

const user = {};

io.on('connection' , socket =>{
    socket.on('new-user-joined', name =>{
        user[socket.id] = name;
        socket.broadcast.emit('user-joined',name);
    });
    socket.on('send', massage => {
        socket.broadcast.emit('receive', {message: message, name: user[socket.id]})
    });
})