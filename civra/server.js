const http = require("http")
const fs = require("fs")
const path = require("path")
const { runPermitCheck } = require("./solari-service")

const root = path.resolve(__dirname, "public")
const defaultPort = Number(process.env.PORT || 4173)

// Every live check launches a paid Solari browser, so the endpoint is
// metered: one shared result is cached, concurrent requests join the same
// run, and failures pause new spending for a cooldown window.
const defaultCacheMs = 15 * 60 * 1000
const defaultCooldownMs = 60 * 1000

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
}

const safetyHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, { ...safetyHeaders, ...headers })
  response.end(body)
}

function sendJson(response, status, value, headers = {}) {
  send(response, status, JSON.stringify(value), {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  })
}

function createServer({ runCheck = runPermitCheck, cacheMs = defaultCacheMs, cooldownMs = defaultCooldownMs } = {}) {
  let cached = null
  let inFlight = null
  let cooldownUntil = 0

  async function handlePermitCheck(response) {
    if (!process.env.SOLARI_API_KEY) {
      sendJson(response, 503, {
        code: "SOLARI_KEY_MISSING",
        message: "Add SOLARI_API_KEY on the server to run the live permit check."
      })
      return
    }

    const now = Date.now()

    if (cached && now < cached.expiresAt) {
      sendJson(response, 200, { ...cached.value, fromCache: true })
      return
    }

    if (now < cooldownUntil) {
      const retryAfter = Math.ceil((cooldownUntil - now) / 1000)
      sendJson(response, 429, {
        code: "CHECK_COOLDOWN",
        message: `A recent check failed. Please try again in ${retryAfter} seconds.`
      }, { "Retry-After": String(retryAfter) })
      return
    }

    if (!inFlight) {
      inFlight = runCheck({ apiKey: process.env.SOLARI_API_KEY }).finally(() => {
        inFlight = null
      })
    }

    try {
      const result = await inFlight
      cached = { value: result, expiresAt: Date.now() + cacheMs }
      sendJson(response, 200, { ...result, fromCache: false })
    } catch (error) {
      cooldownUntil = Date.now() + cooldownMs
      console.error("Permit check failed", error instanceof Error ? error.message : error)
      sendJson(response, 502, {
        code: "PERMIT_CHECK_FAILED",
        message: "The permit page could not be checked. Please try again."
      })
    }
  }

  async function handleApi(request, response, pathname) {
    if (pathname === "/api/health" && request.method === "GET") {
      sendJson(response, 200, { name: "civra", status: "ready" })
      return true
    }

    if (pathname === "/api/permit-check" && request.method === "POST") {
      await handlePermitCheck(response)
      return true
    }

    if (pathname.startsWith("/api/")) {
      sendJson(response, 404, { code: "NOT_FOUND", message: "API route not found." })
      return true
    }

    return false
  }

  return http.createServer(async (request, response) => {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
    } catch {
      send(response, 400, "Bad request")
      return
    }

    if (await handleApi(request, response, pathname)) return

    if (request.method !== "GET" && request.method !== "HEAD") {
      send(response, 405, "Method not allowed", { Allow: "GET, HEAD" })
      return
    }

    const route = pathname === "/" ? "/index.html" : pathname
    const file = path.resolve(root, `.${route}`)

    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      send(response, 403, "Not allowed")
      return
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        send(response, 404, "Not found")
        return
      }

      const extension = path.extname(file)
      response.writeHead(200, {
        ...safetyHeaders,
        "Cache-Control": "no-store",
        "Content-Type": types[extension] || "application/octet-stream"
      })
      response.end(request.method === "HEAD" ? undefined : data)
    })
  })
}

if (require.main === module) {
  createServer().listen(defaultPort, () => {
    console.log(`Civra is ready at http://localhost:${defaultPort}`)
  })
}

module.exports = { createServer, safetyHeaders }
