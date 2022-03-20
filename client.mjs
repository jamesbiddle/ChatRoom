const socket = io();

// Global variables to use throughout the session
var user_info = {}
user_info.id = sessionStorage.getItem('id');
user_info.display_name = sessionStorage.getItem('display_name');

// This code will run as soon as a connection is established
socket.on('connect', () => {
    // Register the new connection 
    // use a previously stored id and display name if present
    socket.emit('register', user_info.id, user_info.display_name, (new_info) => {
        user_info = new_info;
        sessionStorage.setItem('id', user_info.id);
        //sessionStorage.setItem('display_name', user_info.display_name);
        update_name(user_info.display_name)
        // Send a user connected message
        var message = {
            sender_id: user_info.id,
            sender_name: user_info.display_name,
            type: 'connected'
        }
        socket.emit('message', message)
    })
})

// Handle incoming messages
socket.on('incoming_message', (message) => {
    receive_message(message)
})

// Receive a chat history stored as a list of messages
socket.on('chat_history', (history) => {
    // Wipe the current messages
    var chatbox = document.getElementById('chatbox');
    chatbox.innerHTML = "";
    for (const message of history) {
        receive_message(message)
    }
})

// Handle a new name
socket.on('update_name', (message) => {
    var new_name = message.new_name;
    update_name(new_name)
})

// Process and display incoming messages
function receive_message(message) {
    // Check if user was scrolled to the bottom of the chat
    var chatbox = document.getElementById('chatbox');
    var at_bottom = chatbox.offsetHeight + chatbox.scrollTop >= chatbox.scrollHeight

    // Add new message to chatbox
    var type = message.type;
    if (type === 'namechange') {
        var old_name = message.old_name;
        var new_name = message.new_name;
        var rejected = message.rejected;
        var elem = display_namechange(old_name, new_name, rejected)
    }
    else {
        var sender_id = message.sender_id;
        var sender_name = message.sender_name;
        var text = message.text;
        if (sender_id === user_info.id) {
            var elem = display_message(sender_name, text, type, true);
        }
        else {
            var elem = display_message(sender_name, text, type);
        }
    }

    // If client was at bottom, scroll the new message into view
    if (at_bottom) {
        elem.scrollIntoView();
    }
}

// Display messages in the chat box
function display_message(name, message, type, self = false) {
    var chatbox = document.getElementById('chatbox');
    var message_box = document.createElement('div');
    message_box.className = 'message-box';

    if (type === 'connected') {
        message = `${name} connected`;
    }
    else if (type === 'disconnected') {
        message = `${name} disconnected`;
    }
    else if (type === 'chatmessage') {
        if (name) {
            var name_div = document.createElement('div');
            if (self) {
                name_div.className = 'your-name'
            }
            else {
                name_div.className = 'other-name'
            };
            name_div.textContent = name;
            message_box.appendChild(name_div);
        }
    }

    var message_div = document.createElement('div');
    message_div.className = 'message';
    message_div.textContent = message;

    message_box.appendChild(message_div);
    chatbox.appendChild(message_box);
    return message_box;
}

// Display name changes in the chat box
function display_namechange(old_name, new_name, rejected = false) {
    var chatbox = document.getElementById('chatbox');
    var message_box = document.createElement('div');
    message_box.className = 'message-box';
    if (rejected) {
        var message = `Name "${new_name}" is already taken`;
    }
    else {
        var message = `${old_name} changed their name to ${new_name}`;
    }
    var message_div = document.createElement('div');
    message_div.className = 'message';
    message_div.textContent = message;

    message_box.appendChild(message_div);
    chatbox.appendChild(message_box);
    return message_box;
}

// Update and save a new name
function update_name(new_name) {
    user_info.display_name = new_name;
    sessionStorage.setItem('display_name', new_name);
    // Change document header to reflect name change
    var header = document.getElementById('header');
    header.textContent = `Welcome to the S4S chatroom, ${new_name}`;
}

// Add event listeners for the message box form
var send_form = document.getElementById("message_form")
send_form.addEventListener('submit', (e) => {
    var message_text = send_form.elements["message-input"].value;
    var message = {
        sender_id: user_info.id,
        sender_name: user_info.display_name,
        text: message_text,
        type: 'chatmessage'
    }
    socket.emit('message', message)
    send_form.elements["message-input"].value = '';
    // Supresses form refresh
    e.preventDefault();
})

// Add event listeners for the name change form
var name_name = document.getElementById("name_form")
name_form.addEventListener('submit', (e) => {
    var new_name = name_form.elements["name-input"].value;
    var message = {
        sender_id: user_info.id,
        new_name: new_name,
    }
    socket.emit('new_name', message)
    name_form.elements["name-input"].value = '';
    // Supresses form refresh
    e.preventDefault();
})