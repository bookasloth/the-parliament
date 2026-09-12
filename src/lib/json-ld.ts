// Serialize an object for injection into a <script type="application/ld+json">
// tag via dangerouslySetInnerHTML. Plain JSON.stringify is unsafe here: a
// user-controlled string containing "</script>" (or the JSON-valid but
// HTML/JS-hostile chars < > & and the U+2028/U+2029 line separators) can break
// out of the script element -> stored XSS. We emit them as \uXXXX escapes,
// which are valid JSON and render identically, but can never terminate the tag
// or a JS string literal.
const LS = " "
const PS = " "

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LS]: "\\u2028",
  [PS]: "\\u2029",
}

const UNSAFE = new RegExp(`[<>&${LS}${PS}]`, "g")

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(UNSAFE, (c) => ESCAPES[c])
}
