# Birdsong

An agentic development environment that sparks joy in my everyday coding:
- The user message & final assistant message are the only messages shown in the main content area.  Most of the time, seeing the tool calls & other events are unnecessary.  You can always open them by right clicking on the message and selecting turn details.
- Each session on the left sidebar shows the title, nothing else.  Details such as coding agent, directory you're in, date/time, etc. add clutter and are not useful most of the time.  Renaming the title is very easy to do and it can be multiline as well.  If you supply URLs, they will be linked as well so you can stuff things into it like issue/PR URLs, etc.
- Pinning sessions will put them at the top of the list, and once you're done, unpin and they will eventually float down.  You can find them later on through find in history.
- [Home](#home) is one session that stays above the pinned ones, pointed at a folder you choose in Settings. I use it for a personal repo: todos, notes, and the rest of life that isn't a coding project. Command/Control + 1 switches between Home and the session you were on, and stays in Sessions, Files, or Diff. Command/Control + 2 switches between Home's file explorer and that session's files.
- Sending new messages while the agent is already in progress should always steer where available, otherwise queue.  Claude Code & Codex steer.  Antigravity, Cursor & Pi queue (due to lack of support for steering in their ACP implementation).  But in general, I think the concept of queueing should just go away and every coding agent should always steer.
- All agents are started in bypass permissions/YOLO mode.
- You can go back and forward through the sessions you selected.  As an example of how I use this, I do something similar to `/btw` by forking a session, sending a prompt and then going back to the original session to keep on working.
- Zen mode hides the message type & timestamps.  It's on by default.  You can always turn it off to see those details as needed with Command/Control + /.
- You can control your sessions through an iOS app.
- Best paired with [beaver](https://github.com/khooeee/beaver/)

There are also orchestration features:
- Sessions can drive each other: create other sessions, rename them, send prompts to them, wait for & read their replies, and close them.  In other words, pretty much everything session-specific aside from forking.  This can lead to very useful parallelization strategies (e.g. reading GitHub issues & implementing them in parallel).  Every session gets these as tools from Birdsong's own MCP server, so it works the same for Claude Code, Codex, Cursor, Pi & Antigravity.
- A hands-free voice agent ([Inworld Realtime](https://docs.inworld.ai/realtime/overview)) controls every session: ask what's running, send or steer prompts, start new sessions, and hear finished turns announced.  It also answers general questions and searches the web.  Click the mic in the bottom left to start it; add your Inworld API key under **Voice** → **Open Settings**. Pick the agent's voice in **Settings** → **Voice** from your Inworld workspace's voices (Inworld's own plus any you cloned or designed), and click **Play Sample** to hear one first. Saving a new voice switches it at once, even mid-call.

## Install (macOS)

Download `Birdsong-*-arm64.dmg` from the latest [GitHub Release](../../releases). Apple Silicon (M1 onwards) only.

Open the `.dmg`, drag **Birdsong** into Applications, then launch it.

Builds are not notarized. On first open, macOS says it can't verify the app. Go to **System Settings** → **Privacy & Security** and click **Open Anyway**, or clear quarantine:

```bash
xattr -cr /Applications/Birdsong.app
```

## Install (Ubuntu)

Download `birdsong_*_amd64.deb` from the latest [GitHub Release](../../releases), then install it:

```bash
sudo apt install ./birdsong_*_amd64.deb
```

## Prerequisites

At least one agent CLI installed and authenticated. The Claude Code, Codex, and Pi ACP adapters ship with the app, but every agent runs on your own installed CLI:

- **Claude Code**: `claude` on `PATH` (e.g. `brew install --cask claude-code`) and Claude login or `ANTHROPIC_API_KEY`
- **Codex**: `codex` on `PATH` (e.g. `brew install --cask codex`) and Codex/ChatGPT login or `OPENAI_API_KEY` / `CODEX_API_KEY`
- **Cursor**: Cursor CLI `agent` on `PATH` (typically `~/.local/bin/agent`) and `agent login`
- **Pi**: `pi` on `PATH` via `npm install -g @earendil-works/pi-coding-agent`
- **Antigravity**: Antigravity CLI `agy` on `PATH` and a Google sign-in, from running `agy` once or `agy acp --login`

`PATH` here means your terminal's `PATH`. On startup Birdsong runs your login shell once (`$SHELL -i -l`), so agents get the same environment as a new terminal window, even when you open the app from the Dock. While it runs, `BIRDSONG_RESOLVING_SHELL_ENV=1` is set, so your rc files can skip slow steps. If the shell fails or takes more than 10 seconds, agents use Birdsong's own environment plus common bin dirs. After editing rc files, restart Birdsong.

## Develop

```bash
npm install
npm start
```

On macOS, settings and session data live in `~/Library/Application Support/Birdsong/`; app settings are saved in `birdsong.json`. The local control endpoint is published in `~/.birdsong/control.json`.

## Home

Set the folder and agent in **Settings**. A blank folder turns Home off. Birdsong never creates the folder or writes into it, so whatever you keep there (a git repo or not) is yours to edit.

The row has a house icon and stays at the top while you scroll or filter. On iOS it is the top row, and swipe does not offer Unpin.

- **Cmd/Ctrl+1** switches between Home and the session you were on. It does not change Sessions, Files, or Diff.
- **Cmd/Ctrl+2** switches between Home's file explorer and that session's files.
- Both are in the Session menu and the command palette.
- Home can't be closed or unpinned. Right-click it and choose **Start Fresh** to open a new chat; Find in History still has the old one.
- Saving a new folder or agent starts a new Home chat right away. If a turn is running, Birdsong asks before it stops the turn.
- If the folder goes missing, the row stays and shows the error.
- Voice and other sessions can see which session is Home, so "add milk to my todo" can be sent there. Forks of Home are ordinary sessions.

## Crons

Click the Settings button on the bottom and select **Open Crons** to add, edit, enable, disable, or delete crons in the app. Each enabled cron starts a new unpinned session in the background and sends its prompt. Changes apply when saved. You can also edit `crons.json` directly:

```json
{
  "crons": [
    {
      "title": "Standup YYYY-MM-DD",
      "agent": "claude",
      "cron": "0 9 * * 1-5",
      "cwd": "~/code/my-project",
      "prompt": "Summarize yesterday's commits.",
      "enabled": true
    }
  ]
}
```

- `cron` is a standard 5-field expression in local time: `minute hour day-of-month month day-of-week` (e.g. `*/15 * * * *` is every 15 minutes, `0 9 * * 1-5` is 9:00 on weekdays). Numbers, `*`, ranges, steps and lists are supported; names like `MON` are not.
- `agent` is one of `claude`, `codex`, `cursor`, `pi` or `antigravity`.
- `enabled` must be `true` to run; a missing `enabled` is off.
- `title` is optional; `YYYY-MM-DD`, `HH:MM` and `H:MM` in it become the run's local date and 24-hour time.
- Crons only run while Birdsong is open. Runs missed while the app was closed or the computer was asleep are skipped.

## MCP servers

Every session gets the MCP servers you list in **Settings** → **MCP**, whichever agent it runs:

```json
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp"] },
    "tracker": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${TRACKER_TOKEN}" },
      "enabled": true
    }
  }
}
```

- A server has either `command` (with optional `args` and `env`) or `url` (streamable HTTP, with optional `headers`). SSE is not supported.
- Names use letters, digits, `_` and `-`. `birdsong` is taken by Birdsong's own server.
- `enabled: false` keeps an entry without connecting it.
- `${VAR}` and `${VAR:-default}` read your terminal's environment. Use them for secrets: Claude Code's servers go on its command line, where other users of the computer could read a plain value. A server whose variable is not set is skipped; Settings says which.
- Saving applies to new sessions. Open sessions get the change when they reconnect, e.g. after restarting Birdsong.
- If Codex or Pi has a server with the same name in its own config, that one is used.
- Servers that need OAuth don't work in every agent. Use a token header, or a stdio bridge such as `npx -y mcp-remote <url>`.
- A server that hangs while starting delays new Cursor sessions by up to a minute.

The list is saved in `mcp.json`, readable only by you. You can also edit the file directly; restart Birdsong to apply it.

## Reminders

Ask any session to remind you of something ("remind me to check the deploy in 20 minutes"). Agents set reminders with the `set_reminder` tool from Birdsong's MCP server, and can list and cancel them too. The voice agent can as well; its reminders link to the session you name, else the one you're talking about or the one on screen. With no session open, it starts one and has it set the reminder. When one is due, Birdsong shows a desktop notification and plays a short chime (unless sounds are off in settings); clicking it opens the session that set it. If voice is on, it reads the reminder out instead of chiming. The reminder also appears in that session's transcript as a "Reminder" row, so you can see it when you return to the session. Reminders are for you: they never send a prompt to a session, and the agent never sees the row.

Pending reminders live in `reminders.json`. Click the Settings button on the bottom and select **Open Reminders** to view, add, edit, or cancel reminders in the app. You can also edit the file directly; changes apply as soon as you save.

```json
{
  "reminders": [
    {
      "id": "a1b2c3d4",
      "dueAt": "2026-11-13T15:00:00-08:00",
      "message": "Check the deploy",
      "sessionId": "2026-11-13-..."
    }
  ]
}
```

- `dueAt` is ISO 8601; without an offset it is local time.
- `sessionId` is optional; without it, the notification just brings Birdsong to the front.
- Each reminder fires once and is then removed. One that came due while Birdsong was closed or the computer was asleep fires late, as soon as Birdsong is running again.
- macOS only shows notifications for properly code-signed apps, so Birdsong builds show a small Birdsong popup in the top-right corner instead. It stays until you click it (opens the session) or dismiss it, and never takes focus.

## iOS app

`ios/` is an iOS client that lets you interact with your sessions over [Tailscale](https://tailscale.com). Birdsong only listens on localhost; `tailscale serve` publishes it to your tailnet over HTTPS.

Initial setup
1. In the [Tailscale admin console](https://login.tailscale.com/admin/dns), turn on MagicDNS and HTTPS certificates.
2. Build the app on iOS: `brew install xcodegen`, then `npm run ios` and open `ios/Birdsong.xcodeproj`. To run on a device, put `DEVELOPMENT_TEAM = <your team id>` in `ios/Config/Local.xcconfig`. The default bundle id is `com.khooeee.birdsong`, which only that Apple team can sign. To use your own team, also set `PRODUCT_BUNDLE_IDENTIFIER = <your bundle id>` in that file.

Birdsong desktop app
3. If using a MacBook, plug it in.
4. Keep lid open (unless an external display is connected).
5. In Birdsong desktop app, open **Settings** and tick **Allow the iOS app over Tailscale**. While it is ticked, Birdsong is listening on the Control API port, and the computer is plugged in, Birdsong stops the computer from sleeping when idle; the display still sleeps.
6. Run the provided command which should look similar to `tailscale serve --bg <port>`.
7. Click **Copy iOS Link** & paste the link into the iOS app.

### Turn details

Tap the chevron at the bottom right of a prompt or a reply, to see that turn's thoughts, tool calls, steers and subagents, live while it runs. File diffs, images and subagent transcripts are on the Mac only.

### Alerts when a turn finishes

A finished turn alerts the phone when the app is in the background or the screen is locked. With the app open, the session list updates and there is no banner. The green unread dot is the desktop's: reading a session on either one clears it on both. Tapping the banner opens that session. The simulator cannot receive these.

The home screen icon's badge counts the unread sessions. It uses the same APNs key to stay current while the app is closed, including when you read a session on the Mac. To hide it, turn off **Badges** for Birdsong in the iPhone's notification settings.

1. In the [Apple developer portal](https://developer.apple.com/account/resources/identifiers/list), register the bundle id you sign (the default, or the one in `Local.xcconfig`) and enable **Push Notifications**. The key below has to belong to that same Apple team.
2. Under [Keys](https://developer.apple.com/account/resources/authkeys/list), create a key with **Apple Push Notifications service (APNs)**. Download the `.p8` (Apple allows this once) and note the **Key ID**. The **Team ID** is the same value as `DEVELOPMENT_TEAM`.
3. In Birdsong, open **Settings**, fill in **APNs key ID** and **APNs team ID**, click **Choose APNs Key** to import the `.p8` (stored encrypted in app data; the original can be deleted), and click **Save**.
4. Run the app on a device from Xcode and allow notifications. The phone tells the Mac its bundle id, so the alert is sent to that app.

Xcode installs use Apple's sandbox gateway, and this key works for that.

### Voice on the iPhone

Tap the mic at the top of the iOS app to talk to the same voice agent, with the Inworld key and voice settings from the desktop app. Changing the voice in the desktop Settings also switches it on a call the phone is on. Whoever starts voice holds the mic: starting on the phone takes over from the Mac (and keeps the conversation), and the desktop mic button stops it wherever it is. The phone's audio goes straight to Inworld; the Mac attaches to the same call over Inworld's sideband (beta) to configure it, run tools and speak notices, so the phone only talks to the Mac to start, resume and stop. When the call drops (Wi-Fi to 5G, a dead spot) the phone starts a new one and the agent picks up where it left off. Voice keeps going with the screen locked.

The phone uses the localhost control API, on a fixed port (7389 by default) that also serves Birdsong's MCP server to sessions. Unticking the checkbox only refuses requests that come through Tailscale; sessions keep their MCP tools. Tailscale Funnel (public internet) traffic is always refused. The iOS token stays the same across launches. To revoke it, click **Rotate Token** in **Settings** and pair again. Scripts on the Mac use a separate token from `~/.birdsong/control.json`, which is new every launch and refused over Tailscale; sessions have their own MCP keys. Neither is affected by rotating.

## History Management

It's likely you don't have to read this section ever, but it's here in case your app gets slow.

- If the session is slow due to a long transcript, you should just start a new session.
- The session list is capped to 500 on app startup and whenever a session is created (can be edited via `settings.sessionListMax`).  The oldest sessions are removed from the list but are still on disk.  You can still find these sessions through "Find in History".
- If you're running out of disk space, click on Settings button on the bottom, select "Open Sessions Folder" and then archive/delete folders as you wish (folder names are prefixed with YYYY-MM-DD which is when those sessions started).  Keep in mind those sessions might still show up in your session list until you click them.  Only then will the app check its existence and remove it from the list if it doesn't exist anymore.  This was done to avoid extra checks in the app to maximize app performance.

## Inworld Model Research

```
inworld/models/gemma-4-26b-a4b-it
# under 0.15s TTFT, 237 tok/s, $0.07 input, $0.34 output

inworld/models/mimo-v2.6-pro
# under 0.18s TTFT, 273 tok/s, $0.43 input, $0.87 output
```

See [Inworld's list of models](https://inworld.ai/models).

For intelligence comparisons, see [Artificial Analysis](https://artificialanalysis.ai/evaluations/artificial-analysis-intelligence-index?models=mimo-v2-6-pro%2Cgemma-4-31b%2Cglm-5-3-flash%2Cdeepseek-v4-1-flash-1017-non-reasoning%2Cdeepseek-v4-1-flash-1017%2Cdeepseek-v4-1-flash-1017-high).

## Features

Speed optimizations:
- Pre-warmed session pool so time to first prompt is very fast
- Find in history is a streaming search that is performant even with a large history.

Niceties:
- Copy message or copy individual code blocks
- Save message or session as Markdown
- Preview Markdown files like how they would appear in GitHub
- [Reminders](#reminders) that agents or voice can set for you, with a popup, chime and transcript note when due

## Shortcuts

### Global Shortcuts

**Cmd/Ctrl+Shift+S**: Select sessions mode

**Cmd/Ctrl+Shift+E**: Select files mode

**Cmd/Ctrl+Shift+D**: Select diff mode

**Cmd/Ctrl+I**: Focus on prompt

**Cmd/Ctrl+Shift+N**: Fork selected session

**Cmd/Ctrl+Shift+P**: Open command palette (search and run commands for the current mode)

**Ctrl+Cmd+P / Ctrl+Alt+P**: Pin/unpin selected session

**Cmd/Ctrl+R**: Rename selected session

**Cmd+Left / Alt+Left**: Go back to the previously selected session

**Cmd+Right / Alt+Right**: Go forward through selected sessions

**Cmd/Ctrl+/**: Toggle zen mode

**Cmd/Ctrl+,**: Open settings

**Cmd/Ctrl+1**: Switch between Home and the previous session

**Cmd/Ctrl+2**: Switch between Home's file explorer and the previous session

### Sessions mode

**Ctrl+D**: Close session on empty prompt

**Cmd/Ctrl+F**: Find in current session

**Cmd/Ctrl+Shift+F**: Find in History (searches all sessions on disk)

**Cmd/Ctrl+N**: New session

**Cmd/Ctrl+P**: Filter sessions

**Cmd/Ctrl+W**: Close selected session

**Escape**: Stop agent (while running)

**Ctrl+Tab**: Go to next visible tab

**Ctrl+Shift+Tab**: Go to previous visible tab

**/**: shows autocomplete of slash commands in the composer

### Files mode

**Cmd/Ctrl+F**: Find

**Cmd/Ctrl+G**: Find next

**Cmd/Ctrl+N**: New untitled file (saving it asks where)

**Cmd/Ctrl+O**: Open File

**Cmd/Ctrl+P**: Go to File (search files & folders)

**Cmd/Ctrl+S**: Save file

**Cmd/Ctrl+W**: Close file

**Ctrl+Tab**: Go to next open file

**Ctrl+Shift+Tab**: Go to previous open file

### Diff mode

Review local Git changes in a GitHub-style Files changed view with a file tree, syntax and word highlights, unified/split layouts, and expandable context. Each working folder resolves to its repository or worktree; folders in the same repository share a group. Separate worktrees stay separate.

**All changes** compares HEAD with saved files on disk (`git diff HEAD`), **Staged** compares HEAD with the index (`git diff --cached`), and **Unstaged** compares the index with disk (`git diff`). All and Unstaged also show untracked, unignored files. Unsaved editor buffers are excluded. Repositories without commits compare against an empty tree.

Changes refresh automatically while the view is open and when the window regains focus. File collapse, selection, layout, and scroll position survive session/mode switches during the current app run. Open in Files opens the saved working file.

**Cmd/Ctrl+F** or **Cmd/Ctrl+P**: Filter changed files
