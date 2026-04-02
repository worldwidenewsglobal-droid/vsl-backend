(function () {

  console.log("🔥 DETECTOR ATIVO");

  const observer = new PerformanceObserver((list) => {

    list.getEntries().forEach((entry) => {

      const url = entry.name;

      // TS (VTurb)
      if (url.includes(".ts") && url.includes("segment")) {

        const base = url.split("segment_")[0];

        console.log("🎯 BASE DETECTADA:", base);

        chrome.runtime.sendMessage({
          type: "VIDEO_FOUND",
          url: base
        });

      }

      // M3U8 (CORRETO AGORA)
      if (url.includes(".m3u8")) {

        console.log("🎯 M3U8:", url);

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

})();