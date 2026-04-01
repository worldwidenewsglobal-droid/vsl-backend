(function () {

  function send(url) {
    window.postMessage({
      source: "vsl-extension",
      url
    }, "*");
  }

  console.log("🔥 INJECT ATIVO");

  // FETCH
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const res = await originalFetch(...args);

    try {
      const url = args[0];

      if (typeof url === "string" && url.includes(".ts")) {
        send(url);
      }

      if (typeof url === "string" && url.includes(".m3u8")) {
        send(url);
      }

    } catch (e) {}

    return res;
  };

  // XHR
  const open = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function () {

    this.addEventListener("load", function () {
      const url = this.responseURL;

      if (!url) return;

      if (url.includes(".ts") || url.includes(".m3u8")) {
        send(url);
      }
    });

    open.apply(this, arguments);
  };

})();