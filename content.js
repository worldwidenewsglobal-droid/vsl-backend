(function () {

  console.log("🔥 VSL DETECTOR ATIVO");

  let sentBase = false;

  try {

    const observer = new PerformanceObserver((list) => {

      list.getEntries().forEach((entry) => {

        const url = entry.name;

        // VTURB TS
        if (url.includes(".ts") && url.includes("segment") && !sentBase) {

          const base = url.split("segment_")[0];

          console.log("🎯 VTURB BASE:", base);

          chrome.runtime.sendMessage({
            type: "VTURB_FOUND",
            data: { base }
          });

          sentBase = true;
        }

        // M3U8
        if (url.includes(".m3u8")) {
          chrome.runtime.sendMessage({
            type: "M3U8_FOUND",
            url
          });
        }

        // MP4
        if (url.includes(".mp4")) {
          chrome.runtime.sendMessage({
            type: "MP4_FOUND",
            url
          });
        }

      });

    });

    observer.observe({ entryTypes: ["resource"] });

  } catch (e) {
    console.log("❌ ERRO DETECTOR:", e);
  }

})();