// content.js

(function () {

  console.log("🚀 Loader iniciado");

  const scripts = [];

  // =========================
  // DETECTAR VTURB
  // =========================

  if (document.documentElement.innerHTML.includes(".m3u8") ||
      document.documentElement.innerHTML.includes("segment")) {

    scripts.push("players/vturb.js");
  }

  // =========================
  // INJETAR SCRIPTS
  // =========================

  scripts.forEach(src => {

    const s = document.createElement("script");
    s.src = chrome.runtime.getURL(src);
    s.onload = () => s.remove();

    (document.head || document.documentElement).appendChild(s);
  });

})();