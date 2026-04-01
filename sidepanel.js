const list = document.getElementById("list");
const empty = document.getElementById("empty");

const API = "https://vsl-backend.onrender.com";

chrome.runtime.sendMessage("getVideos", (videos) => {

  if (!videos || !videos.length) {
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
      <div>
        <span class="tag">${video.type.toUpperCase()}</span>
        ${quality ? `<span class="tag quality">${quality}</span>` : ""}
      </div>

      <div class="actions">
        <button id="btn-${index}">⬇️ Baixar</button>
        <span id="status-${index}"></span>
      </div>

      <div class="progress-bar">
        <div class="progress" id="progress-${index}"></div>
      </div>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });
});

function detectQuality(url) {
  if (url.includes("1080")) return "1080p";
  if (url.includes("720")) return "720p";
  if (url.includes("480")) return "480p";
  if (url.includes("360")) return "360p";
  return null;
}

function baixar(video, index) {
  const status = document.getElementById(`status-${index}`);
  const bar = document.getElementById(`progress-${index}`);

  status.textContent = "Iniciando...";

  const route =
    video.type === "ts"
      ? "download-ts"
      : video.type === "hls"
      ? "download-hls"
      : "download-direct";

  fetch(`${API}/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body:
      video.type === "ts"
        ? JSON.stringify({ tsUrl: video.url })
        : video.type === "hls"
        ? JSON.stringify({ m3u8Url: video.url })
        : JSON.stringify({ url: video.url })
  }).then(() => acompanhar(index));
}

function acompanhar(index) {
  const status = document.getElementById(`status-${index}`);
  const bar = document.getElementById(`progress-${index}`);

  const interval = setInterval(async () => {
    const res = await fetch(`${API}/progress`);
    const data = await res.json();

    if (data.status === "downloading") {
      const percent = (data.downloaded / data.total) * 100;
      bar.style.width = percent + "%";
      status.textContent = Math.floor(percent) + "%";
    }

    if (data.status === "processing") {
      status.textContent = "Processando...";
    }

    if (data.status === "finished") {
      status.textContent = "Finalizado";
      bar.style.width = "100%";

      chrome.downloads.download({
        url: `${API}/video`,
        filename: "video.mp4"
      });

      clearInterval(interval);
    }

    if (data.status === "error") {
      status.textContent = "Erro";
      clearInterval(interval);
    }
  }, 1500);
}