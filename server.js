const express = require("express");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let progress = {
  total: 0,
  downloaded: 0,
  status: "idle"
};

// =========================
// 🔥 HELPERS
// =========================

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": url
      }
    }, res => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function isMaster(m3u8) {
  return m3u8.includes("#EXT-X-STREAM-INF");
}

function getBestPlaylist(m3u8, baseUrl) {
  const lines = m3u8.split("\n");

  let best = null;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("#EXT-X-STREAM-INF")) {
      const bandwidth = parseInt(lines[i].match(/BANDWIDTH=(\d+)/)?.[1] || 0);
      const next = lines[i + 1];

      if (!best || bandwidth > best.bandwidth) {
        best = {
          bandwidth,
          url: new URL(next, baseUrl).href
        };
      }
    }
  }

  return best?.url;
}

function getSegments(m3u8, baseUrl) {
  return m3u8
    .split("\n")
    .filter(line => line && !line.startsWith("#"))
    .map(seg => new URL(seg, baseUrl).href);
}

function downloadFile(url, filePath) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": url
      }
    }, (res) => {
      if (res.statusCode !== 200) return resolve(false);

      const file = fs.createWriteStream(filePath);
      res.pipe(file);

      file.on("finish", () => resolve(true));
    }).on("error", () => resolve(false));
  });
}

// =========================
// 🚀 ROTA DOWNLOAD
// =========================

app.post("/download", async (req, res) => {
  const { m3u8Url } = req.body;

  if (!m3u8Url) {
    return res.status(400).send("Erro: m3u8Url não enviado");
  }

  const outputFile = path.join(__dirname, "video.mp4");

  // limpa pasta
  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }
  fs.mkdirSync("segments");

  progress = {
    total: 0,
    downloaded: 0,
    status: "downloading"
  };

  try {
    console.log("📥 Baixando M3U8...");

    let m3u8Content = await fetchText(m3u8Url);

    // 🔥 se for master, pega melhor qualidade
    if (isMaster(m3u8Content)) {
      console.log("🎯 Detectado MASTER playlist");

      const bestUrl = getBestPlaylist(m3u8Content, m3u8Url);

      console.log("🏆 Melhor qualidade:", bestUrl);

      m3u8Content = await fetchText(bestUrl);
      m3u8Url = bestUrl;
    }

    const segments = getSegments(m3u8Content, m3u8Url);

    console.log("📦 Total de segmentos:", segments.length);

    progress.total = segments.length;

    const CONCURRENCY = 20;
    let current = 0;

    async function worker() {
      while (true) {
        const i = current++;
        if (i >= segments.length) break;

        const ok = await downloadFile(
          segments[i],
          `segments/${i}.ts`
        );

        if (ok) {
          progress.downloaded++;
          console.log("📥", i);
        }
      }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    progress.status = "processing";

    console.log("📄 Gerando lista...");

    const files = fs.readdirSync("segments")
      .filter(f => f.endsWith(".ts"))
      .sort((a, b) => {
        const n1 = parseInt(a);
        const n2 = parseInt(b);
        return n1 - n2;
      });

    const lista = files.map(f => `file '${f}'`).join("\n");
    fs.writeFileSync("segments/lista.txt", lista);

    console.log("🎬 Rodando ffmpeg...");

    exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy "${outputFile}"`, (err) => {
      if (err) {
        console.log("❌ ERRO FFMPEG:", err);
        progress.status = "error";
        return;
      }

      progress.status = "finished";
      console.log("🔥 VIDEO PRONTO!");
    });

    res.send("Download iniciado 🚀");

  } catch (err) {
    console.log("❌ ERRO:", err);
    progress.status = "error";
    res.status(500).send("Erro no download");
  }
});

// =========================
// 📊 PROGRESSO
// =========================

app.get("/progress", (req, res) => {
  res.json(progress);
});

// =========================
// 📥 DOWNLOAD FINAL
// =========================

app.get("/video", (req, res) => {
  const filePath = path.join(__dirname, "video.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video não encontrado");
  }

  res.download(filePath);
});

// =========================
// ROOT
// =========================

app.get("/", (req, res) => {
  res.send("🔥 VSL Backend PRO rodando!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});