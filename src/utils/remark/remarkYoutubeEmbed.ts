import { visit, SKIP } from "unist-util-visit";
import type { Root, Image, Paragraph, Html } from "mdast";

const YOUTUBE_HOSTS = new Set([
  "youtu.be",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function extractVideoId(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) return null;

  let id: string | null = null;

  if (url.hostname === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] ?? null;
  } else {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") {
      id = url.searchParams.get("v");
    } else if (parts[0] === "shorts" || parts[0] === "embed") {
      id = parts[1] ?? null;
    }
  }

  if (!id || !VIDEO_ID_RE.test(id)) return null;
  return id;
}

function buildEmbedHtml(videoId: string): string {
  return (
    `<div class="youtube-embed" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1.5rem 0;">` +
    `<iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe>` +
    `</div>`
  );
}

export function remarkYoutubeEmbed() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (
        parent == null ||
        index == null ||
        node.children.length !== 1 ||
        node.children[0].type !== "image"
      ) {
        return;
      }
      const image = node.children[0] as Image;
      const videoId = extractVideoId(image.url);
      if (!videoId) return;

      const htmlNode: Html = {
        type: "html",
        value: buildEmbedHtml(videoId),
      };
      parent.children.splice(index, 1, htmlNode);
      return [SKIP, index + 1];
    });

    visit(tree, "image", (node: Image, index, parent) => {
      if (parent == null || index == null) return;
      const videoId = extractVideoId(node.url);
      if (!videoId) return;

      const htmlNode: Html = {
        type: "html",
        value: buildEmbedHtml(videoId),
      };
      parent.children.splice(index, 1, htmlNode);
      return [SKIP, index + 1];
    });
  };
}

export default remarkYoutubeEmbed;
