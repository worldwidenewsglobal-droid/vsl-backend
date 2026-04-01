let videos = [];

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

      if (!videos.find(v => v.url === url)) {
        videos.push({
          url,
          type: getType(url)
        });

        console.log("🎯 Detectado:", url);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

function getType(url) {
  if (url.includes(".m3u8")) return "hls";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".ts")) return "ts";
  return "unknown";
}

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "getVideos") sendResponse(videos);

  if (msg === "clearVideos") {
    videos = [];
    console.log("🧹 Limpo");
    sendResponse(true);
  }
});