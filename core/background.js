let videos = [];

// =========================
// ADD VIDEO
// =========================

function addVideo(video) {

  const exists = videos.find(v => v.url === video.url);

  if (!exists) {
    videos.push(video);
    console.log("🎯 SALVO:", video);
  }

}

// =========================
// LISTENER
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // TS (VTurb)
  if (msg.type === "VIDEO_FOUND") {

    addVideo({
      url: msg.url,
      type: "ts"
    });

  }

  // M3U8
  if (msg.type === "M3U8_FOUND") {

    addVideo({
      url: msg.url,
      type: "hls"
    });

  }

  // MP4
  if (msg.type === "MP4_FOUND") {

    addVideo({
      url: msg.url,
      type: "mp4"
    });

  }

  // GET
  if (msg === "getVideos") {
    sendResponse(videos);
  }

  // CLEAR
  if (msg === "clear") {
    videos = [];
    sendResponse(true);
  }

});

// =========================
// ABRIR SIDEPANEL
// =========================

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});