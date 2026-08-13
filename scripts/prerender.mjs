// Runs after the client build (vite build) and the SSR build
// (vite build --ssr src/entry-server.jsx --outDir dist-ssr). Renders the
// Landing page to an HTML string, injects it into dist/index.html's
// <div id="root">, and adds the SEO head tags (description, canonical,
// Open Graph, JSON-LD) that only make sense for the real "/" page.
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { COMPANY, CONTENT_LAST_REVIEWED } from '../src/lib/company.js'

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const distIndex = path.join(rootDir, 'dist', 'index.html')
const ssrEntry = path.join(rootDir, 'dist-ssr', 'entry-server.js')

const { render, getFaqs } = await import(pathToFileURL(ssrEntry).href)

const appHtml = render('/')
const faqs = getFaqs()

const description =
  "Provaserve turns every cleaning job into evidence: timestamped photos, completion status, and a report your client can trust."
const pageUrl = COMPANY.siteUrl + '/'

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: COMPANY.product,
  url: COMPANY.siteUrl,
  legalName: COMPANY.legalName,
  email: COMPANY.contactEmail,
}

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': pageUrl,
  url: pageUrl,
  name: `${COMPANY.product} — Proof-of-service for commercial cleaning`,
  description,
  dateModified: CONTENT_LAST_REVIEWED,
  mainEntity: {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
}

const headExtras = `
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${COMPANY.product} — Proof-of-service for commercial cleaning" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${pageUrl}" />
    <script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>
    <script type="application/ld+json">${JSON.stringify(webPageSchema)}</script>
  </head>`

let html = readFileSync(distIndex, 'utf-8')
html = html.replace('</head>', headExtras)
html = html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

writeFileSync(distIndex, html)

rmSync(path.join(rootDir, 'dist-ssr'), { recursive: true, force: true })

console.log('Prerendered / into dist/index.html')
