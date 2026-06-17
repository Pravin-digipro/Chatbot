(function () {
  // ── Floating toggle button (lives on the parent page) ─────────────────────
  const btn = document.createElement("button");
  btn.id = "__dp_chat_btn";
  Object.assign(btn.style, {
    position:     "fixed",
    bottom:       "24px",
    right:        "24px",
    width:        "60px",
    height:       "60px",
    borderRadius: "50%",
    border:       "none",
    cursor:       "pointer",
    background:   "linear-gradient(135deg,#6366f1,#06b6d4)",
    color:        "white",
    fontSize:     "26px",
    lineHeight:   "1",
    boxShadow:    "0 10px 30px rgba(0,0,0,0.25)",
    zIndex:       "999999",
    transition:   "transform 0.2s, box-shadow 0.2s",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    padding:      "0",
    fontFamily:   "inherit",
    outline:      "none"
  });
  btn.setAttribute("aria-label", "Open DigiPro chat");
  btn.textContent = "💬";

  btn.onmouseover = () => { btn.style.transform = "scale(1.08)"; btn.style.boxShadow = "0 14px 36px rgba(0,0,0,0.3)"; };
  btn.onmouseout  = () => { btn.style.transform = "scale(1)";    btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)"; };

  // ── iframe (hidden until opened) ──────────────────────────────────────────
  const iframe = document.createElement("iframe");
  iframe.src   = "https://grey-badger-770232.hostingersite.com/chatbot.html";
  iframe.title = "DigiPro Assistant";
  Object.assign(iframe.style, {
    position:   "fixed",
    border:     "none",
    zIndex:     "999998",
    display:    "none",
    opacity:    "0",
    transition: "opacity 0.25s ease"
  });

  function applyDimensions() {
    const mobile = window.innerWidth <= 520;
    Object.assign(iframe.style, mobile ? {
      width: "100%", height: "100%",
      bottom: "0",   right: "0",
      borderRadius: "0", boxShadow: "none"
    } : {
      width: "420px", height: "500px",
      bottom: "100px", right: "24px",
      borderRadius: "20px",
      boxShadow: "0 30px 80px rgba(0,0,0,0.2)"
    });
  }
  applyDimensions();
  window.addEventListener("resize", applyDimensions);

  // ── Open / close ──────────────────────────────────────────────────────────
  let isOpen = false;

  function openChat() {
    iframe.style.display = "block";
    requestAnimationFrame(() => iframe.style.opacity = "1");
    btn.textContent   = "✕";
    btn.style.fontSize = "20px";
    btn.setAttribute("aria-label", "Close DigiPro chat");
    isOpen = true;
  }

  function closeChat() {
    iframe.style.opacity = "0";
    setTimeout(() => iframe.style.display = "none", 260);
    btn.textContent    = "💬";
    btn.style.fontSize  = "26px";
    btn.setAttribute("aria-label", "Open DigiPro chat");
    isOpen = false;
  }

  btn.onclick = () => isOpen ? closeChat() : openChat();

  // ── Receive close signal from chatbot iframe ──────────────────────────────
  window.addEventListener("message", e => {
    if (e.data && e.data.type === "digipro-close") closeChat();
  });

  document.body.appendChild(iframe);
  document.body.appendChild(btn);
})();
