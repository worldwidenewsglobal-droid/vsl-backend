let videos = [];

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg === "startCapture") {
    console.log("♻️ Resetando captura...");
    videos = [];
    sendResponse("ok");
  }

  if (msg === "getVideos") {
    sendResponse(videos);
  }
});

chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.url.includes(".ts")) {
      videos.push(details.url);
    }
  },
  { urls: ["<all_urls>"] }
);