const SANITY = {
  projectId: "2lk7qfv1",
  dataset: "production",
  api: "2021-10-21"
};

const DEMO = {
  _id: "demo-lorem",
  title: "Lorem ipsum",
  slug: "lorem-ipsum",
  publishedAt: "2026-10-07",
  excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  body: [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  ]
};

function textFrom(body) {
  if (!body) return [];
  if (typeof body === "string") return [body];
  if (Array.isArray(body) && typeof body[0] === "string") return body;
  return body
    .map(block => (block.children || []).map(c => c.text || "").join(""))
    .filter(Boolean);
}

async function loadPosts() {
  const query = '*[_type == "post"] | order(publishedAt desc)[0...12]{_id,title,"slug":slug.current,excerpt,body,publishedAt}';
  const url = `https://${SANITY.projectId}.api.sanity.io/v${SANITY.api}/data/query/${SANITY.dataset}?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (Array.isArray(data.result) && data.result.length) return data.result;
  } catch (err) {
    console.warn(err);
  }
  return [DEMO];
}

window.SanityBlog = { loadPosts, textFrom, DEMO };
