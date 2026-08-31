const http = require("http")
const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "public")
const port = Number(process.env.PORT || 4173)

const types = {
  ".html": "text/html; charset=utf8",
  ".css": "text/css; charset=utf8",
  ".js": "text/javascript; charset=utf8",
  ".svg": "image/svg+xml"
}

const server = http.createServer((request, response) => {
  const url = request.url === "/" ? "/index.html" : request.url.split("?")[0]
  const file = path.normalize(path.join(root, url))

  if (!file.startsWith(root)) {
    response.writeHead(403)
    response.end("Not allowed")
    return
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404)
      response.end("Not found")
      return
    }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "text/plain" })
    response.end(data)
  })
})

if (require.main === module) {
  server.listen(port, () => console.log(`Civra is ready at http://localhost:${port}`))
}

module.exports = server
