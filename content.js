(function () {

  console.log("🔥 DETECTOR LIMPO ATIVO");

  const observer = new PerformanceObserver((list) => {

    list.getEntries().forEach((entry) => {

      const url = entry.name;

      if (url.includes(".ts") && url.includes("segment")) {

        const base = url.split("segment_")[0];

        console.log("🎯 BASE DETECTADA:", base);

        chrome.runtime.sendMessage({
          type: "VIDEO_FOUND",
          url: base
        });

      }

    });

  });

  observer.observe({ entryTypes: ["resource"] });

})();