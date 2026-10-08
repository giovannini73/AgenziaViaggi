import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function nextVersion(current) {
  const parts = String(current || '0.0.0').split('.').map((n) => Number(n) || 0)
  while (parts.length < 3) parts.push(0)
  parts[2] += 1
  return parts.join('.')
}

function replaceVersions(text, from, to, limit) {
  const needle = `"version": "${from}"`
  const next = `"version": "${to}"`
  let seen = 0
  return text.replaceAll(needle, (match) => {
    seen += 1
    return seen <= limit ? next : match
  })
}

const pkgPath = join(root, 'package.json')
const pkgText = readFileSync(pkgPath, 'utf8')
const current = JSON.parse(pkgText).version
const version = nextVersion(current)
writeFileSync(pkgPath, replaceVersions(pkgText, current, version, 1))

const lockPath = join(root, 'package-lock.json')
try {
  writeFileSync(lockPath, replaceVersions(readFileSync(lockPath, 'utf8'), current, version, 2))
} catch {
  /* package-lock assente */
}

const readmePath = join(root, 'README.md')
try {
  const readme = readFileSync(readmePath, 'utf8')
  writeFileSync(readmePath, readme.replace(/(## Versione\r?\n\r?\n)[\d.]+/, `$1${version}`))
} catch {
  /* README assente */
}

console.log(`Versione ${version}`)
