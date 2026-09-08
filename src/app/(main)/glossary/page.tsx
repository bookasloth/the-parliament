import { GLOSSARY } from "@/config/glossary"
import GlossaryClient from "./glossary-client"

export const metadata = { title: "Glossary · The Parliament" }

// Static reference page — the term list is built from the real config
// (houses/membership/karma) at import time, so it never drifts from the app.
export default function GlossaryPage() {
  return <GlossaryClient sections={GLOSSARY} />
}
