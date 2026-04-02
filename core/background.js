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

});