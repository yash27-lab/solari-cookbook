const PERMIT_URL = "https://nyc-business.nyc.gov/nycbusiness/description/food-service-establishment-permit"

const checks = [
  { key: "salesTax", phrase: "Certificate of Authority to Collect Sales Tax" },
  { key: "foodProtection", phrase: "Food Protection Certificate" },
  { key: "insurance", phrase: "workers' compensation and disability insurance" },
  { key: "email", phrase: "valid email address" }
]

function extractChecks(text) {
  const body = text.toLowerCase()
  return Object.fromEntries(
    checks.map(({ key, phrase }) => [key, body.includes(phrase.toLowerCase())])
  )
}

async function runPermitCheck({ apiKey }) {
  if (!apiKey) throw new Error("A Solari API key is required")

  const { Solari } = await import("@solarisdk/browser")
  const solari = new Solari({ apiKey })
  let browser

  try {
    browser = await solari.launch({ recording: true })
    const page = await browser.newPage()
    await page.goto(PERMIT_URL, { waitUntil: "domcontentloaded", timeout: 30000 })
    const title = await page.title()
    const body = await page.locator("body").innerText()

    return {
      checkedAt: new Date().toISOString(),
      checks: extractChecks(body),
      source: PERMIT_URL,
      title
    }
  } finally {
    if (browser) await browser.close()
    await solari.close().catch(() => undefined)
  }
}

module.exports = { PERMIT_URL, extractChecks, runPermitCheck }
