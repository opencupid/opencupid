import fs from 'fs'

export const getPackageVersion = (packagePath: string) => {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    return packageJson.version || 'unknown'
  } catch {
    return 'unknown'
  }
}
