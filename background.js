let videos = [];

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes(".ts")) {
      videos.push(details.url);
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "getVideos") {
    sendResponse(videos);
  }
});