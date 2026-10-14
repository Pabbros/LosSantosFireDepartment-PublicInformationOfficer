export type Post = {
  id: string;
  type: string;
  tag: string;
  division: string;
  status: string;
  title: string;
  author: string;
  date: string;
  image: string;
  content: string;
};

export type SiteConfig = {
  org: string;
  sub: string;
  listTitle: string;
  disclaimer: string;
  footer: string;
  sections: { id: string; label: string; kind: "sec" | "divs" }[];
  divisions: string[];
  dispatch: { title: string; active: string; units: string; response: string; alert: string; phone: string };
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Data tidak valid.");
  return value as Record<string, unknown>;
}

function text(value: unknown, max = 5000): string {
  if (typeof value !== "string" || value.length > max) throw new Error("Teks tidak valid atau terlalu panjang.");
  return value;
}

export function validateImage(value: unknown): string {
  const image = text(value, 2000);
  if (image && !/^https?:\/\/[^\s]+$/i.test(image) && !/^\/api\/media\/[a-f0-9-]{36}\.(?:png|jpg|webp)$/.test(image) && image !== "/assets/default-hero.jpg") {
    throw new Error("Gambar harus diunggah atau memakai URL HTTP/HTTPS.");
  }
  return image;
}

export function validateSnapshot(value: unknown) {
  const body = record(value);
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new Error("Versi data tidak valid.");
  if (!Array.isArray(body.items) || body.items.length > 500) throw new Error("Maksimal 500 postingan.");
  const ids = new Set<string>();
  const items = body.items.map((value): Post => {
    const post = record(value);
    const id = text(post.id, 100);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id)) throw new Error("ID postingan tidak valid atau duplikat.");
    ids.add(id);
    const title = text(post.title, 500);
    const content = text(post.content, 100000);
    const date = text(post.date, 40);
    if (!title.trim() || !content.trim() || !Number.isFinite(Date.parse(date))) throw new Error("Judul, isi, dan tanggal wajib valid.");
    return { id, title, content, date, image: validateImage(post.image), type: text(post.type, 100), tag: text(post.tag, 200), division: text(post.division, 200), status: text(post.status, 200), author: text(post.author, 300) };
  });
  const input = record(body.cfg);
  if (!Array.isArray(input.sections) || input.sections.length > 50 || !Array.isArray(input.divisions) || input.divisions.length > 100) throw new Error("Menu atau divisi tidak valid.");
  const sectionIds = new Set<string>();
  const sections = input.sections.map(value => {
    const section = record(value);
    const id = text(section.id, 100);
    if (!/^[a-zA-Z0-9_-]+$/.test(id) || sectionIds.has(id) || !["sec", "divs"].includes(String(section.kind))) throw new Error("Kategori tidak valid.");
    sectionIds.add(id);
    return { id, label: text(section.label, 200), kind: section.kind as "sec" | "divs" };
  });
  const dispatch = record(input.dispatch);
  const cfg: SiteConfig = {
    org: text(input.org, 300), sub: text(input.sub, 300), listTitle: text(input.listTitle, 300),
    disclaimer: text(input.disclaimer, 10000), footer: text(input.footer, 10000), sections,
    divisions: input.divisions.map(value => text(value, 200)),
    dispatch: { title: text(dispatch.title, 300), active: text(dispatch.active, 100), units: text(dispatch.units, 100), response: text(dispatch.response, 100), alert: text(dispatch.alert), phone: text(dispatch.phone, 300) },
  };
  return { items, cfg, revision: Number(body.revision) };
}

export function isAdmin(user: { roles?: string[]; appMetadata?: Record<string, unknown> } | null): boolean {
  if (!user) return false;
  const authorization = user.appMetadata?.authorization as { roles?: string[] } | undefined;
  return Array.isArray(user.roles) && user.roles.includes("admin") || Array.isArray(authorization?.roles) && authorization.roles.includes("admin");
}

export function imageFormat(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (bytes.length < 12) return null;
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "webp";
  return null;
}
