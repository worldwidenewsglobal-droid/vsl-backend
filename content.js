(function () {

  function send(url) {
    try {
      chrome.runtime.sendMessage({
        type: "VIDEO_FOUND",
        video: {
          url,
          type: "ts"
        }
      });
    } catch (e) {}
  }

  console.log("🔥 VTURB INTERCEPTOR ATIVO");

  // =========================
  // FETCH INTERCEPT
  // =========================

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const res = await originalFetch(...args);

    try {
      const url = args[0];

      if (typeof url === "string" && url.includes(".ts")) {
        send(url);
      }
    } catch (e) {}

    return res;
  };

  // =========================
  // XHR INTERCEPT
  // =========================

  const open = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function () {

    this.addEventListener("load", function () {
      const url = this.responseURL;

      if (url && url.includes(".ts")) {
        send(url);
      }
    });

    open.apply(this, arguments);
  };

})();