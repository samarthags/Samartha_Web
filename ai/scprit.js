const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

// =======================
// 🔑 API Keys Rotation
// =======================
const API_KEYS = [
  "AIzaSyBwtb3i2Avw3NL5vS4oNqB3im98AqB4h8s",
  "AIzaSyAo6vdXNaiUEr4ebry6nBYAjPkxF5HiC18",
  "AIzaSyABjyHBxmOpX9LjfKgKB_nBn_DxrJxL0bE",
  "AIzaSyDrIdlXsKdqGBdk5lh2FXAJ_gdjkUxkPXQ",
  "AIzaSyDim3VKQBoOGhVS7tmQysosFR7gdTXFHZw",
  "AIzaSyAL-uu_Ow_cWsW2FvTAd5071hBfB8StOas",
  "AIzaSyAvLLuaKFk1-U6yZBiGzWbcOOBH0rJvxfA",
  "AIzaSyBtOP_l0VsTAxRV_tPJvnc7rUBEdKNDJ_g",
  "43fb96a4edda40e4a646eddf1621955f"
];
const getRandomKey = () => API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
const getApiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${getRandomKey()}`;

let controller, typingInterval;
const chatHistory = [
  {
    role: "model",
    parts: [
      {
        text: `You are **Sam AI**, a smart AI assistant created and developed by **Samartha GS** using GS Model with Google's Gemini API.  

Identity:  
- Name: Sam AI  
- Developer: Samartha GS  
- Website: https://samarthags.in  
- Role: Helpful, friendly, multilingual AI  

About Samartha GS:  
Samartha GS is a developer and innovator from India. He builds AI, web technologies, and digital tools with focus on simplicity and usability.  

When asked "Who are you?", always reply:  
"I am Sam AI, created by Samartha GS using GS Model with Gemini API. Learn more at samarthags.in."`
      }
    ]
  }
];

const userData = { message: "", file: {} };

// =======================
// 🎨 Theme Setup
// =======================
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// =======================
// 📌 Helper Functions
// =======================
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent +=
        (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40);
};

// =======================
// 🤖 Generate Response
// =======================
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    parts: [
      { text: userData.message },
      ...(userData.file.data
        ? [
            {
              inline_data: (({ fileName, isImage, ...rest }) => rest)(
                userData.file
              )
            }
          ]
        : [])
    ]
  });

  try {
    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const responseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .trim();

    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent =
      error.name === "AbortError"
        ? "Response generation stopped."
        : error.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// =======================
// 📤 Handle User Message
// =======================
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding"))
    return;

  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  const userMsgHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        : ""
    }
  `;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(
      botMsgHTML,
      "bot-message",
      "loading"
    );
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600);
};

// =======================
// 📂 File Upload
// =======================
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add(
      "active",
      isImage ? "img-attached" : "file-attached"
    );

    userData.file = {
      fileName: file.name,
      data: base64String,
      mime_type: file.type,
      isImage
    };
  };
});

document
  .querySelector("#cancel-file-btn")
  .addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove(
      "file-attached",
      "img-attached",
      "active"
    );
  });

// =======================
// ⏹ Stop Response
// =======================
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  chatsContainer
    .querySelector(".bot-message.loading")
    ?.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// =======================
// 🎨 Theme Toggle
// =======================
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// =======================
// 🗑 Delete Chats
// =======================
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

// =======================
// 💡 Suggestions
// =======================
document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// =======================
// 📱 Mobile Controls
// =======================
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide =
    target.classList.contains("prompt-input") ||
    (wrapper.classList.contains("hide-controls") &&
      (target.id === "add-file-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

promptForm.addEventListener("submit", handleFormSubmit);
promptForm
  .querySelector("#add-file-btn")
  .addEventListener("click", () => fileInput.click());