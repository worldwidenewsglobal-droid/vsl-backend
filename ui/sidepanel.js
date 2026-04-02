const API = "https://SEU-RENDER.onrender.com";

const list = document.getElementById("list");
const empty = document.getElementById("empty");

function loadVideos() {

  chrome.runtime.sendMessage("getVideos", (videos) => {

    console.log("📦 VIDEOS:", videos);

    if (!videos || !videos.length) {
      empty.style.display = "block";
      list.innerHTML = "";
      return;
    }

    empty.style.display = "none";

    list.innerHTML = "";

    videos.forEach((video) => {

      const el = document.createElement("div");

      el.innerHTML = `
        <div style="margin-bottom:10px;">
          <b>${video.type}</b><br/>
          <small>${video.url}</small><br/>
          <button>Baixar</button>
        </div>
      `;

      el.querySelector("button").onclick = () => baixar(video);

      list.appendChild(el);
    });

  });

}

// =========================

function baixar(video) {

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(video)
  });

  acompanhar();
}

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