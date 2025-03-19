import core from '@actions/core'
import github from '@actions/github'
import getStoryId from './getStoryId.js'
import shortcutMoveStoryState, {
  shortcutStoryStateIsDone
} from './moveState.js'
import determineTargetState from './determineTargetState.js'

async function run() {
  const context = github.context
  if ((!context && !context.payload) || !context.payload.pull_request) {
    core.setFailed('Context or pull request not found.')
  }

  const storyId = getStoryId(context.payload.pull_request)

  if (!storyId || storyId === null) {
    core.info('No story ID found.')
    return
  }

  const shortcutToken = process.env.SHORTCUT_TOKEN
  if (!shortcutToken || shortcutToken.length <= 0) {
    core.setFailed('Missing Shortcut API Token.')
    return
  }
  const shortcutStoryPrefix = core.getInput('shortcut_story_prefix')
  const shortcutTargetReviewStateId = core.getInput('shortcut_review_state_id')
  const shortcutTargetReadyStateId = core.getInput('shortcut_ready_state_id')
  const shortcutDoneStateId = core.getInput('shortcut_done_state_id')

  const githubGatekeeper = core.getInput('github_gatekeeper')

  const gh = {
    gatekeeper: githubGatekeeper,
    context: context,
    payload: context.payload
  }

  const sc = {
    storyId: parseInt(storyId),
    token: shortcutToken,
    prefix: shortcutStoryPrefix,
    reviewStateId: parseInt(shortcutTargetReviewStateId),
    readyStateId: parseInt(shortcutTargetReadyStateId)
  }

  const targetState = determineTargetState(gh, sc)
  if (!targetState || targetState === null) {
    return
  }

  // check the target state is not final state

  if (await shortcutStoryStateIsDone(storyId, parseInt(shortcutDoneStateId))) {
    return
  }

  const res = await shortcutMoveStoryState(storyId, targetState)
  if (!res || res.statusCode !== 200) {
    core.setFailed(res)
  }
}

run()
