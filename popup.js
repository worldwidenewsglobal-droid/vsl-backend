const status = document.getElementById("status");
const bar = document.getElementById("progress");

const API = "https://vsl-backend.onrender.com";

document.getElementById("baixar").addEventListener("click", () => {
  status.textContent = "🔍 Buscando vídeo...";

  chrome.runtime.sendMessage("getVideos", (videos) => {

    // 🔥 filtra só TS
    let tsList = videos.filter(v => v.includes(".ts"));

    // remove duplicados
    tsList = [...new Set(tsList)];

    if (!tsList.length) {
      status.textContent = "❌ Nenhum TS encontrado";
      return;
    }

    console.log("🎯 TOTAL TS:", tsList.length);

    // 🔥 ordena pelos números (caso tenha)
    tsList.sort((a, b) => {
      const n1 = parseInt(a.match(/\d+/)?.[0] || 0);
      const n2 = parseInt(b.match(/\d+/)?.[0] || 0);
      return n1 - n2;
    });

    status.textContent = `🚀 Enviando ${tsList.length} partes...`;

    fetch(`${API}/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ segments: tsList })
    })
    .then(() => acompanhar())
    .catch(err => {
      console.log("ERRO:", err);
      status.textContent = "❌ Erro ao iniciar";
    });
  });
});

function acompanhar() {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${API}/progress`);
      const data = await res.json();

      if (data.status === "downloading") {
        const percent = (data.downloaded / data.total) * 100;
        bar.style.width = percent + "%";
        status.textContent = `📥 ${data.downloaded}/${data.total}`;
      }

      if (data.status === "processing") {
        status.textContent = "🎬 Montando vídeo...";
      }

      if (data.status === "finished") {
        status.textContent = "✅ Vídeo pronto!";
        bar.style.width = "100%";
        clearInterval(interval);

        chrome.downloads.download({
          url: `${API}/video`,
          filename: "vsl.mp4"
        });
      }

      if (data.status === "error") {
        status.textContent = "❌ Erro no processamento";
        clearInterval(interval);
      }

    } catch (err) {
      console.log("Erro progress:", err);
    }
  }, 1500);
}