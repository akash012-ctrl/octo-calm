"use client";

import { Button } from "@/components/ui/button";
import {
  ConnectionState,
  MicrophoneState,
} from "@/lib/stores/realtimeSessionStore";
import { Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";

interface SessionControlsProps {
  isInitializing: boolean;
  connectionState: ConnectionState;
  microphoneState: MicrophoneState;
  onStart: () => void | Promise<void>;
  onEnd: () => void | Promise<void>;
  onToggleMicrophone: () => void;
  onPushToTalk: (active: boolean) => void;
  pushToTalkActive: boolean;
}

export function SessionControls({
  isInitializing,
  connectionState,
  microphoneState,
  onStart,
  onEnd,
  onToggleMicrophone,
  onPushToTalk,
  pushToTalkActive,
}: SessionControlsProps) {
  const isActive =
    connectionState === "connected" || connectionState === "connecting";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={isActive ? "secondary" : "default"}
        size="lg"
        onClick={() => {
          if (isActive) {
            void onEnd();
          } else {
            void onStart();
          }
        }}
        disabled={isInitializing}
      >
        {isInitializing ? (
          <span className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 animate-pulse" />
            Connecting companion…
          </span>
        ) : isActive ? (
          <span className="flex items-center gap-2">
            <PhoneOff className="h-4 w-4" />
            End companion session
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4" />
            Start companion session
          </span>
        )}
      </Button>

      <Button
        variant={microphoneState === "muted" ? "outline" : "default"}
        size="lg"
        onClick={onToggleMicrophone}
        disabled={!isActive}
      >
        <span className="flex items-center gap-2">
          {microphoneState === "muted" ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          {microphoneState === "muted" ? "Unmute mic" : "Mute mic"}
        </span>
      </Button>

      <Button
        variant={pushToTalkActive ? "default" : "outline"}
        size="lg"
        onClick={() => onPushToTalk(!pushToTalkActive)}
        disabled={!isActive}
      >
        <span className="flex items-center gap-2">
          <Mic className="h-4 w-4" />
          {pushToTalkActive ? "Release to send" : "Hold to speak"}
        </span>
      </Button>
    </div>
  );
}
