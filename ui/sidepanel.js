const list = document.getElementById("list");
const empty = document.getElementById("empty");

function loadVideos() {
  chrome.runtime.sendMessage("getVideos", (videos) => {

    if (!videos || !videos.length) {
      empty.style.display = "block";
      list.innerHTML = "";
      return;
    }

    empty.style.display = "none";

    const grouped = {};

    videos.forEach(v => {

      if (v.type === "ts-base") {

        if (!grouped[v.url]) {
          grouped[v.url] = {
            url: v.url + "segment_0.ts",
            type: "ts-group",
            label: "🎬 VTurb (TS Completo)"
          };
        }

      }

      else if (v.type === "hls") {
        grouped[v.url] = {
          ...v,
          label: "🎬 M3U8 (Completo)"
        };
      }

      else if (v.type === "mp4") {
        grouped[v.url] = {
          ...v,
          label: "🎬 MP4 Direto"
        };
      }

    });

    render(Object.values(grouped));
  });
}

function render(videos) {

  list.innerHTML = "";

  videos.forEach((video) => {

    const el = document.createElement("div");
    el.className = "card";

    el.innerHTML = `
      <div>${video.label}</div>
      <button>Baixar</button>
    `;

    list.appendChild(el);
  });
}

document.getElementById("reload").onclick = async () => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.runtime.sendMessage("clearVideos");

  chrome.tabs.reload(tab.id);
};

setInterval(loadVideos, 2000);