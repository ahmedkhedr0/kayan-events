import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  setLogLevel,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, CompanyTreasury, StaffAccount } from '../types';

// Silence verbose internal Firebase SDK backoff logs
try {
  setLogLevel('silent');
} catch {}

const TRIPS_COLLECTION = 'trips';
const GLOBAL_DOC = doc(db, 'app_config', 'global');

let isInitialTripsUploadDone = true;
let isInitialGlobalUploadDone = true;

// Per-trip content cache to prevent redundant writes
const syncedTripHashCache = new Map<string, string>();
let syncedGlobalHash = '';

// Quota exhaustion circuit breaker persisted in localStorage (24-hour daily quota cycle)
const QUOTA_STORAGE_KEY = 'kayan_firestore_quota_exceeded';
const QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours daily cooldown

const getStoredQuotaTimestamp = (): number => {
  try {
    const val = localStorage.getItem(QUOTA_STORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
};

let quotaExceededTimestamp = getStoredQuotaTimestamp();
let isQuotaExceeded =
  quotaExceededTimestamp > 0 && Date.now() - quotaExceededTimestamp < QUOTA_COOLDOWN_MS;

// If we already know quota is exceeded from previous session, ensure flag is set
if (quotaExceededTimestamp > 0 && Date.now() - quotaExceededTimestamp < QUOTA_COOLDOWN_MS) {
  isQuotaExceeded = true;
}

type QuotaListener = (exceeded: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();

export const subscribeToQuotaStatus = (listener: QuotaListener) => {
  quotaListeners.add(listener);
  listener(isQuotaExceeded);
  return () => {
    quotaListeners.delete(listener);
  };
};

export const resetQuotaCooldown = () => {
  quotaExceededTimestamp = 0;
  isQuotaExceeded = false;
  try {
    localStorage.removeItem(QUOTA_STORAGE_KEY);
  } catch {}
  notifyQuotaStatus(false);
};

const notifyQuotaStatus = (exceeded: boolean) => {
  isQuotaExceeded = exceeded;
  quotaListeners.forEach((listener) => {
    try {
      listener(exceeded);
    } catch {}
  });
};

const checkAndHandleError = (err: any) => {
  const errorMsg = String(err?.message || err || '');
  const errorCode = String(err?.code || '');
  if (
    errorCode === 'resource-exhausted' ||
    errorMsg.includes('resource-exhausted') ||
    errorMsg.includes('Quota limit exceeded') ||
    errorMsg.includes('quota')
  ) {
    quotaExceededTimestamp = Date.now();
    try {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(quotaExceededTimestamp));
    } catch {}
    notifyQuotaStatus(true);
    console.warn(
      '⚠️ Firestore Free Daily Quota reached. System seamlessly running in offline high-speed storage mode.'
    );
    return true;
  }
  return false;
};

const shouldSkipCloudWrite = () => {
  if (!isQuotaExceeded) return false;
  // If 24h cooldown passed, allow one trial write
  if (Date.now() - quotaExceededTimestamp > QUOTA_COOLDOWN_MS) {
    resetQuotaCooldown();
    return false;
  }
  return true;
};

/**
 * Recursively removes all undefined values from objects and arrays
 * so Firestore setDoc / updateDoc never encounters unsupported undefined field values.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Subscribe to real-time updates for trips from Firestore.
 * If cloud is empty on first listen, seed cloud with local initialTrips.
 */
export const subscribeToTrips = (
  onTripsUpdate: (trips: Trip[]) => void,
  initialTripsFallback: Trip[]
) => {
  const tripsRef = collection(db, TRIPS_COLLECTION);

  const unsubscribe = onSnapshot(
    tripsRef,
    async (snapshot) => {
      if (snapshot.empty && !isInitialTripsUploadDone) {
        isInitialTripsUploadDone = true;
        if (!shouldSkipCloudWrite()) {
          await syncAllTripsToCloud(initialTripsFallback);
        }
        onTripsUpdate(initialTripsFallback);
        return;
      }

      if (!snapshot.empty) {
        isInitialTripsUploadDone = true;
        const cloudTrips: Trip[] = [];
        const dummyTripIds = ['trip-athena-1', 'trip-porto-2', 'trip-sharm-3'];

        snapshot.forEach((docSnap) => {
          const tripData = docSnap.data() as Trip;
          if (dummyTripIds.includes(docSnap.id) || (tripData.settings?.tripName && tripData.settings.tripName.includes('قرية أثينا باي'))) {
            // Delete legacy mock trip from Firestore
            deleteTripFromCloud(docSnap.id);
          } else {
            cloudTrips.push(tripData);
            syncedTripHashCache.set(tripData.id, JSON.stringify(tripData));
          }
        });

        if (cloudTrips.length === 0) {
          if (!shouldSkipCloudWrite()) {
            await syncAllTripsToCloud(initialTripsFallback);
          }
          onTripsUpdate(initialTripsFallback);
          return;
        }

        // Sort by createdAt or preserve trip order
        cloudTrips.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        onTripsUpdate(cloudTrips);
      }
    },
    (error) => {
      checkAndHandleError(error);
      console.warn('Firestore trips subscription (using offline local storage):', error?.message || error);
    }
  );

  return unsubscribe;
};

/**
 * Subscribe to real-time updates for Global App State (activeTripId, Treasury, and Staff Accounts).
 */
export const subscribeToGlobalState = (
  onStateUpdate: (data: { activeTripId?: string; treasury?: CompanyTreasury; staffAccounts?: StaffAccount[] }) => void,
  initialActiveTripId: string,
  initialTreasury: CompanyTreasury,
  initialStaffAccounts?: StaffAccount[]
) => {
  const unsubscribe = onSnapshot(
    GLOBAL_DOC,
    async (docSnap) => {
      if (!docSnap.exists() && !isInitialGlobalUploadDone) {
        isInitialGlobalUploadDone = true;
        if (!shouldSkipCloudWrite()) {
          await syncGlobalStateToCloud(initialActiveTripId, initialTreasury, initialStaffAccounts);
        }
        onStateUpdate({
          activeTripId: initialActiveTripId,
          treasury: initialTreasury,
          staffAccounts: initialStaffAccounts,
        });
        return;
      }

      if (docSnap.exists()) {
        isInitialGlobalUploadDone = true;
        const data = docSnap.data();
        let sanitizedTreasury = data.treasury;
        if (sanitizedTreasury && Array.isArray(sanitizedTreasury.transfers)) {
          const hasDummy = sanitizedTreasury.transfers.some((t: any) => t.id === 'trf-001' || t.id === 'trf-002');
          if (hasDummy) {
            sanitizedTreasury = { currentBalance: 0, transfers: [] };
            syncGlobalStateToCloud(data.activeTripId || initialActiveTripId, sanitizedTreasury, data.staffAccounts);
          }
        }
        syncedGlobalHash = JSON.stringify({ ...data, treasury: sanitizedTreasury });
        onStateUpdate({
          activeTripId: data.activeTripId,
          treasury: sanitizedTreasury,
          staffAccounts: data.staffAccounts,
        });
      }
    },
    (error) => {
      checkAndHandleError(error);
      console.warn('Firestore global state subscription (using offline local storage):', error?.message || error);
    }
  );

  return unsubscribe;
};

/**
 * Save single trip or list of trips to Firestore (only writes if changed)
 */
export const syncTripToCloud = async (trip: Trip) => {
  try {
    if (!trip || !trip.id) return;
    if (shouldSkipCloudWrite()) return;

    const currentHash = JSON.stringify(trip);
    if (syncedTripHashCache.get(trip.id) === currentHash) {
      return; // No changes, avoid unnecessary write
    }

    const sanitizedTrip = sanitizeForFirestore(trip);
    const tripDocRef = doc(db, TRIPS_COLLECTION, trip.id);
    await setDoc(tripDocRef, sanitizedTrip, { merge: true });
    syncedTripHashCache.set(trip.id, currentHash);
  } catch (err) {
    if (!checkAndHandleError(err)) {
      console.error('Error syncing trip to Firestore:', err);
    }
  }
};

export const syncAllTripsToCloud = async (trips: Trip[]) => {
  try {
    if (!Array.isArray(trips) || trips.length === 0) return;
    if (shouldSkipCloudWrite()) return;

    for (const trip of trips) {
      await syncTripToCloud(trip);
    }
  } catch (err) {
    if (!checkAndHandleError(err)) {
      console.error('Error syncing all trips to Firestore:', err);
    }
  }
};

export const deleteTripFromCloud = async (tripId: string) => {
  try {
    if (!tripId) return;
    syncedTripHashCache.delete(tripId);
    if (shouldSkipCloudWrite()) return;

    const tripDocRef = doc(db, TRIPS_COLLECTION, tripId);
    await deleteDoc(tripDocRef);
  } catch (err) {
    if (!checkAndHandleError(err)) {
      console.error('Error deleting trip from Firestore:', err);
    }
  }
};

/**
 * Save activeTripId, treasury, and staff accounts to Firestore
 */
export const syncGlobalStateToCloud = async (
  activeTripId?: string,
  treasury?: CompanyTreasury,
  staffAccounts?: StaffAccount[]
) => {
  try {
    if (shouldSkipCloudWrite()) return;

    const payload: Record<string, any> = {};
    if (activeTripId !== undefined) payload.activeTripId = activeTripId;
    if (treasury !== undefined) payload.treasury = sanitizeForFirestore(treasury);
    if (staffAccounts !== undefined) payload.staffAccounts = sanitizeForFirestore(staffAccounts);

    if (Object.keys(payload).length > 0) {
      const currentGlobalHash = JSON.stringify(payload);
      if (syncedGlobalHash === currentGlobalHash) {
        return; // No changes
      }

      const sanitizedPayload = sanitizeForFirestore(payload);
      await setDoc(GLOBAL_DOC, sanitizedPayload, { merge: true });
      syncedGlobalHash = currentGlobalHash;
    }
  } catch (err) {
    if (!checkAndHandleError(err)) {
      console.error('Error syncing global state to Firestore:', err);
    }
  }
};
