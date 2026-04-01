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
// DETECTOR VIA REDE (MP4 + M3U8)
// =========================

chrome.webRequest.onCompleted.addListener(
  (details) => {

    const tabId = details.tabId;
    const url = details.url;

    if (tabId < 0) return;

    // 🎬 MP4
    if (url.includes(".mp4")) {
      addVideo(tabId, { url, type: "mp4" });
      return;
    }

    // 🔥 M3U8
    if (
      url.includes(".m3u8") &&
      !url.includes("chunk") &&
      !url.includes("frag")
    ) {
      addVideo(tabId, { url, type: "hls" });
      return;
    }

  },
  { urls: ["<all_urls>"] }
);

// =========================
// RECEBE DO CONTENT (TS - VTURB HARD)
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  const tabId = sender.tab?.id;
  if (!tabId) return;

  // 🔥 TS vindo do content.js
  if (msg.type === "VIDEO_FOUND") {

    const url = msg.video.url;

    if (url.includes(".ts")) {

      const base = url.split("segment_")[0];

      addVideo(tabId, {
        url: base,
        type: "ts-base"
      });

    }
  }

  // 📦 GET VIDEOS
  if (msg === "getVideos") {
    sendResponse(videosByTab[tabId] || []);
  }

  // 🧹 CLEAR
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
  console.log("🧹 reset tab");
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "loading") {
    videosByTab[tabId] = [];
    console.log("🧹 reset reload");
  }
});

// =========================
// OPEN PANEL
// =========================

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});