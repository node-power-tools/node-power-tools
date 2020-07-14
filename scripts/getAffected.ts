import { readdirSync } from 'fs'

import { execSync } from 'child_process'

const UNKNOWN = 'unknown'
const commitTypes = ['feat', 'fix', 'docs', 'perf'] as const
const versioningTypes = ['major', 'minor', 'patch'] as const

export type CommitType = typeof commitTypes[number]
export type VersioningType = typeof versioningTypes[number]

/**
 * @returns {Array<string>} Affected libraries
 */
const affectedLibs = (): string[] => {
  const result = execSync(`yarn affected:libs -- --base=remotes/origin/master~1`).toString()
  const data = result.match(/- (.+)/gm)
  return data
    ? data.map((lib) => {
        return lib.replace('- ', '')
      })
    : []
}

const commitType = (): CommitType | typeof UNKNOWN => {
  const result = execSync('git log -1 --pretty=%B').toString()
  const match = result.match(/(.+)\(.+:/gm)
  const res = match ? match[0] : undefined
  if (isCommitType(res)) {
    return res
  }

  return UNKNOWN
}

const isCommitType = (commitType: string | undefined | null): commitType is CommitType => {
  if (!commitType) {
    return false
  }
  return (commitTypes as ReadonlyArray<string>).includes(commitType)
}

/**
 * @return {Array<string>} Deployable libraries
 */
export const getDeployable = (): string[] => {
  const libs = affectedLibs()
  return libs.filter((lib) => {
    const files = readdirSync(`./packages/${lib}`)
    return files.indexOf(`package.json`) > -1
  })
}

/**
 * @returns {VersioningType} Type of versioning change
 */
export const publishType = (): VersioningType => {
  const type = commitType()
  switch (type) {
    case 'feat':
      return 'major'
    case 'fix':
    case 'docs':
      return 'patch'
    case 'perf':
    case 'unknown':
      return 'minor'
  }
}
