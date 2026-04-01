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

function resetSegments() {
  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }
  fs.mkdirSync("segments");
}

// =========================
// 🚀 DOWNLOAD PRINCIPAL
// =========================

app.post("/download", async (req, res) => {

  const { url, type } = req.body;

  console.log("🔥 RECEBEU:", req.body);

  if (!url) return res.status(400).send("URL não enviada");

  resetSegments();

  progress = { total: 0, downloaded: 0, status: "downloading" };

  try {

    // =========================
    // ⚡ TS SUPER RÁPIDO (PARALELO)
    // =========================

    if (type === "ts-group") {

      const base = url.substring(0, url.lastIndexOf("/") + 1);

      let current = 0;
      let fails = 0;

      const CONCURRENCY = 20;

      async function worker() {
        while (fails < 50) {
          const index = current++;

          const tsUrl = base + `segment_${index}.ts`;
          const ok = await downloadFile(tsUrl, `segments/${index}.ts`);

          if (!ok) {
            fails++;
          } else {
            fails = 0;
            progress.downloaded++;
            console.log("📥 TS", index);
          }
        }
      }

      const workers = [];
      for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker());
      }

      await Promise.all(workers);

      progress.total = progress.downloaded;
    }

    // =========================
    // 🎬 HLS
    // =========================

    else if (type === "hls") {

      let content = await fetchText(url);

      if (content.includes("#EXT-X-STREAM-INF")) {
        const lines = content.split("\n");

        let best = null;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes("BANDWIDTH")) {
            const bw = parseInt(lines[i].match(/BANDWIDTH=(\d+)/)?.[1] || 0);
            const next = lines[i + 1];

            if (!best || bw > best.bw) {
              best = { bw, url: new URL(next, url).href };
            }
          }
        }

        content = await fetchText(best.url);
      }

      const segments = content
        .split("\n")
        .filter(l => l && !l.startsWith("#"))
        .map(seg => new URL(seg, url).href);

      progress.total = segments.length;

      const CONCURRENCY = 20;
      let current = 0;

      async function worker() {
        while (current < segments.length) {
          const i = current++;
          const ok = await downloadFile(segments[i], `segments/${i}.ts`);

          if (ok) {
            progress.downloaded++;
            console.log("📥 HLS", i);
          }
        }
      }

      const workers = [];
      for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker());
      }

      await Promise.all(workers);
    }

    // =========================
    // 📦 MP4
    // =========================

    else {

      const ok = await downloadFile(url, "video.mp4");

      if (!ok) {
        progress.status = "error";
        return res.status(500).send("Erro");
      }

      progress.total = 1;
      progress.downloaded = 1;
      progress.status = "finished";

      return res.send("OK");
    }

    // =========================
    // 🎬 FFMPEG
    // =========================

    progress.status = "processing";

    console.log("🎬 Montando vídeo...");

    const files = fs.readdirSync("segments")
      .filter(f => f.endsWith(".ts"))
      .sort((a, b) => parseInt(a) - parseInt(b));

    const lista = files.map(f => `file '${f}'`).join("\n");

    fs.writeFileSync("segments/lista.txt", lista);

    exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy video.mp4`, (err) => {
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
    res.status(500).send("Erro");
  }
});

// =========================
// 📊 STATUS
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

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});