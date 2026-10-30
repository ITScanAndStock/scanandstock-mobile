import { useMemo } from "react";
import { type AudioPlayer, useAudioPlayer } from "expo-audio";

const successSource = require("../assets/sounds/ok.mp3");
const errorSource = require("../assets/sounds/error.mp3");

const replay = (player: AudioPlayer) => {
  player.seekTo(0);
  player.play();
};

export type ScanSounds = { success: () => void; error: () => void };

export function useScanSounds(): ScanSounds {
  const successPlayer = useAudioPlayer(successSource);
  const errorPlayer = useAudioPlayer(errorSource);
  return useMemo(
    () => ({ success: () => replay(successPlayer), error: () => replay(errorPlayer) }),
    [successPlayer, errorPlayer],
  );
}
