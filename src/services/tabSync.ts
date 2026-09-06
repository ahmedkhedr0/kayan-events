export type TabSyncMessage =
  | { type: 'TRIP_DELETED'; tripId: string }
  | { type: 'TRIP_CREATED'; tripId: string }
  | { type: 'STUDENT_DELETED'; tripId: string; studentId: string };

type TabSyncCallback = (msg: TabSyncMessage) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<TabSyncCallback>();

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    channel = new BroadcastChannel('kayan_tab_sync_channel');
    channel.onmessage = (event) => {
      listeners.forEach((callback) => {
        try {
          callback(event.data);
        } catch (e) {
          console.error('Error in tab sync listener:', e);
        }
      });
    };
  } catch (e) {
    console.warn('BroadcastChannel initialization error:', e);
  }
}

export const broadcastTabMessage = (msg: TabSyncMessage) => {
  if (channel) {
    try {
      channel.postMessage(msg);
    } catch (e) {
      console.warn('Failed to broadcast message across tabs:', e);
    }
  }
};

export const subscribeToTabSync = (callback: TabSyncCallback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
