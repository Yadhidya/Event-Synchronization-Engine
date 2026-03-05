let stompClient = null;
let username = "";

window.onload = () => {
    username = prompt("Enter your username:");
    connect();
};

function connect() {
    const socket = new SockJS('http://localhost:8080/ws');
    stompClient = Stomp.over(socket);

    stompClient.connect({}, () => {
        console.log("Connected");

        // Subscribe to chat topic
        stompClient.subscribe('/topic/chat', (message) => {
            handleEvent(JSON.parse(message.body));
        });

        // Notify join
        sendEvent("USER_JOINED", { username });
    });
}

function sendEvent(type, payload) {
    const event = {
        id: crypto.randomUUID(),
        type: type,
        payload: payload,
        timestamp: Date.now()
    };

    stompClient.send("/app/chat", {}, JSON.stringify(event));
}

function handleEvent(event) {
    switch (event.type) {
        case "MESSAGE_SENT":
            displayMessage(event.payload.sender, event.payload.content);
            break;

        case "USER_JOINED":
            addUser(event.payload.username);
            break;

        case "USER_LEFT":
            removeUser(event.payload.username);
            break;

        case "USER_TYPING":
            showTyping(event.payload.username);
            break;

        case "ONLINE_USERS_UPDATE":
    renderUserList(event.payload);
    break;
    }
}

function displayMessage(sender, content) {
    const messages = document.getElementById("messages");
    const msg = document.createElement("div");
    msg.textContent = sender + ": " + content;
    messages.appendChild(msg);
}
function renderUserList(users) {
    const list = document.getElementById("usersList");
    list.innerHTML = ""; 

    users.forEach(user => {
        const item = document.createElement("li");
        item.textContent = user;
        list.appendChild(item);
    });
}
function showTyping(user) {
    const indicator = document.getElementById("typingIndicator");
    indicator.textContent = user + " is typing...";
    setTimeout(() => {
        indicator.textContent = "";
    }, 2000);
}

document.getElementById("sendBtn").onclick = () => {
    const input = document.getElementById("messageInput");
    const content = input.value.trim();
    if (content) {
        sendEvent("MESSAGE_SENT", {
            sender: username,
            content: content
        });
        input.value = "";
    }
};

document.getElementById("messageInput").addEventListener("input", () => {
    sendEvent("USER_TYPING", { username });
});