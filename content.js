function send(video) {
  chrome.runtime.sendMessage({
    type: "VIDEO_FOUND",
    video
  });
}

// =========================
// 🎥 VIDEO TAGS
// =========================

function detectVideoTags() {
  document.querySelectorAll("video").forEach(v => {
    if (v.src) {
      send({ url: v.src, type: "mp4" });
    }
  });
}

// =========================
// 🎥 IFRAME (VIMEO)
// =========================

function detectIframes() {
  document.querySelectorAll("iframe").forEach(iframe => {
    const src = iframe.src;

    if (!src) return;

    // Vimeo
    const match = src.match(/vimeo\.com\/video\/(\d+)/);

    if (match) {
      chrome.runtime.sendMessage({
        type: "VIMEO_ID",
        id: match[1]
      });
    }
  });
}

// =========================
// 🔥 NETWORK (FORTE)
// =========================

const open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function () {
  this.addEventListener("load", function () {
    const url = this.responseURL;

    if (
      url.includes(".m3u8") ||
      url.includes(".mp4")
    ) {
      send({ url, type: "hls" });
    }
  });

  open.apply(this, arguments);
};

// =========================
// 🚀 INIT
// =========================

detectVideoTags();
detectIframes();

// observar mudanças
const observer = new MutationObserver(() => {
  detectVideoTags();
  detectIframes();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});