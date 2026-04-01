const list = document.getElementById("list");
const empty = document.getElementById("empty");

const API = "https://vsl-backend.onrender.com";

chrome.runtime.sendMessage("getVideos", (videos) => {

  if (!videos || !videos.length) {
  empty.innerHTML = `
    😴<br><br>
    Nenhum vídeo encontrado<br>
    <small>Reproduza o vídeo</small>
  `;
  empty.style.display = "block";
  return;
}

  empty.style.display = "none";

  const unique = [...new Map(videos.map(v => [v.url, v])).values()];

  unique.forEach((video, index) => {
    const card = document.createElement("div");
    card.className = "card";

    const title = video.url.split("/").pop().slice(0, 40);

    const quality = detectQuality(video.url);

    card.innerHTML = `
      <div class="video-title">${title}</div>

      <div class="tags">
        <span class="tag">${video.type.toUpperCase()}</span>
        ${quality ? `<span class="tag quality">${quality}</span>` : ""}
      </div>

      <div class="actions">
        <button id="btn-${index}">⬇️ Baixar</button>
        <span id="status-${index}" style="font-size:11px;opacity:0.6"></span>
      </div>

      <div class="progress-bar">
        <div class="progress" id="progress-${index}"></div>
      </div>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });
});

// =========================
// 🎯 DETECTAR QUALIDADE
// =========================

function detectQuality(url) {
  if (url.includes("1080")) return "1080p";
  if (url.includes("720")) return "720p";
  if (url.includes("480")) return "480p";
  if (url.includes("360")) return "360p";
  return null;
}

// =========================
// 🚀 DOWNLOAD
// =========================

function baixar(video, index) {
  const status = document.getElementById(`status-${index}`);
  const bar = document.getElementById(`progress-${index}`);

  status.textContent = "Iniciando...";

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: video.url,
      type: video.type === "ts" ? "ts-group" : video.type
    })
  }).then(() => acompanhar(index));
}

  const route =
    video.type === "ts"
      ? "download-ts"
      : video.type === "hls"
      ? "download-hls"
      : null;

  fetch(`${API}/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body:
      video.type === "ts"
        ? JSON.stringify({ tsUrl: video.url })
        : JSON.stringify({ m3u8Url: video.url })
  }).then(() => acompanhar(index));
}

// =========================
// 📊 PROGRESS
// =========================

function acompanhar(index) {
  const status = document.getElementById(`status-${index}`);
  const bar = document.getElementById(`progress-${index}`);

  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API}/progress`);
      const data = await res.json();

      if (data.status === "downloading") {
        const percent = (data.downloaded / data.total) * 100;
        bar.style.width = percent + "%";
        status.textContent = `Baixando ${Math.floor(percent)}%`;
      }

      if (data.status === "processing") {
        status.textContent = "Montando...";
      }

      if (data.status === "finished") {
        status.textContent = "Finalizado";
        bar.style.width = "100%";

        chrome.downloads.download({
          url: `${API}/video`,
          filename: "vsl.mp4"
        });

        clearInterval(interval);
      }

      if (data.status === "error") {
        status.textContent = "Erro";
        clearInterval(interval);
      }

    } catch (err) {
      console.log(err);
    }
  }, 1500);
}