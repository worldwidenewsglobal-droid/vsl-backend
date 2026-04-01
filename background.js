let videos = [];

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    const url = details.url;

    if (
      url.includes(".m3u8") ||
      url.includes(".mp4") ||
      url.includes(".ts") ||
      url.includes(".webm")
    ) {
      const video = {
        url,
        type: getType(url)
      };

      videos.push(video);

      console.log("🎯 Detectado:", url);

      // 🔥 abre sidepanel automaticamente
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id });
      }
    }
  },
  { urls: ["<all_urls>"] }
);

function getType(url) {
  if (url.includes(".m3u8")) return "hls";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".ts")) return "ts";
  if (url.includes(".webm")) return "webm";
  return "unknown";
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "getVideos") {
    sendResponse(videos);
  }

  if (msg === "clear") {
    videos = [];
    sendResponse(true);
  }
});