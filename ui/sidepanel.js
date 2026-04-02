const API = "https://vsl-backend.onrender.com";

const list = document.getElementById("list");

function load() {

  chrome.runtime.sendMessage("getVideos", (videos) => {

    list.innerHTML = "";

    if (!videos || !videos.length) {
      list.innerHTML = "<p>Nenhum vídeo encontrado</p>";
      return;
    }

    videos.forEach(v => {

      const el = document.createElement("div");

      el.style.marginBottom = "15px";

      el.innerHTML = `
        <div>
          <b>${v.type}</b><br/>
          <small>${v.url}</small><br/>
          <button style="margin-top:5px;">⬇ Baixar</button>
        </div>
      `;

      el.querySelector("button").onclick = () => baixar(v);

      list.appendChild(el);
    });

  });

}

// =========================
// DOWNLOAD
// =========================

function baixar(video) {

  console.log("🚀 BAIXANDO:", video);

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: video.url,
      type: "ts-group"
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

      const a = document.createElement("a");
        a.href = `${API}/video`;
        a.download = "video.mp4";
        a.target = "_blank";
        a.click();

      clearInterval(interval);
    }

  }, 1500);
}

// =========================

setInterval(load, 2000);