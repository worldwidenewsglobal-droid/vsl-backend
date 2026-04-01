const list = document.getElementById("list");
const empty = document.getElementById("empty");

let videosGlobal = [];

// =========================
// LOAD VIDEOS
// =========================

function loadVideos() {
  chrome.runtime.sendMessage("getVideos", (videos) => {

    if (!videos || !videos.length) {
      empty.style.display = "block";
      list.innerHTML = "";
      return;
    }

    empty.style.display = "none";

    // agrupar TS
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
}

// =========================
// RENDER
// =========================

function render(videos) {

  list.innerHTML = "";

  videos.forEach((video, index) => {

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="thumb">▶</div>

      <div class="info">
        <div class="name">${video.label || "Video detectado"}</div>
        <div class="meta">
          <span class="tag">${video.realType}</span>
        </div>
      </div>

      <button class="download">⬇ Baixar</button>
    `;

    list.appendChild(card);
  });
}

// =========================
// RELOAD
// =========================

document.getElementById("reload").onclick = async () => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.runtime.sendMessage("clearVideos");

  list.innerHTML = "";
  empty.innerHTML = "🔄 Recarregue a página e dê play no vídeo";
  empty.style.display = "block";

  chrome.tabs.reload(tab.id);
};

// =========================

loadVideos();
setInterval(loadVideos, 2000);
