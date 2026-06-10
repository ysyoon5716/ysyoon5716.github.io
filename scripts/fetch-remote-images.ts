import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const POSTS_DIR = join(ROOT, "src", "content", "posts");
const IMAGES_DIR = join(ROOT, "src", "assets", "images");
const RELATIVE_PREFIX = "../../assets/images";

const YOUTUBE_HOSTS = new Set([
  "youtu.be",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

const IMAGE_RE = /(!\[[^\]]*\]\()([^)\s]+)(\))/g;
const OGIMAGE_RE = /^(\s*ogImage:\s*)(["']?)([^\r\n"']+)\2\s*$/m;

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isYouTubeUrl(rawUrl: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

function extFromUrl(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const last = u.pathname.split("/").pop() ?? "";
    const dot = last.lastIndexOf(".");
    if (dot === -1) return null;
    const ext = last.slice(dot + 1).toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) return null;
    return ext === "jpeg" ? "jpg" : ext;
  } catch {
    return null;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findExistingFile(
  dir: string,
  baseName: string
): Promise<string | null> {
  try {
    const files = await readdir(dir);
    for (const ext of IMAGE_EXTS) {
      const candidate = `${baseName}.${ext === "jpeg" ? "jpg" : ext}`;
      if (files.includes(candidate)) return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

async function downloadImage(
  url: string,
  baseName: string
): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download ${url}: ${res.status} ${res.statusText}`
    );
  }
  const contentType = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim();
  if (!contentType.startsWith("image/")) {
    console.warn(
      `[fetch-remote-images] skip non-image content-type (${contentType}) for ${url}`
    );
    return null;
  }
  let ext = extFromUrl(url);
  if (!ext) ext = MIME_TO_EXT[contentType];
  if (!ext) {
    console.warn(
      `[fetch-remote-images] cannot determine extension for ${url} (content-type: ${contentType})`
    );
    return null;
  }
  const filename = `${baseName}.${ext}`;
  const destPath = join(IMAGES_DIR, filename);
  await mkdir(IMAGES_DIR, { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return filename;
}

function splitFrontmatter(source: string): {
  frontmatter: string;
  body: string;
  hasFrontmatter: boolean;
} {
  if (!source.startsWith("---")) {
    return { frontmatter: "", body: source, hasFrontmatter: false };
  }
  const firstLineEnd = source.indexOf("\n");
  if (firstLineEnd === -1) {
    return { frontmatter: "", body: source, hasFrontmatter: false };
  }
  const closing = source.indexOf("\n---", firstLineEnd);
  if (closing === -1) {
    return { frontmatter: "", body: source, hasFrontmatter: false };
  }
  let end = closing + 4;
  if (source[end] === "\r") end++;
  if (source[end] === "\n") end++;
  return {
    frontmatter: source.slice(0, end),
    body: source.slice(end),
    hasFrontmatter: true,
  };
}

interface Stats {
  downloads: number;
  cached: number;
}

async function processPost(filePath: string, slug: string): Promise<Stats> {
  const source = await readFile(filePath, "utf8");
  const { frontmatter, body, hasFrontmatter } = splitFrontmatter(source);

  const takenIdx = new Set<number>();
  const localRe = new RegExp(`${slug}-(\\d+)\\.`, "g");
  for (const match of body.matchAll(localRe)) {
    takenIdx.add(Number(match[1]));
  }
  try {
    const existing = await readdir(IMAGES_DIR);
    const fileRe = new RegExp(`^${slug}-(\\d+)\\.`);
    for (const f of existing) {
      const m = fileRe.exec(f);
      if (m) takenIdx.add(Number(m[1]));
    }
  } catch {
    // images dir does not exist yet
  }

  let cursor = 1;
  const nextIdx = (): number => {
    while (takenIdx.has(cursor)) cursor++;
    const n = cursor;
    takenIdx.add(n);
    cursor++;
    return n;
  };

  let stats: Stats = { downloads: 0, cached: 0 };
  let newFrontmatter = frontmatter;
  let newBody = body;
  let changed = false;

  const replacements: { start: number; end: number; text: string }[] = [];
  for (const match of body.matchAll(IMAGE_RE)) {
    const url = match[2];
    if (!isHttpUrl(url)) continue;
    if (isYouTubeUrl(url)) continue;

    const idx = nextIdx();
    const baseName = `${slug}-${idx}`;
    const existing = await findExistingFile(IMAGES_DIR, baseName);
    let filename: string | null;
    if (existing) {
      filename = existing;
      stats.cached++;
    } else {
      filename = await downloadImage(url, baseName);
      if (!filename) continue;
      stats.downloads++;
    }
    const start = match.index!;
    const end = start + match[0].length;
    replacements.push({
      start,
      end,
      text: `${match[1]}${RELATIVE_PREFIX}/${filename}${match[3]}`,
    });
  }

  if (replacements.length > 0) {
    replacements.sort((a, b) => b.start - a.start);
    let mod = body;
    for (const r of replacements) {
      mod = mod.slice(0, r.start) + r.text + mod.slice(r.end);
    }
    newBody = mod;
    changed = true;
  }

  if (hasFrontmatter) {
    const m = OGIMAGE_RE.exec(frontmatter);
    if (m) {
      const url = m[3];
      if (isHttpUrl(url) && !isYouTubeUrl(url)) {
        const baseName = `${slug}-og`;
        const existing = await findExistingFile(IMAGES_DIR, baseName);
        let filename: string | null;
        if (existing) {
          filename = existing;
          stats.cached++;
        } else {
          filename = await downloadImage(url, baseName);
          if (filename) stats.downloads++;
        }
        if (filename) {
          const quote = m[2];
          newFrontmatter = frontmatter.replace(
            OGIMAGE_RE,
            () => `${m[1]}${quote}${RELATIVE_PREFIX}/${filename}${quote}`
          );
          changed = true;
        }
      }
    }
  }

  if (changed) {
    await writeFile(filePath, newFrontmatter + newBody);
  }

  return stats;
}

async function main(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(POSTS_DIR);
  } catch (err) {
    console.error(`[fetch-remote-images] cannot read posts dir: ${POSTS_DIR}`);
    throw err;
  }

  const posts = entries.filter(
    f => (f.endsWith(".md") || f.endsWith(".mdx")) && !f.startsWith("_")
  );

  let totalDownloads = 0;
  let totalCached = 0;

  for (const f of posts) {
    const filePath = join(POSTS_DIR, f);
    const slug = f.replace(/\.(md|mdx)$/, "");
    const { downloads, cached } = await processPost(filePath, slug);
    if (downloads > 0 || cached > 0) {
      console.log(
        `[fetch-remote-images] ${f}: ${downloads} downloaded, ${cached} cached`
      );
    }
    totalDownloads += downloads;
    totalCached += cached;
  }

  console.log(
    `[fetch-remote-images] done. ${totalDownloads} downloaded, ${totalCached} cached.`
  );
}

main().catch(err => {
  console.error("[fetch-remote-images]", err);
  process.exit(1);
});
