const list = document.getElementById("list");

function load() {

  chrome.runtime.sendMessage("getVideos", (videos) => {

    console.log("📦", videos);

    list.innerHTML = "";

    videos.forEach(v => {

      const el = document.createElement("div");

      el.innerHTML = `
        <p>${v.url}</p>
      `;

      list.appendChild(el);
    });

  });

}

setInterval(load, 1000);