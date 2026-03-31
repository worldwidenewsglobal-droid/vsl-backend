const status = document.getElementById("status");
const bar = document.getElementById("progress");

const API = "https://vsl-backend.onrender.com";

document.getElementById("baixar").addEventListener("click", () => {
  status.textContent = "🔍 Buscando vídeo...";

  chrome.runtime.sendMessage("getVideos", (videos) => {
    const ts = videos.find(v => v.includes(".ts"));

    if (!ts) {
      status.textContent = "❌ Nenhum vídeo encontrado";
      return;
    }

    status.textContent = "🚀 Enviando pro servidor...";

    fetch(`${API}/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tsUrl: ts })
    })
    .then(() => {
      acompanhar();
    })
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
        status.textContent = `📥 ${data.downloaded} arquivos`;
      }

      if (data.status === "processing") {
        status.textContent = "🎬 Montando vídeo...";
      }

      if (data.status === "finished") {
        status.textContent = "✅ Vídeo pronto!";
        bar.style.width = "100%";
        clearInterval(interval);

        // 🔥 BAIXA AUTOMÁTICO
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