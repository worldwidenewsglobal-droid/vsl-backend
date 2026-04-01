// players/vturb.js

(function () {

  function send(video) {
    try {
      chrome.runtime.sendMessage({
        type: "VIDEO_FOUND",
        video
      });
    } catch (e) {}
  }

  console.log("🔥 VTURB detector ativo");

  // =========================
  // 🎯 INTERCEPT FETCH
  // =========================

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const res = await originalFetch(...args);

    try {
      const url = args[0];

      if (typeof url === "string") {

        if (url.includes(".m3u8")) {
          send({ url, type: "hls" });
        }

        if (url.includes(".ts") && url.includes("segment")) {
          send({ url, type: "ts" });
        }

      }
    } catch (e) {}

    return res;
  };

  // =========================
  // 🎯 XHR
  // =========================

  const open = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function () {

    this.addEventListener("load", function () {

      const url = this.responseURL;

      if (!url) return;

      if (url.includes(".m3u8")) {
        send({ url, type: "hls" });
      }

      if (url.includes(".ts") && url.includes("segment")) {
        send({ url, type: "ts" });
      }

    });

    open.apply(this, arguments);
  };

})();