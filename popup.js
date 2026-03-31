const status = document.getElementById("status");
const bar = document.getElementById("progress");

document.getElementById("baixar").addEventListener("click", () => {
  status.textContent = "🔍 Buscando vídeo...";

  chrome.runtime.sendMessage("getVideos", (videos) => {
    const ts = videos.find(v => v.includes(".ts"));

    if (!ts) {
      status.textContent = "❌ Nenhum vídeo encontrado";
      return;
    }

    fetch("http://localhost:3000/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tsUrl: ts })
    });

    acompanhar();
  });
});

function acompanhar() {
  const interval = setInterval(async () => {
    const res = await fetch("http://localhost:3000/progress");
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
    }
  }, 1000);
}