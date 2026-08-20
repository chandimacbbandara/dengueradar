const form = document.querySelector("#chat-form");
const input = document.querySelector("#message");
const messages = document.querySelector("#messages");
const loading = document.querySelector("#loading");
const sendButton = form.querySelector("button");

function addMessage(text, role) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = input.value.trim();
  if (!message) return;

  addMessage(message, "user");
  input.value = "";
  loading.hidden = false;
  sendButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok && !data.reply) {
      throw new Error(data.error || "The assistant request failed.");
    }
    addMessage(data.reply, "assistant");
  } catch (error) {
    addMessage(error.message || "Unable to contact the assistant.", "error");
  } finally {
    loading.hidden = true;
    sendButton.disabled = false;
    input.focus();
  }
});
