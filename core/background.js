let videos = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "VIDEO_FOUND") {

    const exists = videos.find(v => v.url === msg.url);

    if (!exists) {
      videos.push({
        url: msg.url,
        type: "ts"
      });

      console.log("🎯 SALVO:", msg.url);
    }

  }

  if (msg === "getVideos") {
    sendResponse(videos);
  }

  if (msg === "clear") {
    videos = [];
    sendResponse(true);
  }

  if (msg.type === "M3U8_FOUND") {

  addVideo(tabId, {
    url: msg.url,
    type: "hls"
  });

}
  chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
})

});