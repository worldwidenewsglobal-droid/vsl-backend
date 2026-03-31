const path = require("path");
const DOWNLOADS_DIR = "C:\\Users\\diasi\\Downloads";
const HISTORY_FILE = "history.json";
const express = require("express");
const fs = require("fs");
const https = require("https");
const { exec } = require("child_process");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

let progress = {
  total: 0,
  downloaded: 0,
  status: "idle"
};

app.post("/download", async (req, res) => {
  const { tsUrl } = req.body;

  if (!tsUrl) return res.status(400).send("Erro");

  const base = tsUrl.substring(0, tsUrl.lastIndexOf("/") + 1);

  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }

  fs.mkdirSync("segments");

  let current = 0;
  const MAX = 3000;
  const CONCURRENCY = 20;

  progress = {
    total: MAX,
    downloaded: 0,
    status: "downloading"
  };

  async function download(index) {
    return new Promise((resolve) => {
      const url = base + `segment_${index}.ts`;
      const filePath = `segments/segment_${index}.ts`;

      https.get(url, (res) => {
        if (res.statusCode !== 200) return resolve(false);

        const file = fs.createWriteStream(filePath);
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
      if (i > MAX) break;

      const ok = await download(i);
      if (!ok) break;
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  progress.status = "processing";

  const files = fs.readdirSync("segments")
    .filter(f => f.endsWith(".ts"))
    .sort((a, b) => {
      const n1 = parseInt(a.match(/\d+/)[0]);
      const n2 = parseInt(b.match(/\d+/)[0]);
      return n1 - n2;
    });

  const lista = files.map(f => `file '${f}'`).join("\n");
  fs.writeFileSync("segments/lista.txt", lista);

  const ffmpegPath = `"C:\\Users\\diasi\\OneDrive\\Área de Trabalho\\Vturb\\ffmpeg-2026-03-30-git-e54e117998-full_build\\bin\\ffmpeg.exe"`;

  exec(`${ffmpegPath} -f concat -safe 0 -i segments/lista.txt -c copy video.mp4 && start "" video.mp4`, () => {
    progress.status = "finished";
    console.log("🔥 VIDEO PRONTO!");
  });

  res.send("ok");
});

app.get("/progress", (req, res) => {
  res.json(progress);
});

app.listen(PORT, () => {
  console.log(`🚀 Server rodando em http://localhost:${PORT}`);
});