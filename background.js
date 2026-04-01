let videosByTab = {};

// =========================
// 🧠 ADD VIDEO POR ABA
// =========================

function addVideo(tabId, video) {
  if (!videosByTab[tabId]) videosByTab[tabId] = [];

  const exists = videosByTab[tabId].find(v => v.url === video.url);
  if (!exists) {
    videosByTab[tabId].push(video);
    console.log("🎯", video);
  }
}

// =========================
// 🎥 MENSAGENS DO CONTENT
// =========================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  const tabId = sender.tab?.id;

  if (!tabId) return;

  // =========================
  // 🎥 VIDEO DETECTADO
  // =========================

  if (msg.type === "VIDEO_FOUND") {
    addVideo(tabId, msg.video);
  }

  // =========================
  // 🎥 VIMEO
  // =========================

  if (msg.type === "VIMEO_ID") {

    fetch(`https://player.vimeo.com/video/${msg.id}/config`)
      .then(res => res.json())
      .then(data => {

        const files = data?.request?.files?.progressive;

        if (files) {
          files.forEach(f => {
            addVideo(tabId, {
              url: f.url,
              type: "mp4",
              quality: f.quality
            });
          });
        }
      })
      .catch(err => console.log("Erro Vimeo:", err));
  }

  // =========================
  // 📦 GET VIDEOS
  // =========================

  if (msg === "getVideos") {
    sendResponse(videosByTab[tabId] || []);
  }

  // =========================
  // 🧹 CLEAR
  // =========================

  if (msg === "clearVideos") {
    videosByTab[tabId] = [];
    sendResponse(true);
  }
});

// =========================
// 🔥 LIMPAR AO TROCAR ABA
// =========================

chrome.tabs.onActivated.addListener((activeInfo) => {
  videosByTab[activeInfo.tabId] = [];
  console.log("🧹 Reset troca de aba");
});

// =========================
// 🔥 LIMPAR AO RECARREGAR
// =========================

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    videosByTab[tabId] = [];
    console.log("🧹 Reset reload");
  }
});

// =========================

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});