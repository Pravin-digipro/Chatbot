(function () {
  const iframe = document.createElement("iframe");

  iframe.src =
    "https://grey-badger-770232.hostingersite.com/chatbot.html";

  iframe.style.position = "fixed";
  iframe.style.bottom = "20px";
  iframe.style.right = "20px";
  iframe.style.width = "420px";
  iframe.style.height = "600px";
  iframe.style.border = "none";
  iframe.style.zIndex = "999999";

  document.body.appendChild(iframe);
})();
