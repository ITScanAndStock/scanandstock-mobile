export type CameraTurnState = { receiptOpen: boolean; homeMounted: boolean; receiptMounted: boolean };

export type CameraTurn = { home: boolean; receipt: boolean };

// On Android a camera that binds, pauses or is destroyed unbinds every camera of the app (expo-camera unbindAll):
// each one renders only once the other is unmounted.
export function computeCameraTurn({ receiptOpen, homeMounted, receiptMounted }: CameraTurnState): CameraTurn {
  return { home: !receiptOpen && !receiptMounted, receipt: receiptOpen && !homeMounted };
}
