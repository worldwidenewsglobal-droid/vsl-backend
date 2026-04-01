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
// MESSAGES
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  const tabId = sender.tab?.id;
  if (!tabId) return;

  // VTURB TS BASE
  if (msg.type === "VTURB_FOUND") {
    addVideo(tabId, {
      url: msg.data.base,
      type: "ts-group"
    });
  }

  // M3U8
  if (msg.type === "M3U8_FOUND") {
    addVideo(tabId, {
      url: msg.url,
      type: "hls"
    });
  }

  // MP4
  if (msg.type === "MP4_FOUND") {
    addVideo(tabId, {
      url: msg.url,
      type: "mp4"
    });
  }

  // GET
  if (msg === "getVideos") {
    sendResponse(videosByTab[tabId] || []);
  }

  // CLEAR
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