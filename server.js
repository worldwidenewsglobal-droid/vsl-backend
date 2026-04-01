const express = require("express");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3000;

let progress = {
  total: 0,
  downloaded: 0,
  status: "idle"
};

// =========================
// 🔥 HELPERS
// =========================

function downloadFile(url, filePath) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return resolve(false);

      const file = fs.createWriteStream(filePath);
      res.pipe(file);

      file.on("finish", () => resolve(true));
    }).on("error", () => resolve(false));
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// =========================
// 🎯 TS (VTURB / BRUTE)
// =========================

app.post("/download-ts", async (req, res) => {
  const { tsUrl } = req.body;

  if (!tsUrl) return res.status(400).send("Erro: tsUrl não enviado");

  const base = tsUrl.substring(0, tsUrl.lastIndexOf("/") + 1);

  resetSegments();

  let current = 0;
  let fails = 0;

  progress = { total: 0, downloaded: 0, status: "downloading" };

  console.log("🚀 TS brute iniciado");

  async function download(index) {
    const url = base + `segment_${index}.ts`;
    return await downloadFile(url, `segments/${index}.ts`);
  }

  while (fails < 200) {
    const ok = await download(current);

    if (!ok) fails++;
    else {
      fails = 0;
      current++;
      progress.downloaded++;
      console.log("📥", current);
    }
  }

  finalize(res);
});

// =========================
// 🎬 HLS (M3U8 REAL)
// =========================

app.post("/download-hls", async (req, res) => {
  const { m3u8Url } = req.body;

  if (!m3u8Url) return res.status(400).send("Erro: m3u8Url não enviado");

  resetSegments();

  progress = { total: 0, downloaded: 0, status: "downloading" };

  console.log("📥 Baixando m3u8...");

  let content = await fetchText(m3u8Url);

  // se for master
  if (content.includes("#EXT-X-STREAM-INF")) {
    const lines = content.split("\n");

    let best = null;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("BANDWIDTH")) {
        const bw = parseInt(lines[i].match(/BANDWIDTH=(\d+)/)?.[1] || 0);
        const next = lines[i + 1];

        if (!best || bw > best.bw) {
          best = { bw, url: new URL(next, m3u8Url).href };
        }
      }
    }

    content = await fetchText(best.url);
  }

  const segments = content
    .split("\n")
    .filter(l => l && !l.startsWith("#"))
    .map(seg => new URL(seg, m3u8Url).href);

  progress.total = segments.length;

  console.log("📦 Segmentos:", segments.length);

  for (let i = 0; i < segments.length; i++) {
    const ok = await downloadFile(segments[i], `segments/${i}.ts`);
    if (ok) {
      progress.downloaded++;
      console.log("📥", i);
    }
  }

  finalize(res);
});

// =========================
// 📦 DOWNLOAD DIRETO
// =========================

app.post("/download-direct", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).send("Erro: url não enviado");

  progress = { total: 1, downloaded: 0, status: "downloading" };

  console.log("📥 Download direto...");

  const ok = await downloadFile(url, "video.mp4");

  if (!ok) {
    progress.status = "error";
    return res.status(500).send("Erro");
  }

  progress.downloaded = 1;
  progress.status = "finished";

  res.send("OK");
});

// =========================
// 🧠 FINALIZAÇÃO
// =========================

function resetSegments() {
  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }
  fs.mkdirSync("segments");
}

function finalize(res) {
  progress.total = progress.downloaded;
  progress.status = "processing";

  console.log("🎬 Montando vídeo...");

  const lista = Array.from({ length: progress.downloaded }, (_, i) => `file '${i}.ts'`).join("\n");

  fs.writeFileSync("segments/lista.txt", lista);

  exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy video.mp4`, (err) => {
    if (err) {
      console.log("❌ ERRO:", err);
      progress.status = "error";
      return;
    }

    progress.status = "finished";
    console.log("🔥 VIDEO PRONTO!");
  });

  res.send("Download iniciado 🚀");
}

// =========================
// 📊 STATUS
// =========================

app.get("/progress", (req, res) => {
  res.json(progress);
});

app.get("/video", (req, res) => {
  const filePath = path.join(__dirname, "video.mp4");

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Video não encontrado");
  }

  res.download(filePath);
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});