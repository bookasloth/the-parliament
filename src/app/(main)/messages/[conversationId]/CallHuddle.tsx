"use client"

import { LiveKitRoom, VideoConference } from "@livekit/components-react"
import "@livekit/components-styles"

/**
 * Fullscreen 1:1 huddle overlay. Given a signed token + LiveKit URL, connects
 * and renders LiveKit's prebuilt conference UI (tiles, mic/cam/screen controls,
 * leave button). ponytail: reuse VideoConference instead of hand-rolling tiles —
 * swap for custom layout only if the brand needs it.
 */
export default function CallHuddle({
  token,
  serverUrl,
  onLeave,
  onError,
}: {
  token: string
  serverUrl: string
  onLeave: () => void
  /** Connection failed (bad LIVEKIT_URL, network, denied media). Surface it
   *  instead of stranding the user on a silent black overlay. */
  onError?: (message: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black" data-lk-theme="default">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio
        video
        onDisconnected={onLeave}
        onError={(e) =>
          onError?.(
            e?.message
              ? `Couldn't connect the call: ${e.message}`
              : "Couldn't connect the call. Check your camera/mic permissions and try again.",
          )
        }
        style={{ height: "100dvh" }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  )
}
