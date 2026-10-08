/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  SITE_PASSWORD?: string
  SITE_PASSWORD_CLAUDIO?: string
}
