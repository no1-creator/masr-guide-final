// HTTP plumbing helpers + typed error. Zero dependencies.

export class HttpError extends Error {
	constructor(status, message, details) {
		super(message)
		this.status = status
		this.details = details
	}
}

// Throw a clean HTTP error from anywhere in a handler.
export const err = (status, msg, details) => {
	throw new HttpError(status, msg, details)
}

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
}

export function sendJSON(res, status, obj) {
	const body = JSON.stringify(obj ?? null)
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		...CORS,
	})
	res.end(body)
}

export function preflight(res) {
	res.writeHead(204, { ...CORS, "Access-Control-Max-Age": "86400" })
	res.end()
}

export function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = ""
		req.on("data", (c) => {
			data += c
			if (data.length > 8e6) req.destroy()
		})
		req.on("end", () => {
			if (!data) return resolve({})
			try {
				resolve(JSON.parse(data))
			} catch {
				reject(new HttpError(400, "Invalid JSON body"))
			}
		})
		req.on("error", reject)
	})
}

export function parseQuery(url) {
	const q = {}
	const i = url.indexOf("?")
	if (i < 0) return q
	for (const [k, v] of new URLSearchParams(url.slice(i + 1))) q[k] = v
	return q
}

export const nowISO = () => new Date().toISOString()
export const round2 = (n) => Math.round(Number(n) * 100) / 100
