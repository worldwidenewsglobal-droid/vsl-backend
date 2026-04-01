let videosByTab = {};

// =========================
// ADD VIDEO
// =========================

function addVideo(tabId, video) {
  if (!videosByTab[tabId]) videosByTab[tabId] = [];

  const exists = videosByTab[tabId].find(v => v.url === video.url);

  if (!exists) {
    videosByTab[tabId].push(video);
    console.log("🎯", video.url);
  }
}

// =========================
// 🔥 CAPTURA REAL (IGUAL PUPPETEER)
// =========================

chrome.webRequest.onCompleted.addListener(
  (details) => {

    const tabId = details.tabId;
    const url = details.url;

    if (tabId < 0) return;

    // 🔥 FILTRO VTURB
    if (
      url.includes(".ts") ||
      url.includes(".m3u8")
    ) {

      addVideo(tabId, {
        url,
        type: url.includes(".m3u8") ? "hls" : "ts"
      });

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