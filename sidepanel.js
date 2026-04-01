const list = document.getElementById("list");
const API = "https://vsl-backend.onrender.com";

let downloading = false;

chrome.runtime.sendMessage("getVideos", (videos) => {

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
        <div>
          ${video.type === "ts-group"
            ? `Stream (${video.count})`
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

      <button id="btn-${index}">⬇️</button>
    `;

    list.appendChild(card);

    document.getElementById(`btn-${index}`).onclick = () => baixar(video, index);
  });

});

function formatName(url) {
  return url.split("/").pop().replace(/\.(ts|m3u8|mp4)/, "");
}

// =========================

function baixar(video, index) {

  if (downloading) return;

  downloading = true;

  const bar = document.getElementById(`progress-${index}`);
  bar.style.width = "5%";

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: video.url,
      type: video.type
    })
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