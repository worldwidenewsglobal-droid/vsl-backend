// 🔥 SERVER FINAL TURBO

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
// HELPERS
// =========================

function downloadFile(url, filePath) {
  return new Promise((resolve) => {

    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": url
      }
    };

    https.get(url, options, (res) => {

      if (res.statusCode !== 200) return resolve(false);

      const file = fs.createWriteStream(filePath);
      res.pipe(file);

      file.on("finish", () => resolve(true));

    }).on("error", () => resolve(false));
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {

    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": url
      }
    }, (res) => {

      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));

    }).on("error", reject);
  });
}

function reset() {
  if (fs.existsSync("segments")) {
    fs.rmSync("segments", { recursive: true, force: true });
  }
  fs.mkdirSync("segments");
}

// =========================
// DOWNLOAD
// =========================

app.post("/download", async (req, res) => {

  let { url, type } = req.body;

  if (!url) return res.status(400).send("sem url");

  console.log("🚀 DOWNLOAD:", type);

  reset();

  progress = { total: 0, downloaded: 0, status: "downloading" };

  try {

    // =========================
    // HLS (PARALELO)
    // =========================

    if (type === "hls") {

      try {

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
          .map(s => new URL(s, url).href);

        progress.total = segments.length;

        let current = 0;
        const CONCURRENCY = 20;

        async function worker() {
          while (current < segments.length) {
            const i = current++;
            const ok = await downloadFile(segments[i], `segments/${i}.ts`);
            if (ok) progress.downloaded++;
          }
        }

        await Promise.all(Array(CONCURRENCY).fill().map(worker));

      } catch (e) {
        console.log("⚠️ HLS falhou, indo TS");
        type = "ts-group";
      }
    }

    // =========================
    // TS (RÁPIDO)
    // =========================

    if (type === "ts-group") {

      const base = url.substring(0, url.lastIndexOf("/") + 1);

      let current = 0;
      let fails = 0;
      const CONCURRENCY = 20;

      async function worker() {
        while (fails < 50) {
          const i = current++;
          const tsUrl = base + `segment_${i}.ts`;

          const ok = await downloadFile(tsUrl, `segments/${i}.ts`);

          if (!ok) fails++;
          else {
            fails = 0;
            progress.downloaded++;
          }
        }
      }

      await Promise.all(Array(CONCURRENCY).fill().map(worker));

      progress.total = progress.downloaded;
    }

    // =========================
    // FFMPEG
    // =========================

    progress.status = "processing";

    const files = fs.readdirSync("segments")
      .filter(f => f.endsWith(".ts"))
      .sort((a, b) => parseInt(a) - parseInt(b));

    const lista = files.map(f => `file '${f}'`).join("\n");

    fs.writeFileSync("segments/lista.txt", lista);

    exec(`ffmpeg -f concat -safe 0 -i segments/lista.txt -c copy video.mp4`, (err) => {
      if (err) {
        progress.status = "error";
        return;
      }
      progress.status = "finished";
    });

    res.send("ok");

  } catch (e) {
    progress.status = "error";
    res.status(500).send("erro");
  }
});

// =========================

app.get("/progress", (req, res) => res.json(progress));

app.get("/video", (req, res) => {
  const file = path.join(__dirname, "video.mp4");
  if (!fs.existsSync(file)) return res.status(404).send("nao pronto");
  res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
  res.setHeader("Content-Type", "video/mp4");

res.sendFile(file);
});

app.listen(PORT, () => console.log("🔥 SERVER TURBO RODANDO"));