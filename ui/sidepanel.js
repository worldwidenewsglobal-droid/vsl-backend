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
          <button style="margin-top:5px;">Baixar</button>
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

  let tipo = video.type;

  // ajuste automático
  if (tipo === "ts") tipo = "ts-group";

  fetch(`${API}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      url: video.url,
      type: tipo
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

function render(videos) {

  list.innerHTML = "";

  videos.forEach((video) => {

    // filtrar lixo
    if (video.type === "hls" && !video.url.includes("main.m3u8")) return;

    const el = document.createElement("div");

    el.className = "card";

    const quality =
      video.url.includes("720") ? "720p" :
      video.url.includes("360") ? "360p" :
      video.url.includes("180") ? "180p" :
      video.type.toUpperCase();

    el.innerHTML = `
      <div class="row">
        
        <div class="left">
          <div class="icon">▶</div>

          <div>
            <div class="title">Vídeo</div>
            <div class="meta">
              <span class="badge">${quality}</span>
              <span>${video.type.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <button class="btn">⬇</button>

      </div>
    `;

    el.querySelector(".btn").onclick = () => baixar(video);

    list.appendChild(el);
  });
}

// =========================

setInterval(load, 2000);