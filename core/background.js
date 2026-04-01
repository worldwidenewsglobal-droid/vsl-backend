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
// RECEBE DO CONTENT
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.type === "VIDEO_FOUND") {

    const url = msg.video.url;

    // MP4
    if (url.includes(".mp4")) {
      addVideo(tabId, { url, type: "mp4" });
    }

    // M3U8
    else if (url.includes(".m3u8")) {
      addVideo(tabId, { url, type: "hls" });
    }

    // TS (VTurb)
    else if (url.includes(".ts")) {

      const base = url.split("segment_")[0];

      addVideo(tabId, {
        url: base,
        type: "ts-base"
      });

    }

  }

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