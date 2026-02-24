import fs from 'fs'

export const getPackageVersion = (packagePath: string): string => {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  if (!packageJson.version) {
    throw new Error(`No version field found in ${packagePath}`)
  }
  return packageJson.version
}
