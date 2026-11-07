export function resolveAppUrl(path: string) {
  const relativePath = path.replace(/^\//, '')
  return new URL(relativePath, document.baseURI).toString()
}
