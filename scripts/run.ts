import { getDeployable, publishType } from './getAffected'
import { deployArtifact } from './publish-artifacts'
import { commitUpdates } from './tag'

const type = publishType()

console.log(`Publishing new < ${type} > version`)

const deployableLibs = getDeployable()

if (deployableLibs.length) {
  console.log(`Publishing deployable libs: ${deployableLibs.join(' | ')}`)

  const message = deployableLibs
    .reduce((acc, lib) => {
      acc.push(deployArtifact(lib, type))
      return acc
    }, [])
    .join(',')

  console.log(`${type} publish finished`)

  commitUpdates(message)
} else {
  console.log('no deployable libs')
}
