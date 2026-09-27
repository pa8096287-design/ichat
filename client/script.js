// ─────────────────────────────────────────────
//  CONNECT TO SOCKET.IO SERVER
//  The empty string "" means "connect to whatever
//  server served this file" — so localhost:3000
// ─────────────────────────────────────────────
// const socket = io();
const socket = io();

// ─────────────────────────────────────────────
//  GRAB DOM ELEMENTS
// ─────────────────────────────────────────────
const usernameOverlay  = document.getElementById("usernameOverlay");
const chatApp          = document.getElementById("chatApp");
const usernameInput    = document.getElementById("usernameInput");
const joinBtn          = document.getElementById("joinBtn");
const displayUsername  = document.getElementById("displayUsername");

const messagesDiv      = document.getElementById("messages");
const messageInput     = document.getElementById("messageInput");
const sendBtn          = document.getElementById("sendBtn");

const typingIndicator  = document.getElementById("typingIndicator");
const typingText       = document.getElementById("typingText");

const onlineCountEl    = document.getElementById("onlineCount");
const headerOnlineEl   = document.getElementById("headerOnline");

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let myUsername = "";         // Our chosen name
let typingTimeout = null;    // Timer to detect when we STOP typing

// ─────────────────────────────────────────────
//  STEP 1: JOIN CHAT
//  User fills in name and clicks "Join"
// ─────────────────────────────────────────────
function joinChat() {
  const name = usernameInput.value.trim();

  if (!name) {
    usernameInput.style.borderColor = "#e74c3c"; // Flash red
    usernameInput.placeholder = "Please enter a name!";
    return;
  }

  myUsername = name;

  // Hide the overlay, show the chat
  usernameOverlay.style.display = "none";
  chatApp.style.display = "flex";

  // Show username in sidebar
  displayUsername.textContent = myUsername;

  // Focus the message box immediately
  messageInput.focus();

  // Tell the server our username
  socket.emit("set_username", myUsername);
}

// Click the button OR press Enter to join
joinBtn.addEventListener("click", joinChat);
usernameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") joinChat();
});

// ─────────────────────────────────────────────
//  STEP 2: SEND A MESSAGE
// ─────────────────────────────────────────────
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return; // Ignore empty messages

  // Emit the message to the server
  socket.emit("send_message", { message: text });

  // Clear the input and refocus
  messageInput.value = "";
  messageInput.focus();

  // Stop the typing indicator (we just sent)
  socket.emit("stop_typing");
  clearTimeout(typingTimeout);
}

// Click Send button OR press Enter
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ─────────────────────────────────────────────
//  TYPING INDICATOR — emit while user types
//  We emit "typing" on every keypress, then
//  start a 2-second timer to emit "stop_typing"
// ─────────────────────────────────────────────
messageInput.addEventListener("input", () => {
  // Don't emit typing if input is empty
  if (messageInput.value.trim() === "") {
    socket.emit("stop_typing");
    clearTimeout(typingTimeout);
    return;
  }

  socket.emit("typing"); // Tell server we're typing

  clearTimeout(typingTimeout); // Reset the stop timer

  // After 2 seconds of no typing, tell server we stopped
  typingTimeout = setTimeout(() => {
    socket.emit("stop_typing");
  }, 2000);
});

// ─────────────────────────────────────────────
//  SOCKET LISTENERS — react to server events
// ─────────────────────────────────────────────

// ── Someone sent a message ────────────────────
socket.on("receive_message", (data) => {
  const isMe = data.username === myUsername;
  addMessageBubble(data.username, data.message, data.time, isMe);
});

// ── Someone joined ────────────────────────────
socket.on("user_joined", (data) => {
  addSystemMessage(data.message);
});

// ── Someone left ──────────────────────────────
socket.on("user_left", (data) => {
  addSystemMessage(data.message);
});

// ── Online user count updated ─────────────────
socket.on("online_count", (count) => {
  onlineCountEl.textContent = count;
  headerOnlineEl.textContent = `${count} online`;
});

// ── Someone else is typing ────────────────────
socket.on("user_typing", (data) => {
  typingText.textContent = `${data.username} is typing...`;
  typingIndicator.style.display = "flex";
});

// ── Typing stopped ────────────────────────────
socket.on("user_stop_typing", () => {
  typingIndicator.style.display = "none";
});

// ─────────────────────────────────────────────
//  DOM HELPER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * addMessageBubble — creates and appends a chat bubble
 * @param {string}  username - who sent it
 * @param {string}  message  - the text
 * @param {string}  time     - "HH:MM" from server
 * @param {boolean} isMe     - true = right-align purple bubble
 */
function addMessageBubble(username, message, time, isMe) {
  // Outer wrapper — controls left/right alignment
  const wrap = document.createElement("div");
  wrap.classList.add("message-wrap", isMe ? "me" : "other");

  // The bubble itself
  const bubble = document.createElement("div");
  bubble.classList.add("bubble");

  // Show sender name only on other people's messages
  if (!isMe) {
    const nameEl = document.createElement("div");
    nameEl.classList.add("bubble-username");
    nameEl.textContent = username;
    bubble.appendChild(nameEl);
  }

  // Message text
  const textEl = document.createElement("div");
  textEl.classList.add("bubble-text");
  textEl.textContent = message; // .textContent prevents XSS

  // Timestamp
  const timeEl = document.createElement("div");
  timeEl.classList.add("bubble-time");
  timeEl.textContent = time;

  bubble.appendChild(textEl);
  bubble.appendChild(timeEl);
  wrap.appendChild(bubble);
  messagesDiv.appendChild(wrap);

  scrollToBottom(); // Always scroll after adding a message
}

/**
 * addSystemMessage — "Alex joined the chat" style line
 * @param {string} text
 */
function addSystemMessage(text) {
  const el = document.createElement("div");
  el.classList.add("system-message");
  el.textContent = text;
  messagesDiv.appendChild(el);
  scrollToBottom();
}

/**
 * scrollToBottom — smoothly scroll messages to the latest one
 */
function scrollToBottom() {
  messagesDiv.scrollTo({
    top: messagesDiv.scrollHeight,
    behavior: "smooth",
  });
}