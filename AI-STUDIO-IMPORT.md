# Mr. Drew’s Music Lab · VR — AI Studio import

Created by Drew Wichman.

Preserve the existing app, artwork, audio, controls and file formats. This is a transfer of an existing app, not a request to redesign or simplify it.

Source: musicaldrewby/music_teacher at 9a7f0cd9aa4c8683f611a6b9c73f841ce15a1f02. All 115 original files were verified against their Git blob hashes.

This is an independent copy. Existing Sites and the arcade index are unchanged. Browser-saved projects must be exported from the original app and imported here when supported.

## Run

`npm run dev` serves `app-runtime/` on port 3000, using the existing HTML and JavaScript. The dependency-free Node server supports byte-range audio and video requests. `PORT` and `--port` can override the port. Edit the app-runtime files in AI Studio; dist is an exact archival copy because AI Studio excludes build output folders. Original package scripts remain available with an :original suffix.

## Existing backend

The shared Listening Room still calls https://drews-music-lab-vr.musicaldrewby.chatgpt.site/api/gallery. Its existing server source is included. Verify cross-origin access from AI Studio before claiming that server-backed features work. Do not expose owner moderation or remove validation.

