const list = document.getElementById("list");
const empty = document.getElementById("empty");

const API = "https://vsl-backend.onrender.com";

chrome.runtime.sendMessage("getVideos", (videos) => {

  if (!videos || !videos.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  const grouped = {};

  videos.forEach(v => {
    if (v.type === "ts") {
      const base = v.url.replace(/segment_\d+\.ts.*/, "");

      if (!grouped[base]) {
        grouped[base] = {
          type: "ts-group",
          url: v.url,
          count: 0
        };
      }

      grouped[base].count++;
    } else {
      grouped[v.url] = v;
    }
  });

  let finalList = Object.values(grouped);

  // ordenar bonito
  finalList.sort((a, b) => {
    const order = { mp4: 1, hls: 2, "ts-group": 3 };
    return order[a.type] - order[b.type];
  });

  finalList.forEach((video, index) => {
    const quality = detectQuality(video.url);

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img class="thumb" src="assets/thumb.png">

      <div>
        ${video.type === "ts-group"
          ? `Stream (${video.count} partes)`
          : formatName(video.url)}
      </div>

      <div>
        <span class="tag">${video.type}</span>
        ${quality ? `<span class="tag quality">${quality}</span>` : ""}
      </div>

      <button id="btn-${index}">⬇️ Baixar</button>

      <div class="progress-bar">
        <div class="progress" id="progress-${index}"></div>
      </div>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });
});

// =========================

function formatName(url) {
  return url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}

function detectQuality(url) {
  if (url.includes("1080")) return "1080p";
  if (url.includes("720")) return "720p";
  if (url.includes("480")) return "480p";
  if (url.includes("360")) return "360p";
  return null;
}

// =========================

function baixar(video, index) {
  const bar = document.getElementById(`progress-${index}`);

  const route =
    video.type === "ts-group"
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
      const percent = (data.downloaded / data.total) * 100;
      bar.style.width = percent + "%";
    }

    if (data.status === "finished") {
      bar.style.width = "100%";

      chrome.downloads.download({
        url: `${API}/video`,
        filename: "video.mp4"
      });

      clearInterval(interval);
    }
  }, 1500);
}