from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

OUTPUT_PATH = "output/pdf/app-summary.pdf"

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN_X = 44
MARGIN_TOP = 42
MARGIN_BOTTOM = 42

TITLE_FONT = "Helvetica-Bold"
TITLE_SIZE = 16
HEADING_FONT = "Helvetica-Bold"
HEADING_SIZE = 11
BODY_FONT = "Helvetica"
BODY_SIZE = 9.4
LINE_HEIGHT = 11.2
SECTION_GAP = 8


def wrap_text(text: str, max_width: float, font_name: str, font_size: float):
    words = text.split()
    if not words:
        return [""]

    lines = []
    current = words[0]

    for word in words[1:]:
        candidate = f"{current} {word}"
        if stringWidth(candidate, font_name, font_size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def draw_heading(c: canvas.Canvas, y: float, text: str):
    c.setFont(HEADING_FONT, HEADING_SIZE)
    c.drawString(MARGIN_X, y, text)
    return y - LINE_HEIGHT


def draw_paragraph(c: canvas.Canvas, y: float, text: str):
    max_width = PAGE_WIDTH - (MARGIN_X * 2)
    lines = wrap_text(text, max_width, BODY_FONT, BODY_SIZE)
    c.setFont(BODY_FONT, BODY_SIZE)
    for line in lines:
        c.drawString(MARGIN_X, y, line)
        y -= LINE_HEIGHT
    return y


def draw_bullets(c: canvas.Canvas, y: float, bullets):
    max_width = PAGE_WIDTH - (MARGIN_X * 2) - 14
    c.setFont(BODY_FONT, BODY_SIZE)

    for bullet in bullets:
        wrapped = wrap_text(bullet, max_width, BODY_FONT, BODY_SIZE)
        c.drawString(MARGIN_X, y, "-")
        c.drawString(MARGIN_X + 10, y, wrapped[0])
        y -= LINE_HEIGHT
        for line in wrapped[1:]:
            c.drawString(MARGIN_X + 10, y, line)
            y -= LINE_HEIGHT
    return y


c = canvas.Canvas(OUTPUT_PATH, pagesize=letter)
y = PAGE_HEIGHT - MARGIN_TOP

c.setFont(TITLE_FONT, TITLE_SIZE)
c.drawString(MARGIN_X, y, "AI-visability App Summary (Repo-Based)")
y -= (LINE_HEIGHT + 6)

c.setFont(BODY_FONT, 8.8)
c.drawString(MARGIN_X, y, "Source basis: README, src/app routes, src/app/api routes, src/lib workflow/crawler/scorer/generator/services.")
y -= (LINE_HEIGHT + 3)

y = draw_heading(c, y, "What it is")
y = draw_paragraph(
    c,
    y,
    "AISO (AI Search Optimization) is a Next.js app that audits how visible a website is to AI-discovery signals. "
    "It crawls a submitted URL, computes a 0-100 AI visibility score across six dimensions, and returns prioritized fixes."
)
y -= SECTION_GAP

y = draw_heading(c, y, "Who it is for")
y = draw_paragraph(
    c,
    y,
    "Primary persona: business site owners, marketers, and operators who want their site discoverable in AI search workflows "
    "(homepage copy asks, 'Is your business visible to AI search?')."
)
y -= SECTION_GAP

y = draw_heading(c, y, "What it does")
y = draw_bullets(
    c,
    y,
    [
        "Accepts a URL and starts an async scan via POST /api/scan.",
        "Crawls robots.txt, sitemap.xml, and llms.txt, then inspects up to 10 pages with a headless browser plus HTTP fallback.",
        "Scores results in six dimensions: File Presence, Structured Data, Content Signals, Topical Authority, Entity Clarity, and AI Registration.",
        "Streams scan progress (step checklist + ETA) while the client polls /api/scan/[id].",
        "Provides report views with score bands, per-check verdicts, and a prioritized repair queue.",
        "After checkout verification, generates downloadable fix files (llms.txt, robots.txt, organization-schema.json, sitemap.xml) and ZIP archive.",
    ],
)
y -= SECTION_GAP

y = draw_heading(c, y, "How it works (architecture)")
y = draw_bullets(
    c,
    y,
    [
        "UI layer: Next.js App Router pages in src/app (/, /scan/[id], /score/[id], /dashboard/[id], /checkout/[id]).",
        "API layer: route handlers in src/app/api manage scan lifecycle, report gating, payment verification, and file delivery.",
        "Core workflow: scan-workflow.ts orchestrates crawlSite(...) -> scoreCrawlData(...) -> persisted scan state.",
        "Crawler subsystem: robots/sitemap/llms parsers + Puppeteer page extractor + classifier/platform detection.",
        "Output subsystem: generator/* builds fix files; files-archive.ts packages ZIP downloads.",
        "Service registry binds mock implementations by default: mockDb (in-memory Map), mockPayment (simulated payment), mockAi (llms text generation).",
        "Data flow: Browser URL submit -> /api/scan -> runScan -> crawler + scorer -> store result -> /api/scan/[id] polling -> report/checkout/files.",
        "Not found in repo: concrete production database provider and real payment provider (left as 'Future' in registry.ts).",
    ],
)
y -= SECTION_GAP

y = draw_heading(c, y, "How to run (minimal)")
y = draw_bullets(
    c,
    y,
    [
        "From repo root: npm install",
        "Start app: npm run dev",
        "Open: http://localhost:3000",
        "Optional quick check: npm test",
        "Not found in repo: required Node.js version pin (no .nvmrc/engines field in package.json).",
    ],
)

if y < MARGIN_BOTTOM:
    raise RuntimeError(f"Layout overflowed single page by {MARGIN_BOTTOM - y:.1f} points")

c.showPage()
c.save()

print(OUTPUT_PATH)
print(f"remaining_bottom_space={y - MARGIN_BOTTOM:.1f}pt")
