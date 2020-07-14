import * as childProcess from 'child_process'

/**
 * @returns {string} New tag for release
 */
const createReleaseVersion = () => {
  const lastTag = childProcess.execSync('git tag | sort -V | tail -1').toString()
  if (lastTag) {
    return tag(lastTag)
  }
  return initialTag()
}

/**
 * @param {string} lastTag
 * @returns {string} New tag for release
 */
const tag = (lastTag) => {
  const splitted = lastTag.replace(/\D/g, '').split('')
  const major = Number(splitted[0]),
    minor = Number(splitted[1]),
    patch = Number(splitted[2])

  let newVersion

  if (patch > 8) {
    if (minor > 8) {
      newVersion = `${major + 1}.${0}.${0}`
    } else {
      newVersion = `${major}.${minor + 1}.${0}`
    }
  } else {
    newVersion = `${major}.${minor}.${patch + 1}`
  }

  return newVersion
}

/**
 * Starting at 0.0.2 because 0.0.1+ is old news.
 *
 * @returns {string} First tag
 */
const initialTag = () => '0.0.2'

/**
 * @description saves version and changes and saves it to the repo
 */
export const commitUpdates = (message) => {
  const releaseVersion = createReleaseVersion()

  childProcess.execSync(`git tag -a v${releaseVersion}-release -m "Release ${releaseVersion}"`)
  console.log('status:')
  childProcess.execSync('git status')
  childProcess.execSync('git add .')
  childProcess.execSync(`git commit -m "chore(release):${releaseVersion}, libs versions: ${message}"`)
  childProcess.execSync('git push --follow-tags')
  console.log('tags pushed to repo')
}
