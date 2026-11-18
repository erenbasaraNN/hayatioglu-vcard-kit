export const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function formatPhone(number) {
  return number.replace(/^(\+90)(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5");
}

function tile({ label, value, icon, href, className = "" }) {
  const classes = "tile" + (className ? " " + className : "");
  const arrow = icon === "phone" ? "" : '<svg class="icon" aria-hidden="true"><use href="#i-up-right"/></svg>';
  return [
    '        <a class="' + classes + '" href="' + escapeHTML(href) + '">',
    '          <span class="tile-icon"><svg class="icon" aria-hidden="true"><use href="#i-' + icon + '"/></svg></span>',
    '          <span><span class="tile-label">' + escapeHTML(label) + '</span><span class="tile-value">' + escapeHTML(value) + '</span></span>',
    arrow ? "          " + arrow : "",
    "        </a>"
  ].filter(Boolean).join("\n");
}

export function contactNav(contact, website) {
  const tiles = [];
  const { mobile, workPhone, whatsapp, email, address } = contact;
  if (mobile) {
    tiles.push({ label: "Ara", value: formatPhone(mobile), icon: "phone", href: "tel:" + mobile, className: "phone" });
  }
  if (whatsapp) {
    const number = whatsapp === true ? mobile : whatsapp;
    tiles.push({ label: "WhatsApp", value: "Mesaj gönder", icon: "whatsapp", href: "https://wa.me/" + number.slice(1) });
  }
  if (email) {
    tiles.push({ label: "E-posta", value: email, icon: "mail", href: "mailto:" + email, className: "email" });
  }
  if (address) {
    const { street, district, city, postalCode, country } = address;
    const query = [street, district, city, postalCode, country].filter(Boolean).join(", ");
    tiles.push({
      label: "Konum",
      value: [district, city].filter(Boolean).join(", "),
      icon: "pin",
      href: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query)
    });
  }
  if (workPhone) {
    tiles.push({ label: "Sabit Hat", value: formatPhone(workPhone), icon: "phone", href: "tel:" + workPhone, className: "phone" });
  }
  if (website) {
    tiles.push({ label: "Web Sitesi", value: website.hostname, icon: "globe", href: website.href });
  }
  if (!tiles.length) return "";
  const normalTiles = tiles.filter(({ className }) => className !== "email");
  if (normalTiles.length % 2) {
    const last = normalTiles.at(-1);
    last.className = [last.className, "wide"].filter(Boolean).join(" ");
  }
  return [
    '    <nav class="contact" aria-labelledby="contact-heading">',
    '      <h2 id="contact-heading">İletişim</h2>',
    '      <div class="contact-grid">',
    ...tiles.map(tile),
    "      </div>",
    "    </nav>"
  ].join("\n");
}
