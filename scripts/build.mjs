import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import QRCode from "qrcode";
import { contactNav, escapeHTML } from "../src/contact-nav.mjs";
import { createVCard } from "../src/vcard.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const mediaTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const fonts = ["inter-latin.woff2", "inter-latin-ext.woff2", "jakarta-latin.woff2", "jakarta-latin-ext.woff2"];

const readText = (file) => fs.readFile(path.join(root, file), "utf8");

async function readJSON(file) {
  try {
    return JSON.parse(await readText(file));
  } catch (error) {
    throw new Error(file + ": " + error.message);
  }
}

async function validateJSON(file, validate) {
  const data = await readJSON(file);
  if (validate(data)) return data;
  const errors = validate.errors.map(({ instancePath, message, params }) => {
    const key = instancePath || params.missingProperty || params.additionalProperty || "dosya";
    return key + " " + message;
  });
  throw new Error(file + ": " + errors.join("; "));
}

function readWebsite(value, source) {
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(source + ": geçerli bir web adresi girin.");
  }
  if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error(source + ": adres http:// veya https:// ile başlamalı ve kullanıcı bilgisi içermemeli.");
  }
  return url;
}

async function imageData(file) {
  const extension = path.posix.extname(file).toLowerCase();
  const mime = mediaTypes[extension];
  if (!mime || !/^(?:[\p{L}\p{N} _.-]+\/)*[\p{L}\p{N} _.-]+$/u.test(file) ||
      file.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error(file + ": assets içinde bir JPG, PNG veya WebP yolu kullanın.");
  }
  try {
    const asset = await fs.readFile(path.join(root, "assets", file));
    return "data:" + mime + ";base64," + asset.toString("base64");
  } catch (error) {
    throw new Error("assets/" + file + ": " + error.message);
  }
}

function render(template, values) {
  return template.replace(/\{\{([\w.-]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new Error("Şablon alanı eksik: " + key);
    return values[key];
  });
}

async function buildCard(site, template, shared, slug, contact) {
  const website = readWebsite(contact.website === undefined ? site.website : contact.website,
    "contacts/" + slug + ".json → website");
  const person = { ...contact, name: contact.givenName + " " + contact.familyName };
  const vcard = createVCard(person, site.organization, website);
  const qr = await QRCode.toBuffer(vcard, { errorCorrectionLevel: "M", margin: 4, scale: 8, type: "png" });
  const route = (site.basePath === "/" ? "" : site.basePath) + "/" + slug + "/";
  const details = [person.name, person.title, site.organization].filter(Boolean).join(" · ");
  const html = render(template, {
    ...shared,
    slug,
    name: escapeHTML(person.name),
    pageTitle: escapeHTML(person.name + " · " + site.brand),
    description: escapeHTML(details + ". İletişim bilgileri ve dijital kartvizit."),
    role: person.title ? '<p class="role">' + escapeHTML(person.title) + "</p>" : "",
    portrait: await imageData(person.photo),
    contactHref: route + slug + ".vcf",
    contactNav: contactNav(person, website),
    qr: "data:image/png;base64," + qr.toString("base64"),
    qrSize: qr.readUInt32BE(16),
    vcardJS: JSON.stringify(vcard).replace(/</g, "\\u003c")
  });
  return { slug, route, html, vcard, qr };
}

async function publish(cards) {
  const dist = path.join(root, "dist");
  const stage = await fs.mkdtemp(path.join(root, ".dist-"));
  const next = path.join(stage, "next");
  const previous = path.join(stage, "previous");
  try {
    await fs.mkdir(next);
    for (const { slug, route, html, vcard, qr } of cards) {
      const directory = path.join(next, route.slice(1));
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(path.join(directory, "index.html"), html);
      await fs.writeFile(path.join(directory, slug + ".vcf"), vcard);
      await fs.writeFile(path.join(directory, slug + "-qr.png"), qr);
    }
    let hadPrevious = true;
    try {
      await fs.rename(dist, previous);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hadPrevious = false;
    }
    try {
      await fs.rename(next, dist);
    } catch (error) {
      if (hadPrevious) await fs.rename(previous, dist);
      throw error;
    }
  } finally {
    // If restoration fails, retain the previous build in the staging directory.
    const recovery = await fs.stat(previous).catch(() => null);
    const active = await fs.stat(dist).catch(() => null);
    if (!recovery || active) await fs.rm(stage, { recursive: true, force: true });
  }
}

async function main() {
  const ajv = new Ajv({ allErrors: true });
  const validateSite = ajv.compile(await readJSON("schema/site.schema.json"));
  const validateContact = ajv.compile(await readJSON("schema/contact.schema.json"));
  const site = await validateJSON("site.json", validateSite);
  readWebsite(site.website, "site.json → website");

  const template = await readText("src/card.html");
  const licenses = await Promise.all(["inter-ofl.txt", "jakarta-ofl.txt"].map((name) => readText("assets/fonts/" + name)));
  const fontData = await Promise.all(fonts.map(async (name) => {
    const font = await fs.readFile(path.join(root, "assets/fonts", name));
    return [name, "data:font/woff2;base64," + font.toString("base64")];
  }));
  const shared = {
    ...Object.fromEntries(fontData),
    logo: await imageData(site.logo),
    brand: escapeHTML(site.brand),
    organization: escapeHTML(site.organization),
    fontLicenses: "Embedded font licenses\n\n" + licenses.map((license) => license.trim()).join("\n\n") + "\n"
  };

  const files = (await fs.readdir(path.join(root, "contacts"))).filter((file) => file.endsWith(".json")).sort();

  const cards = [];
  for (const file of files) {
    const slug = file.slice(0, -5);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error(file + ": dosya adında yalnızca küçük Latin harfleri, rakam ve kısa çizgi kullanın.");
    }
    const contact = await validateJSON("contacts/" + file, validateContact);
    try {
      cards.push(await buildCard(site, template, shared, slug, contact));
    } catch (error) {
      throw new Error("contacts/" + file + ": " + error.message);
    }
  }
  await publish(cards);
  if (!cards.length) console.log("Üretilecek kartvizit yok.");
  for (const card of cards) console.log("dist" + card.route);
}

main().catch((error) => {
  console.error("Kartvizit üretilemedi. " + error.message);
  process.exitCode = 1;
});
