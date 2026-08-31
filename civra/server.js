const http = require("http")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { runPermitCheck } = require("./solari-service")

const root = path.resolve(__dirname, "public")
const defaultPort = Number(process.env.PORT || 4173)

// Every live check launches a paid Solari browser, so the endpoint is
// metered: one shared result is cached, concurrent requests join the same
// run, and failures pause new spending for a cooldown window.
const defaultCacheMs = 15 * 60 * 1000
const defaultCooldownMs = 60 * 1000
const defaultSessionMs = 60 * 60 * 1000
const loginWindowMs = 5 * 60 * 1000
const maxLoginFailures = 5

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

function readJson(request, maxBytes = 2048) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []

    request.on("data", chunk => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error("REQUEST_TOO_LARGE"))
        return
      }
      chunks.push(chunk)
    })
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"))
      } catch {
        reject(new Error("BAD_JSON"))
      }
    })
    request.on("error", reject)
  })
}

function sameSecret(value, expected) {
  const left = Buffer.from(String(value || ""))
  const right = Buffer.from(String(expected || ""))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function readCookie(request, name) {
  const cookies = String(request.headers.cookie || "").split(";")
  for (const item of cookies) {
    const [key, ...value] = item.trim().split("=")
    if (key === name) return value.join("=")
  }
  return null
}

function createServer({
  runCheck = runPermitCheck,
  cacheMs = defaultCacheMs,
  cooldownMs = defaultCooldownMs,
  accessCode = process.env.CIVRA_ACCESS_CODE,
  sessionMs = defaultSessionMs
} = {}) {
  let cached = null
  let inFlight = null
  let cooldownUntil = 0
  const sessions = new Map()
  const loginFailures = new Map()

  function getSession(request) {
    const token = readCookie(request, "civra_session")
    if (!token) return null
    const expiresAt = sessions.get(token)
    if (!expiresAt || Date.now() >= expiresAt) {
      sessions.delete(token)
      return null
    }
    return token
  }

  function sessionCookie(token, maxAge) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
    return `civra_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`
  }

  async function openSession(request, response) {
    if (!accessCode) {
      sendJson(response, 503, {
        code: "ACCESS_CODE_MISSING",
        message: "Add CIVRA_ACCESS_CODE on the server before using the paid check."
      })
      return
    }

    const client = request.socket.remoteAddress || "unknown"
    const failure = loginFailures.get(client)
    if (failure && failure.count >= maxLoginFailures && Date.now() < failure.resetAt) {
      const retryAfter = Math.ceil((failure.resetAt - Date.now()) / 1000)
      sendJson(response, 429, {
        code: "LOGIN_COOLDOWN",
        message: `Too many access attempts. Please try again in ${retryAfter} seconds.`
      }, { "Retry-After": String(retryAfter) })
      return
    }

    let body
    try {
      body = await readJson(request)
    } catch (error) {
      const tooLarge = error.message === "REQUEST_TOO_LARGE"
      sendJson(response, tooLarge ? 413 : 400, {
        code: tooLarge ? "REQUEST_TOO_LARGE" : "BAD_JSON",
        message: tooLarge ? "The request is too large." : "Send a valid JSON request."
      })
      return
    }

    if (!sameSecret(body.accessCode, accessCode)) {
      const current = failure && Date.now() < failure.resetAt ? failure.count : 0
      loginFailures.set(client, { count: current + 1, resetAt: Date.now() + loginWindowMs })
      sendJson(response, 401, {
        code: "ACCESS_DENIED",
        message: "The Civra access code was not accepted."
      })
      return
    }

    loginFailures.delete(client)
    const token = crypto.randomBytes(32).toString("base64url")
    sessions.set(token, Date.now() + sessionMs)
    sendJson(response, 200, { authenticated: true }, {
      "Set-Cookie": sessionCookie(token, Math.floor(sessionMs / 1000))
    })
  }

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

    if (pathname === "/api/session" && request.method === "GET") {
      sendJson(response, 200, { authenticated: Boolean(getSession(request)) })
      return true
    }

    if (pathname === "/api/session" && request.method === "POST") {
      await openSession(request, response)
      return true
    }

    if (pathname === "/api/session" && request.method === "DELETE") {
      const token = getSession(request)
      if (token) sessions.delete(token)
      sendJson(response, 200, { authenticated: false }, {
        "Set-Cookie": sessionCookie("", 0)
      })
      return true
    }

    if (pathname === "/api/permit-check" && request.method === "POST") {
      if (!getSession(request)) {
        sendJson(response, 401, {
          code: "AUTH_REQUIRED",
          message: "Unlock the live check with the Civra access code."
        })
        return true
      }
      if (request.headers["x-civra-action"] !== "permit-check") {
        sendJson(response, 403, {
          code: "ACTION_HEADER_REQUIRED",
          message: "The paid check needs a trusted Civra request."
        })
        return true
      }
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
