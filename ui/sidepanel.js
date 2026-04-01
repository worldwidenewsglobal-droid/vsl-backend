const API = "https://SEU-RENDER.onrender.com";

const list = document.getElementById("list");
const empty = document.getElementById("empty");

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

    render(videos);
  });
}

// =========================
// RENDER
// =========================

function render(videos) {

  list.innerHTML = "";

  videos.forEach((video) => {

    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div>${video.type.toUpperCase()}</div>
      <button>Baixar</button>
    `;

    el.querySelector("button").onclick = () => baixar(video);

    list.appendChild(el);
  });
}

// =========================
// DOWNLOAD
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
// PROGRESS
// =========================

function acompanhar() {

  const interval = setInterval(async () => {

    const res = await fetch(`${API}/progress`);
    const data = await res.json();

    console.log("📊", data);

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

document.getElementById("reload").onclick = async () => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.runtime.sendMessage("clearVideos");

  chrome.tabs.reload(tab.id);
};

// =========================

setInterval(loadVideos, 1500);