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
// 🚀 DOWNLOAD REAL
// =========================

app.post("/download", async (req, res) => {
  const { segments } = req.body;

  console.log("BODY:", segments?.length);

  if (!segments || !segments.length) {
    return res.status(400).send("Erro: segments não enviado");
  }

  const outputFile = path.join(__dirname, "video.mp4");

  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }
  fs.mkdirSync("segments");

  progress = {
    total: segments.length,
    downloaded: 0,
    status: "downloading"
  };

  const CONCURRENCY = 20;
  let current = 0;

  function downloadFile(url, index) {
    return new Promise((resolve) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) return resolve(false);

        const file = fs.createWriteStream(`segments/${index}.ts`);
        res.pipe(file);

        file.on("finish", () => {
          progress.downloaded++;
          console.log("📥", index);
          resolve(true);
        });
      }).on("error", () => resolve(false));
    });
  }

  async function worker() {
    while (true) {
      const i = current++;
      if (i >= segments.length) break;

      await downloadFile(segments[i], i);
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  progress.status = "processing";

  console.log("🎬 Montando vídeo...");

  const lista = segments
    .map((_, i) => `file '${i}.ts'`)
    .join("\n");

  fs.writeFileSync("segments/lista.txt", lista);

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
});

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

app.get("/", (req, res) => {
  res.send("🔥 TS Downloader PRO rodando!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando na porta ${PORT}`);
});