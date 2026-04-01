const list = document.getElementById("list");
const empty = document.getElementById("empty");

let videosGlobal = [];

// =========================
// LOAD
// =========================

function loadVideos() {
  chrome.runtime.sendMessage("getVideos", (videos) => {

    if (!videos || !videos.length) {
      empty.style.display = "block";
      list.innerHTML = "";
      return;
    }

    empty.style.display = "none";

    const grouped = {};

    videos.forEach(v => {

      // TS agrupado
      if (v.type === "ts") {
        const base = v.url.split("segment_")[0];

        if (!grouped[base]) {
          grouped[base] = {
            url: v.url,
            type: "ts-group",
            label: "Vídeo Completo (TS)"
          };
        }

      }

      // M3U8
      else if (v.type === "hls") {
        grouped[v.url] = {
          ...v,
          label: "Vídeo Completo (M3U8)"
        };
      }

      // MP4
      else if (v.type === "mp4") {
        grouped[v.url] = {
          ...v,
          label: "Vídeo Completo (MP4)"
        };
      }

    });

    const finalList = Object.values(grouped);

    // PRIORIDADE
    finalList.sort((a, b) => {
      const order = { mp4: 1, hls: 2, "ts-group": 3 };
      return order[a.type] - order[b.type];
    });

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
        <div class="name">${video.label}</div>
        <div class="meta">
          <span class="tag">${video.type}</span>
        </div>
      </div>

      <button class="download" id="btn-${index}">
        ⬇ Baixar
      </button>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => {
      baixar(video);
    };
  });
}

// =========================
// DOWNLOAD
// =========================

function baixar(video) {
  alert("Download ainda via backend\nTipo: " + video.type);
}

// =========================
// RELOAD
// =========================

document.getElementById("reload").onclick = async () => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.runtime.sendMessage("clearVideos");

  list.innerHTML = "";
  empty.innerHTML = "🔄 Recarregue e dê play no vídeo";
  empty.style.display = "block";

  chrome.tabs.reload(tab.id);
};

// =========================

loadVideos();
setInterval(loadVideos, 1500);