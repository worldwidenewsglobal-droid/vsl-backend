let videosByTab = {};

// =========================
// ADD VIDEO
// =========================

function addVideo(tabId, video) {
  if (!videosByTab[tabId]) videosByTab[tabId] = [];

  const exists = videosByTab[tabId].find(v => v.url === video.url);
  if (!exists) {
    videosByTab[tabId].push(video);
    console.log("🎯 ADD:", video);
  }
}

// =========================
// DETECTOR GLOBAL (REDE)
// =========================

chrome.webRequest.onCompleted.addListener(
  (details) => {

    const tabId = details.tabId;
    const url = details.url;

    if (tabId < 0) return;

    // =========================
    // 🎬 MP4
    // =========================

    if (url.includes(".mp4")) {
      addVideo(tabId, { url, type: "mp4" });
      return;
    }

    // =========================
    // 🔥 M3U8 (REAL)
    // =========================

    if (
      url.includes(".m3u8") &&
      !url.includes("chunk") &&
      !url.includes("frag")
    ) {
      addVideo(tabId, { url, type: "hls" });
      return;
    }

    // =========================
    // ⚙ VTURB HARD (TS BASE)
    // =========================

    if (
      url.includes(".ts") &&
      url.includes("segment")
    ) {

      // 🔥 extrai base
      const base = url.split("segment_")[0];

      addVideo(tabId, {
        url: base,
        type: "ts-base"
      });

      return;
    }

  },
  { urls: ["<all_urls>"] }
);

// =========================
// MESSAGES
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg === "getVideos") {
    sendResponse(videosByTab[tabId] || []);
  }

  if (msg === "clearVideos") {
    videosByTab[tabId] = [];
    sendResponse(true);
  }
});

// =========================
// RESET
// =========================

chrome.tabs.onActivated.addListener(({ tabId }) => {
  videosByTab[tabId] = [];
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") {
    videosByTab[tabId] = [];
  }
});

// =========================

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});