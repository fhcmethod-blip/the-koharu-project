// Koharu Admin Desktop — Renderer
let API = "";
let sessionCookie = "";
let activeConversationId = null;
let conversations = [];
let messages = [];
let uploadTier = "free";

// Init
window.addEventListener("DOMContentLoaded", async () => {
  API = await window.koharuAdmin.getApiBase();
  // Check if Enter triggers login
  document.getElementById("login-pass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
});

// --- Login ---
async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-error");

  if (!email || !pass) {
    errEl.textContent = "Enter email and password.";
    return;
  }

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      errEl.textContent = data.error || "Login failed.";
      return;
    }
    // Extract cookie from Set-Cookie header
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) {
      sessionCookie = setCookie.split(";")[0];
    }
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("main-screen").style.display = "flex";
    startPolling();
    loadConversations();
  } catch (e) {
    errEl.textContent = "Network error: " + e.message;
  }
}

// --- Tab switching ---
function switchTab(tab) {
  document.querySelectorAll(".toolbar button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  document.getElementById(tab + "-panel").classList.add("active");
  if (tab === "chat") loadConversations();
  if (tab === "fansly") loadFansly();
}

// --- Chat ---
async function loadConversations() {
  try {
    const res = await fetch(`${API}/api/admin/chat`, {
      headers: { Cookie: sessionCookie },
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.ok) return;
    conversations = data.conversations || [];
    window.koharuAdmin.updateBadge(data.totalUnread || 0);
    renderConvList();
  } catch (e) {
    console.error("loadConversations", e);
  }
}

function renderConvList() {
  const el = document.getElementById("conv-list");
  if (conversations.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:24px">No conversations yet</div>';
    return;
  }
  el.innerHTML = conversations
    .map(
      (c) => `
    <div class="conv-item ${c.id === activeConversationId ? "active" : ""}"
         onclick="selectConversation('${c.id}')">
      <div class="conv-name">
        ${esc(c.subscriberName)}
        ${c.unreadCount > 0 ? `<span class="conv-badge">${c.unreadCount}</span>` : ""}
      </div>
      <div class="conv-preview">${esc(c.lastMessage || "No messages yet")}</div>
    </div>`,
    )
    .join("");
}

async function selectConversation(id) {
  activeConversationId = id;
  renderConvList();
  document.getElementById("chat-input").style.display = "flex";
  try {
    const res = await fetch(`${API}/api/admin/chat?conversationId=${id}`, {
      headers: { Cookie: sessionCookie },
      credentials: "include",
    });
    const data = await res.json();
    if (data.ok) {
      messages = data.messages || [];
      renderMessages();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderMessages() {
  const el = document.getElementById("chat-messages");
  if (messages.length === 0) {
    el.innerHTML = '<div class="empty-state">No messages yet</div>';
    return;
  }
  el.innerHTML = messages
    .map(
      (m) => `
    <div class="msg ${m.direction === "outgoing" ? "outgoing" : "incoming"}">
      <div class="msg-sender">${m.direction === "outgoing" ? "You" : esc(m.senderName)}</div>
      <div class="msg-bubble">${esc(m.content)}</div>
      <div class="msg-time">${formatTime(m.createdAt)}</div>
    </div>`,
    )
    .join("");
  el.scrollTop = el.scrollHeight;
}

async function sendReply() {
  const input = document.getElementById("msg-input");
  const content = input.value.trim();
  if (!content || !activeConversationId) return;
  input.value = "";
  input.disabled = true;

  try {
    const res = await fetch(`${API}/api/admin/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      credentials: "include",
      body: JSON.stringify({ conversationId: activeConversationId, content }),
    });
    const data = await res.json();
    if (data.ok) {
      messages.push(data.message);
      renderMessages();
      loadConversations();
    }
  } catch (e) {
    console.error(e);
  }
  input.disabled = false;
  input.focus();
}

// --- Upload ---
function selectTier(tier, btn) {
  uploadTier = tier;
  document.querySelectorAll(".tier-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// Drag-and-drop
const dropZone = document.getElementById("drop-zone");
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  handleFiles(e.dataTransfer.files);
});

async function handleFiles(fileList) {
  const log = document.getElementById("upload-log");
  log.innerHTML = "";
  const preview = document.getElementById("upload-preview");
  preview.innerHTML = "";

  for (const file of fileList) {
    const isVideo = file.type.startsWith("video/");
    const type = isVideo ? "videos" : "photos";
    const tier = uploadTier;

    log.innerHTML += `<p>Uploading ${esc(file.name)} to vault/${tier}/${type}/ ...</p>`;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tier", tier);
      formData.append("type", type);

      const res = await fetch(`${API}/api/ppv/upload`, {
        method: "POST",
        headers: { Cookie: sessionCookie },
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        log.innerHTML += `<p class="ok">✓ ${esc(file.name)} uploaded</p>`;
        // Show preview for images
        if (!isVideo) {
          const url = URL.createObjectURL(file);
          preview.innerHTML += `<img src="${url}" alt="${esc(file.name)}">`;
        }
      } else {
        const err = await res.text().catch(() => "Unknown error");
        log.innerHTML += `<p class="err">✗ ${esc(file.name)}: ${err}</p>`;
      }
    } catch (e) {
      log.innerHTML += `<p class="err">✗ ${esc(file.name)}: ${e.message}</p>`;
    }
  }
}

// --- Fansly ---
async function loadFansly() {
  const el = document.getElementById("fansly-list");
  try {
    const res = await fetch(`${API}/api/fansly/admin`, {
      headers: { Cookie: sessionCookie },
      credentials: "include",
    });
    const data = await res.json();
    if (!data.ok || !data.pending || data.pending.length === 0) {
      el.innerHTML = '<div class="empty-state">No pending verification codes</div>';
      return;
    }
    el.innerHTML = data.pending
      .map(
        (v) => `
      <div class="ver-item">
        <div class="ver-info">
          <div class="ver-code">${esc(v.code)}</div>
          <div class="ver-meta">
            Fansly: @${esc(v.fanslyUsername)} · wants <strong>${v.requestedTier === "plus" ? "Touch ($15)" : "Claimed ($35)"}</strong><br>
            ${v.userDisplayName ? `Site: ${esc(v.userDisplayName)} (${esc(v.userEmail || "")}) · ` : ""}
            ${formatTime(v.createdAt)}
          </div>
        </div>
        <button onclick="approveCode('${v.code}')">Approve</button>
      </div>`,
      )
      .join("");
  } catch (e) {
    el.innerHTML = '<div class="empty-state">Could not load verifications</div>';
  }
}

async function approveCode(code) {
  try {
    const res = await fetch(`${API}/api/fansly/admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
      credentials: "include",
      body: JSON.stringify({ action: "approve", code }),
    });
    if (res.ok) {
      loadFansly();
    }
  } catch (e) {
    console.error(e);
  }
}

// --- Polling ---
function startPolling() {
  // Poll for new conversations every 8 seconds
  setInterval(async () => {
    if (document.getElementById("chat-panel").classList.contains("active")) {
      await loadConversations();
    }
    // Check unread count even when on other tabs
    try {
      const res = await fetch(`${API}/api/admin/chat`, {
        headers: { Cookie: sessionCookie },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          const unread = data.totalUnread || 0;
          window.koharuAdmin.updateBadge(unread);
          const dot = document.getElementById("chat-dot");
          dot.style.display = unread > 0 ? "inline-block" : "none";
        }
      }
    } catch (e) {
      // API offline — PC might be asleep
    }
  }, 8000);
}

// --- Helpers ---
function esc(s) {
  if (!s) return "";
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}