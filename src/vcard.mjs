const escapeValue = (value = "") => value.replace(/[\\,;]/g, "\\$&").replace(/\r\n|\r|\n/g, "\\n");

function foldLine(line) {
  let width = 0;
  let folded = "";
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (width + bytes > 75) {
      folded += "\r\n ";
      width = 1;
    }
    folded += char;
    width += bytes;
  }
  return folded;
}

export function createVCard(contact, organization, website) {
  const fields = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:" + [contact.familyName, contact.givenName, "", "", ""].map(escapeValue).join(";"),
    "FN:" + escapeValue(contact.name),
    "ORG:" + escapeValue(organization)
  ];
  if (contact.title) fields.push("TITLE:" + escapeValue(contact.title));
  if (contact.mobile) fields.push("TEL;TYPE=CELL,WORK,VOICE,PREF:" + contact.mobile);
  if (contact.workPhone) fields.push("TEL;TYPE=WORK,VOICE:" + contact.workPhone);
  if (contact.email) fields.push("EMAIL;TYPE=INTERNET,WORK:" + escapeValue(contact.email));
  if (contact.address) {
    const { street, district, city, postalCode, country } = contact.address;
    const address = ["", "", street, district ? district + ", " + city : city, "", postalCode, country];
    fields.push("ADR;TYPE=WORK:" + address.map(escapeValue).join(";"));
  }
  if (website) fields.push("URL:" + escapeValue(website.href));
  fields.push("END:VCARD");
  return fields.map(foldLine).join("\r\n") + "\r\n";
}
