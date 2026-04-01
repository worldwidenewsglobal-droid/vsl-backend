function safeSend(video) {
  try {
    chrome.runtime.sendMessage({
      type: "VIDEO_FOUND",
      video
    });
  } catch (e) {}
}

// =========================
// FETCH (VTURB PRINCIPAL)
// =========================

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const res = await originalFetch(...args);

  try {
    const url = args[0];

    if (typeof url === "string") {

      if (url.includes(".m3u8")) {
        safeSend({ url, type: "hls" });
      }

      if (url.includes(".ts") && url.includes("segment")) {
        safeSend({ url, type: "ts" });
      }
    }

  } catch (e) {}

  return res;
};

// =========================
// XHR (fallback)
// =========================

const open = XMLHttpRequest.prototype.open;

XMLHttpRequest.prototype.open = function () {

  this.addEventListener("load", function () {

    const url = this.responseURL;

    if (!url) return;

    if (url.includes(".m3u8")) {
      safeSend({ url, type: "hls" });
    }

    if (url.includes(".ts") && url.includes("segment")) {
      safeSend({ url, type: "ts" });
    }

  });

  open.apply(this, arguments);
};