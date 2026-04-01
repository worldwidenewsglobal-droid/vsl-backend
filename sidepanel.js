const list = document.getElementById("list");
const empty = document.getElementById("empty");

const API = "https://vsl-backend.onrender.com";

let videosGlobal = [];

// =========================
// PEGAR VIDEOS
// =========================

chrome.runtime.sendMessage("getVideos", (videos) => {

  if (!videos || !videos.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  const grouped = {};

  videos.forEach(v => {

    if (v.type === "ts") {

      const base = v.url.split("segment_")[0];

      if (!grouped[base]) {
        grouped[base] = {
          url: v.url,
          realType: "ts-group",
          label: "Vídeo Completo"
        };
      }

    } else {
      grouped[v.url] = {
        ...v,
        realType: v.type
      };
    }

  });

  const finalList = Object.values(grouped);

  videosGlobal = finalList;

  render(finalList);
});

// =========================
// RENDER
// =========================

function render(videos) {

  list.innerHTML = "";

  videos.forEach((video, index) => {

    const quality = detectQuality(video.url);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="thumb">▶</div>

      <div class="info">
        <div class="name">${video.label || formatName(video.url)}</div>

        <div class="meta">
          <span class="tag">${video.realType}</span>
          ${quality ? `<span class="tag quality">${quality}</span>` : ""}
        </div>

        <div class="progress-bar">
          <div class="progress" id="progress-${index}"></div>
        </div>
      </div>

      <button class="download" id="btn-${index}">
        ⬇ Baixar
      </button>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });
}

// =========================
// DOWNLOAD
// =========================

function baixar(video, index) {

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
// PROGRESS
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
// BOTÕES
// =========================

document.getElementById("clear").onclick = () => {
  chrome.runtime.sendMessage("clearVideos", () => {
    list.innerHTML = "";
    empty.style.display = "block";
  });
};

document.getElementById("best").onclick = () => {

  const ts = videosGlobal.find(v => v.realType === "ts-group");
  if (ts) return baixar(ts, 0);

  const mp4 = videosGlobal.find(v => v.realType === "mp4");
  if (mp4) return baixar(mp4, 0);
};

document.getElementById("reload").onclick = async () => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.runtime.sendMessage("clearVideos");

  list.innerHTML = "";
  empty.innerHTML = "🔄 Recarregando...";
  empty.style.display = "block";

  chrome.tabs.reload(tab.id);

  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === "complete") {

      chrome.tabs.onUpdated.removeListener(listener);

      setTimeout(() => {
        chrome.runtime.sendMessage("getVideos", (videos) => {

          if (!videos || !videos.length) {
            empty.innerHTML = `
              😴<br><br>
              Nenhum vídeo encontrado<br>
              <small>Dê play no vídeo</small>
            `;
            empty.style.display = "block";
            return;
          }

          empty.style.display = "none";
          render(videos);

        });
      }, 2000);
    }
  });
};

// =========================
// HELPERS
// =========================

function detectQuality(url) {
  if (url.includes("1080")) return "1080p";
  if (url.includes("720")) return "720p";
  if (url.includes("480")) return "480p";
  if (url.includes("360")) return "360p";
  return null;
}

function formatName(url) {
  return url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}