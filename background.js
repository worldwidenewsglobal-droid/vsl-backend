let videos = [];

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    const url = details.url;

    if (
      (
        url.includes(".m3u8") ||
        url.includes(".mp4") ||
        url.includes(".webm") ||
        url.includes(".ts")
      ) &&
      !url.includes("blob:") &&
      !url.includes("data:") &&
      !url.includes("init") &&
      !url.includes("sprite") &&
      !url.includes("preview")
    ) {
      const video = {
        url,
        type: getType(url)
      };

      if (!videos.find(v => v.url === url)) {
        videos.push(video);
        console.log("🎯 Detectado:", url);
      }

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

// abrir ao clicar
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "getVideos") sendResponse(videos);
  if (msg === "clear") {
    videos = [];
    sendResponse(true);
  }
});