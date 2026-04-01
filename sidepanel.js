const list = document.getElementById("list");
const bestBtn = document.getElementById("best");

const API = "https://vsl-backend.onrender.com";

let videosGlobal = [];

// =========================
// 🚀 PEGAR VIDEOS
// =========================

chrome.runtime.sendMessage("getVideos", (videos) => {

  if (!videos || !videos.length) return;

  const grouped = {};

  videos.forEach(v => {

    if (v.type === "ts") {

      const match = v.url.match(/(\d{3,4}p)/);
      const quality = match ? match[1] : "unknown";

      const base = v.url.split("segment_")[0] + quality;

      if (!grouped[base]) {
        grouped[base] = {
          type: "ts-group",
          url: v.url,
          count: 0,
          quality
        };
      }

      grouped[base].count++;

    } else {
      grouped[v.url] = {
        ...v,
        quality: detectQuality(v.url)
      };
    }

  });

  // 🔥 FILTRO: remove TS lixo
  let finalList = Object.values(grouped)
    .filter(v => v.type !== "ts-group" || v.count > 200);

  // 🔥 ESCONDE TS (UX PREMIUM)
  const visibleList = finalList.filter(v => v.type !== "ts-group");

  videosGlobal = finalList;

  render(visibleList);
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
      <img class="thumb" src="${getThumbnail(video)}">

      <div class="info">
        <div class="name">${getTitle(video)}</div>
        <div class="meta">${video.quality || ""} ${video.type.toUpperCase()}</div>
      </div>

      <button id="btn-${index}">⬇️</button>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video);
  });
}

// =========================
// 🧠 MELHOR QUALIDADE
// =========================

bestBtn.onclick = () => {

  const best = escolherMelhor();

  if (!best) return;

  baixar(best);
};

function escolherMelhor() {

  // prioridade: mp4 > hls > ts
  const mp4 = videosGlobal.find(v => v.type === "mp4");
  if (mp4) return mp4;

  const hls = videosGlobal
    .filter(v => v.type === "hls")
    .sort((a, b) => (getQualityNum(b.quality) - getQualityNum(a.quality)))[0];

  if (hls) return hls;

  const ts = videosGlobal
    .filter(v => v.type === "ts-group")
    .sort((a, b) => b.count - a.count)[0];

  return ts;
}

// =========================
// 🚀 DOWNLOAD
// =========================

function baixar(video) {

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: video.url,
      type: video.type
    })
  });

  acompanhar();
}

// =========================
// 📊 PROGRESS
// =========================

function acompanhar() {

  const interval = setInterval(async () => {

    const res = await fetch(`${API}/progress`);
    const data = await res.json();

    if (data.status === "finished") {

      chrome.downloads.download({
        url: `${API}/video`,
        filename: "video.mp4"
      });

      clearInterval(interval);
    }

  }, 1500);
}

// =========================
// 🧠 HELPERS
// =========================

function detectQuality(url) {
  if (url.includes("1080")) return "1080p";
  if (url.includes("720")) return "720p";
  if (url.includes("480")) return "480p";
  if (url.includes("360")) return "360p";
  return "";
}

function getQualityNum(q) {
  return parseInt(q) || 0;
}

function getTitle(video) {
  return video.url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}

function getThumbnail() {
  return "assets/thumb.png";
}