import { VersioningType } from './getAffected'

import * as cp from 'child_process'
import { BUILD_DIR, PACKAGES, PACKAGE_JSON } from './constants'

/**
 *
 * @param {string} name - name of the library to publish
 * @param {VersioningType} type - type of publish to be done: major | minor | patch
 */
export const deployArtifact = (name: string, type: VersioningType): string => {
  const currentVersion = require(`../${PACKAGES}/${name}/${PACKAGE_JSON}`).version

  console.log(`Processing ${name}:${currentVersion}`)

  const newVersion = cp.execSync(`(cd ${PACKAGES}/${name} && npm version ${type})`).toString().replace('v', '')

  console.log(`Updating ${name}: to version ${newVersion}`)

  console.log('Tarring and feathering...')
  const tarFileName = `${name}.tar.gz`
  cp.execSync(`(cd ${BUILD_DIR}/${name} && tar -cvzf ../../../${tarFileName} ./)`)

  console.log('Done...\n\n')

  console.log('Verifying....')
  const tb = cp.execSync(`tar -ztvf ${tarFileName}`).toString()
  console.log(`Verified ${tb}`)

  console.log(`Publishing ${name}:${newVersion}`)
  cp.execSync(`npm publish ${tarFileName} --access public`)
  console.log(`Publishing complete...`)

  return `${name}(${newVersion})`
}
