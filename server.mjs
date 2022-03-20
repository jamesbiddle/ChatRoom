// Simple express/socket.io server chatroom

// Import necessary packages and setup the server
import express from 'express';
const PORT = process.env.PORT || 5000
const app = express();
import { createServer } from 'http';
const server = createServer(app);
import { Server } from "socket.io";
const io = new Server(server);
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

// Send index.html when a user visits the page
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname + '/'));
//define the route for "/"
app.get("/", function (request, response) {
    //show this file when the "/" is requested
    response.sendFile(__dirname + "/index.html");
});

// Set server global variables
var max_messages = 100;
var message_history = [];
var active_users = {};

// Establish the socket connection
io.on("connection", (socket) => {

    // Register a new user with the server 
    // This event is fired on user connection
    socket.on('register', (clientUuid, display_name, callback) => {
        // If no id is present, make a new unique id
        var id = clientUuid == null ? unique_id() : clientUuid;
        var name = display_name == null ? unique_name() : display_name;

        var info = {
            'id': id,
            'display_name': name
        };
        active_users[socket.id] = info;
        socket.emit('chat_history', message_history)
        callback(info)
    })

    // Notify a disconnection and remove the user from the active users object
    socket.on('disconnect', () => {
        var user_info = active_users[socket.id];
        var message = {
            sender_id: user_info.id,
            sender_name: user_info.display_name,
            type: 'disconnected'
        }
        delete active_users[socket.id];
        add_history(message);
        io.emit('incoming_message', message)
    })

    // On a new message, append it to the chat history and broadcast to all users
    socket.on('message', (message) => {
        add_history(message);
        io.emit('incoming_message', message)
    })

    // Handle a name change
    socket.on('new_name', (message) => {
        var user_info = active_users[socket.id];
        var id = user_info.id;
        var new_name = message.new_name;
        var old_name = user_info.display_name;

        // Check if name is already in use
        var unique = check_unique_name(new_name);
        // If it is, only notify the proposer of the rejection
        if (!unique) {
            var response = {
                old_name: old_name,
                new_name: new_name,
                rejected: true,
                type: 'namechange'
            };
            socket.emit('incoming_message', response);
        }
        // Otherwise notify all users and confirm the change
        else {
            update_history(id, new_name);
            io.emit('chat_history', message_history);
            var response = {
                sender_id: id,
                old_name: old_name,
                new_name: new_name,
                rejected: false,
                type: 'namechange'
            }
            add_history(response);
            socket.emit('update_name', response);
            io.emit('incoming_message', response);
            user_info.display_name = new_name;
        }
    })
})

// Broadcast the server
server.listen(PORT, () => {
});

// Generate a unique id
function unique_id() {
    var unique = false;
    while (!unique) {
        var id = uuidv4();
        unique = check_unique_id(id);
    }
    return id;
}

function check_unique_id(id) {
    for (const key in active_users) {
        if (active_users[key].id === id) return false;
    }
    return true;
}

// Generate a random display name
function unique_name() {
    var unique = false;
    while (!unique) {
        var name = 'User' + random_string(6);
        unique = check_unique_name(name);
    }
    return name;
}

function check_unique_name(name) {
    for (const key in active_users) {
        if (active_users[key].display_name === name) return false;
    }
    return true;
}

function random_string(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random()
            * charactersLength));
    }
    return result;
}

function add_history(message) {
    message_history.push(message)
    if (message_history.length > max_messages) {
        message_history.shift()
    }
}

function update_history(id, new_name) {
    for (const message of message_history) {
        if (message.sender_id === id && message.type == 'chatmessage') {
            message.sender_name = new_name;
        }
    }
}