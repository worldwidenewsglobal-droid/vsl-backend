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

    const el = document.createElement("div");

    el.style.cssText = `
      background: #0f172a;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
      color: white;
      font-family: Arial;
    `;

    const typeColor = {
      mp4: "#22c55e",
      hls: "#3b82f6",
      ts: "#f59e0b"
    };

    el.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        
        <div>
          <div style="font-weight:bold; font-size:14px;">
            ${video.type.toUpperCase()}
          </div>

          <div style="
            font-size:11px;
            color:#94a3b8;
            max-width:200px;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          ">
            ${video.url}
          </div>
        </div>

        <button style="
          background:${typeColor[video.type]};
          border:none;
          padding:8px 12px;
          border-radius:8px;
          color:white;
          cursor:pointer;
          font-weight:bold;
        ">
          Baixar
        </button>

      </div>
    `;

    el.querySelector("button").onclick = () => baixar(video);

    list.appendChild(el);
  });
}

// =========================

setInterval(load, 2000);