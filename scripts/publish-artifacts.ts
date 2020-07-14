import { VersioningType } from './affected'

import * as cp from 'child_process'

/**
 *
 * @param {string} name - name of the library to publish
 * @param {VersioningType} type - type of publish to be done: major | minor | patch
 */
export const deployArtifact = (name: string, type: VersioningType): string => {
  const currentVersion = require(`../packages/${name}/package.json`).version

  console.log(`Processing ${name}:${currentVersion}`)

  const newVersion = cp.execSync(`(cd packages/${name} && npm version ${type})`).toString().replace('v', '')

  console.log(`Updating ${name}: to version ${newVersion}`)

  console.log('Tarring and feathering...')
  const tarFileName = `${name}.tar.gz`
  cp.execSync(`(cd dist/packages/${name} && tar -cvzf ../../../${tarFileName} ./)`)

  console.log('Done...\n\n')

  console.log('Verifying....')
  const tb = cp.execSync(`tar -ztvf ${tarFileName}`).toString()
  console.log(`Verified ${tb}`)

  console.log(`Publishing ${name}:${newVersion}`)
  cp.execSync(`npm publish ${tarFileName} --access public`)
  console.log(`Publishing complete...`)

  return `${name}(${newVersion})`
}
