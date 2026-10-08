/* Blog posts now live as Markdown files in content/posts/ (managed via Decap CMS).
   This loader fetches the file list from the GitHub API, pulls each file from
   raw.githubusercontent.com, parses frontmatter, and renders Markdown to HTML.
   No build step, no third-party CMS. */

var BLOG_REPO = "misereperdue/misereperdue";
var BLOG_BRANCH = "main";
var BLOG_DIR = "content/posts";

var DEMO = {
  _id: "demo-lorem",
  title: "Lorem ipsum",
  slug: "lorem-ipsum",
  publishedAt: "2026-10-07",
  excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  body: "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p><p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>",
  tags: []
};

/* Minimal frontmatter parser: handles `key: value`, inline lists `[a, b]`,
   and block lists:
     tags:
       - a
       - b
*/
function parseFrontmatter(text) {
  var m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  var data = {};
  var lines = m[1].split(/\r?\n/);
  var curKey = null;
  lines.forEach(function (line) {
    var listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem && curKey) {
      if (!Array.isArray(data[curKey])) data[curKey] = [];
      data[curKey].push(listItem[1].trim().replace(/^["']|["']$/g, ""));
      return;
    }
    var i = line.indexOf(":");
    if (i === -1) { curKey = null; return; }
    var k = line.slice(0, i).trim();
    var v = line.slice(i + 1).trim();
    curKey = k;
    if (!v) { data[k] = []; return; } // block list follows
    if (v.charAt(0) === "[" && v.charAt(v.length - 1) === "]") {
      data[k] = v.slice(1, -1).split(",").map(function (s) {
        return s.trim().replace(/^["']|["']$/g, "");
      }).filter(Boolean);
    } else {
      data[k] = v.replace(/^["']|["']$/g, "");
    }
  });
  return { data: data, body: m[2] };
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Compact Markdown → HTML: headings, bold, italic, links, images,
   unordered/ordered lists, blockquotes, code blocks, inline code, paragraphs. */
function mdInline(s) {
  return esc(s)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
}

function mdToHtml(src) {
  var lines = String(src || "").split(/\r?\n/);
  var html = "", inList = null, inCode = false, para = [];
  function flushPara() {
    if (para.length) { html += "<p>" + mdInline(para.join(" ")) + "</p>"; para = []; }
  }
  function closeList() {
    if (inList) { html += inList === "ul" ? "</ul>" : "</ol>"; inList = null; }
  }
  lines.forEach(function (line) {
    if (/^```/.test(line)) {
      flushPara(); closeList();
      html += inCode ? "</code></pre>" : "<pre><code>";
      inCode = !inCode;
      return;
    }
    if (inCode) { html += esc(line) + "\n"; return; }
    var h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) { flushPara(); closeList(); html += "<h" + h[1].length + ">" + mdInline(h[2]) + "</h" + h[1].length + ">"; return; }
    var bq = line.match(/^>\s?(.*)$/);
    if (bq) { flushPara(); closeList(); html += "<blockquote>" + mdInline(bq[1]) + "</blockquote>"; return; }
    var ul = line.match(/^\s*[-*]\s+(.+)$/);
    var ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ul || ol) {
      flushPara();
      var kind = ul ? "ul" : "ol";
      if (inList !== kind) { closeList(); html += "<" + kind + ">"; inList = kind; }
      html += "<li>" + mdInline((ul || ol)[1]) + "</li>";
      return;
    }
    if (/^\s*$/.test(line)) { flushPara(); closeList(); return; }
    closeList();
    para.push(line.trim());
  });
  flushPara(); closeList();
  if (inCode) html += "</code></pre>";
  return html;
}

/* textFrom: plain-text excerpt helper (kept for compatibility). */
function textFrom(body) {
  if (!body) return [];
  if (typeof body === "string") {
    // Strip HTML tags, split into paragraphs
    var txt = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return txt ? [txt] : [];
  }
  if (Array.isArray(body)) return body.map(String);
  return [];
}

function slugFrom(name) {
  return name.replace(/\.md$/i, "");
}

async function loadPosts() {
  try {
    var listUrl = "https://api.github.com/repos/" + BLOG_REPO + "/contents/" + BLOG_DIR + "?ref=" + BLOG_BRANCH;
    var res = await fetch(listUrl);
    if (!res.ok) throw new Error("list failed");
    var files = await res.json();
    files = files.filter(function (f) { return f.type === "file" && /\.md$/i.test(f.name); });
    if (!files.length) return [DEMO];
    var posts = await Promise.all(files.map(async function (f) {
      var raw = await fetch("https://raw.githubusercontent.com/" + BLOG_REPO + "/" + BLOG_BRANCH + "/" + BLOG_DIR + "/" + f.name);
      var text = await raw.text();
      var parsed = parseFrontmatter(text);
      var d = parsed.data;
      var slug = slugFrom(f.name);
      return {
        _id: slug,
        title: d.title || slug,
        slug: slug,
        publishedAt: d.date || "",
        excerpt: d.excerpt || "",
        body: mdToHtml(parsed.body),
        tags: Array.isArray(d.tags) ? d.tags : (d.tags ? [d.tags] : []),
        header_media: d.header_media || ""
      };
    }));
    posts.sort(function (a, b) { return (b.publishedAt || "").localeCompare(a.publishedAt || ""); });
    return posts.length ? posts : [DEMO];
  } catch (err) {
    console.warn(err);
  }
  return [DEMO];
}

window.SanityBlog = { loadPosts: loadPosts, textFrom: textFrom, DEMO: DEMO };
