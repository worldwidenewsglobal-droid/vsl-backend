function detectVideosDOM() {
  const iframes = document.querySelectorAll("iframe");

  iframes.forEach(iframe => {
    const src = iframe.src;

    if (!src) return;

    if (
      src.includes("vimeo.com") ||
      src.includes("youtube.com") ||
      src.includes("player")
    ) {
      chrome.runtime.sendMessage({
        type: "FOUND_IFRAME",
        url: src
      });
    }
  });
}

// inicial
detectVideosDOM();

// observar lazy load
const observer = new MutationObserver(() => {
  detectVideosDOM();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});