const list = document.getElementById("list");
const bestBtn = document.getElementById("best");

const API = "https://vsl-backend.onrender.com";

let videosGlobal = [];

// =========================
// 🚀 PEGAR VIDEOS
// =========================

chrome.runtime.sendMessage("getVideos", (videos) => {

  const grouped = {};

  videos.forEach(v => {

    if (v.type === "ts") {

      const match = v.url.match(/(\d{3,4}p)/);
      const quality = match ? match[1] : "720p";

      const base = v.url.split("segment_")[0] + quality;

      if (!grouped[base]) {
        grouped[base] = {
          type: "video",
          realType: "ts-group",
          url: v.url,
          count: 0,
          quality,
          label: "Vídeo Completo"
        };
      }

      grouped[base].count++;

    } else {
      grouped[v.url] = {
        ...v,
        realType: v.type,
        quality: detectQuality(v.url)
      };
    }

  });

  // 🔥 remove lixo TS pequeno
  const finalList = Object.values(grouped)
    .filter(v => v.realType !== "ts-group" || v.count > 200);

  videosGlobal = finalList;

  render(finalList);
});

// =========================
// 🎨 RENDER
// =========================

function render(videos) {

  list.innerHTML = "";

  videos.forEach((video, index) => {

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img class="thumb" src="assets/thumb.png">

      <div class="info">
        <div class="name">
          ${video.label || formatName(video.url)}
        </div>

        <div class="meta">
          ${video.quality || ""} ${video.realType.toUpperCase()}
        </div>

        <div class="progress-bar">
          <div class="progress" id="progress-${index}"></div>
        </div>
      </div>

      <button id="btn-${index}">⬇️</button>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });
}

// =========================
// 🧠 MELHOR QUALIDADE
// =========================

bestBtn.onclick = () => {

  const ts = videosGlobal
    .filter(v => v.realType === "ts-group")
    .sort((a, b) => b.count - a.count)[0];

  if (ts) return baixar(ts, 0);

  const mp4 = videosGlobal.find(v => v.realType === "mp4");
  if (mp4) return baixar(mp4, 0);
};

// =========================
// 🚀 DOWNLOAD
// =========================

function baixar(video, index) {

  fetch(`${API}/progress`); // acorda render

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: video.url,
      type: video.realType
    })
  });

  acompanhar(index);
}

// =========================
// 📊 PROGRESS
// =========================

function acompanhar(index) {

  const bar = document.getElementById(`progress-${index}`);

  const interval = setInterval(async () => {

    const res = await fetch(`${API}/progress`);
    const data = await res.json();

    if (data.status === "downloading") {
      bar.style.width = ((data.downloaded / data.total) * 100) + "%";
    }

    if (data.status === "processing") {
      bar.style.width = "95%";
    }

    if (data.status === "finished") {

      bar.style.width = "100%";

      chrome.downloads.download({
        url: `${API}/video`,
        filename: "video.mp4"
      });

      clearInterval(interval);
    }

    if (data.status === "error") {
      clearInterval(interval);
    }

  }, 1000);
}

// =========================
// HELPERS
// =========================

function detectQuality(url) {
  if (url.includes("1080")) return "1080p";
  if (url.includes("720")) return "720p";
  if (url.includes("480")) return "480p";
  if (url.includes("360")) return "360p";
  return "";
}

function formatName(url) {
  return url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}