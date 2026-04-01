let videos = [];

// =========================
// 🎯 CAPTURA REQUESTS
// =========================

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const url = details.url;

    if (
      (
        url.includes(".m3u8") ||
        url.includes(".mp4") ||
        url.includes(".ts")
      ) &&
      !url.includes("blob:") &&
      !url.includes("data:")
    ) {
      addVideo(url, getType(url));
    }
  },
  { urls: ["<all_urls>"] }
);

// =========================
// 🧠 ADD VIDEO
// =========================

function addVideo(url, type) {
  if (!videos.find(v => v.url === url)) {
    videos.push({ url, type });
    console.log("🎯 Detectado:", url);
  }
}

function getType(url) {
  if (url.includes(".m3u8")) return "hls";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".ts")) return "ts";
  return "unknown";
}

// =========================
// 🔥 RESET POR NAVEGAÇÃO
// =========================

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    videos = [];
    console.log("🧹 Reset por troca de página");
  }
});

// =========================
// 🎥 MENSAGENS DO CONTENT
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "FOUND_IFRAME") {

    // Vimeo embed
    if (msg.url.includes("vimeo.com")) {

      const match = msg.url.match(/video\/(\d+)/);

      if (match) {
        const videoId = match[1];

        fetch(`https://player.vimeo.com/video/${videoId}/config`)
          .then(res => res.json())
          .then(data => {

            const files = data?.request?.files?.progressive;

            if (files && files.length) {

              files.forEach(f => {
                addVideo(f.url, "mp4");
              });

            } else if (data?.request?.files?.hls?.cdns) {

              const cdn = Object.values(data.request.files.hls.cdns)[0];
              addVideo(cdn.url, "hls");
            }

          })
          .catch(err => console.log("Erro Vimeo:", err));
      }
    }

    // fallback iframe normal
    addVideo(msg.url, "iframe");
  }

  if (msg === "getVideos") sendResponse(videos);

  if (msg === "clearVideos") {
    videos = [];
    sendResponse(true);
  }
});

// =========================
// SIDE PANEL
// =========================

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});