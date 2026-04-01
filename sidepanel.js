const list = document.getElementById("list");
const API = "https://vsl-backend.onrender.com";

let downloading = false;

chrome.runtime.sendMessage("getVideos", (videos) => {

  const grouped = {};

  videos.forEach(v => {
    if (v.type === "ts") {

      const match = v.url.match(/(\/\d{3,4}p\/)/);
      const qualityKey = match ? match[1] : "default";

      const base = v.url.split(qualityKey)[0] + qualityKey;

      if (!grouped[base]) {
        grouped[base] = {
          type: "ts-group",
          url: v.url,
          count: 0,
          quality: detectQuality(v.url)
        };
      }

      grouped[base].count++;
    } else {
      grouped[v.url] = v;
    }
  });

  const finalList = Object.values(grouped);

  finalList.forEach((video, index) => {

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img class="thumb" src="assets/thumb.png">

      <div class="info">
        <div class="name">
          ${video.type === "ts-group"
            ? `Stream (${video.count} partes)`
            : formatName(video.url)}
        </div>

        <div>
          <span class="tag">${video.type}</span>
          ${video.quality ? `<span class="tag quality">${video.quality}</span>` : ""}
        </div>

        <div class="progress-bar">
          <div class="progress" id="progress-${index}"></div>
        </div>
      </div>

      <div class="right">
        <button id="btn-${index}">⬇️</button>
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

function formatName(url) {
  return url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}

// =========================

function baixar(video, index) {

  if (downloading) {
    alert("⏳ Aguarde terminar");
    return;
  }

  downloading = true;

  const bar = document.getElementById(`progress-${index}`);

  const route =
    video.type === "ts-group"
      ? "download-ts"
      : video.type === "hls"
      ? "download-hls"
      : "download-direct";

  fetch(`${API}/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body:
      video.type === "ts-group"
        ? JSON.stringify({ tsUrl: video.url })
        : video.type === "hls"
        ? JSON.stringify({ m3u8Url: video.url })
        : JSON.stringify({ url: video.url })
  }).then(() => acompanhar(index));
}

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

      downloading = false;
      clearInterval(interval);
    }

    if (data.status === "error") {
      downloading = false;
      clearInterval(interval);
    }
  }, 1000);
}