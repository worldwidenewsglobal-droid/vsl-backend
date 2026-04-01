const list = document.getElementById("list");
const bestBtn = document.getElementById("best");
const clearBtn = document.getElementById("clear");

const API = "https://vsl-backend.onrender.com";

let videosGlobal = [];

// =========================
// 🔥 AUTO WAKE RENDER
// =========================
setInterval(() => {
  fetch(`${API}/progress`).catch(() => {});
}, 240000); // a cada 4 minutos

// =========================
// 🚀 PEGAR VIDEOS
// =========================

chrome.runtime.sendMessage("getVideos", (videos) => {

  const grouped = {};

  videos.forEach(v => {

    if (v.type === "ts") {

      const base = v.url.split("segment_")[0];

      if (!grouped[base]) {
        grouped[base] = {
          type: "video",
          realType: "ts-group",
          url: v.url,
          count: 0,
          label: "🎥 Vídeo Completo"
        };
      }

      grouped[base].count++;

    } else {
      grouped[v.url] = {
        ...v,
        realType: v.type
      };
    }

  });

  // pega maior TS
  const ts = Object.values(grouped)
    .filter(v => v.realType === "ts-group")
    .sort((a, b) => b.count - a.count)[0];

  const finalList = Object.values(grouped)
    .filter(v => v.realType !== "ts-group");

  if (ts) finalList.unshift(ts);

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
        <div>${video.label || formatName(video.url)}</div>
        <div class="meta">${video.realType}</div>

        <div class="progress-bar">
          <div class="progress" id="progress-${index}"></div>
        </div>
      </div>

      <button class="download" id="btn-${index}">⬇️</button>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });
}

// =========================
// 🧠 MELHOR QUALIDADE
// =========================

bestBtn.onclick = () => {

  const ts = videosGlobal.find(v => v.realType === "ts-group");
  if (ts) return baixar(ts, 0);

  const mp4 = videosGlobal.find(v => v.realType === "mp4");
  if (mp4) return baixar(mp4, 0);
};

// =========================
// 🧹 LIMPAR
// =========================

clearBtn.onclick = () => {
  chrome.runtime.sendMessage("clearVideos", () => {
    list.innerHTML = "";
  });
};

// =========================
// 🚀 DOWNLOAD
// =========================

function baixar(video, index) {

  fetch(`${API}/progress`); // wake

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

  }, 1000);
}

// =========================
// HELPERS
// =========================

function formatName(url) {
  return url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}