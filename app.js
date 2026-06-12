const chatBody = document.getElementById("chatBody");
const inputField = document.getElementById("inputField");
const sendBtn = document.getElementById("sendBtn");

function addMessage(text, type) {
  const msg = document.createElement("div");
  msg.className = `message ${type}`;
  msg.textContent = text;
  chatBody.appendChild(msg);
  chatBody.scrollTop = chatBody.scrollHeight;
}

sendBtn.addEventListener("click", sendMessage);
inputField.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = inputField.value.trim();
  if (!text) return;

  addMessage(text, "user");
  inputField.value = "";

  setTimeout(() => {
    addMessage("This is a demo bot response.", "bot");
  }, 800);
}