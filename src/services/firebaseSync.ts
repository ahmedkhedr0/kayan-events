import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  setLogLevel,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, CompanyTreasury, StaffAccount, ActivityLog } from '../types';
import { getDeletedTripIds, recordDeletedTripId, recordDeletedTripIds, isTripDeleted } from './storage';

// Silence verbose internal Firebase SDK backoff logs
try {
  setLogLevel('silent');
} catch {}

const TRIPS_COLLECTION = 'trips';
const GLOBAL_DOC = doc(db, 'app_config', 'global');

let isInitialTripsUploadDone = false;
let isInitialGlobalUploadDone = false;

// Per-trip content cache to prevent redundant writes
const syncedTripHashCache = new Map<string, string>();
let syncedGlobalHash = '';

type QuotaListener = (exceeded: boolean) => void;
const quotaListeners: Set<QuotaListener> = new Set();
let isQuotaExceeded = false;

export const subscribeToQuotaStatus = (listener: QuotaListener) => {
  quotaListeners.add(listener);
  listener(isQuotaExceeded);
  return () => {
    quotaListeners.delete(listener);
  };
};

export const resetQuotaCooldown = () => {
  isQuotaExceeded = false;
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
    notifyQuotaStatus(true);
    console.warn('⚠️ Firestore Free Daily Quota reached.');
    return true;
  }
  return false;
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
      const deletedIds = getDeletedTripIds();
      const validFallback = (initialTripsFallback || []).filter(
        (t) => t && t.id && !deletedIds.has(t.id) && !isTripDeleted(t.id)
      );

      if (snapshot.empty && !isInitialTripsUploadDone) {
        isInitialTripsUploadDone = true;
        if (validFallback.length > 0) {
          await syncAllTripsToCloud(validFallback);
          onTripsUpdate(validFallback);
        }
        return;
      }

      if (!snapshot.empty) {
        isInitialTripsUploadDone = true;
        const cloudTrips: Trip[] = [];
        const dummyTripIds = ['trip-athena-1', 'trip-porto-2', 'trip-sharm-3'];

        snapshot.forEach((docSnap) => {
          const tripData = docSnap.data() as Trip;
          const isMarkedDeleted = deletedIds.has(docSnap.id) || isTripDeleted(docSnap.id);

          if (
            dummyTripIds.includes(docSnap.id) ||
            isMarkedDeleted ||
            docSnap.id === 'trip-1785003236830' ||
            (tripData.settings?.tripName && tripData.settings.tripName.includes('قرية أثينا باي'))
          ) {
            // Delete legacy mock or permanently deleted trip from Firestore
            deleteTripFromCloud(docSnap.id);
          } else {
            cloudTrips.push(tripData);
            syncedTripHashCache.set(tripData.id, JSON.stringify(tripData));
          }
        });

        if (cloudTrips.length === 0) {
          if (validFallback.length > 0) {
            await syncAllTripsToCloud(validFallback);
            onTripsUpdate(validFallback);
          }
          return;
        }

        // Sort by createdAt or preserve trip order
        cloudTrips.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        onTripsUpdate(cloudTrips);
      }
    },
    (error) => {
      checkAndHandleError(error);
      console.warn('Firestore trips subscription error:', error?.message || error);
    }
  );

  return unsubscribe;
};

/**
 * Subscribe to real-time updates for Global App State (activeTripId, Treasury, Staff Accounts, Activity Logs, and Deleted Trip IDs).
 */
export const subscribeToGlobalState = (
  onStateUpdate: (data: {
    activeTripId?: string;
    treasury?: CompanyTreasury;
    staffAccounts?: StaffAccount[];
    activityLogs?: ActivityLog[];
    deletedTripIds?: string[];
  }) => void,
  initialActiveTripId: string,
  initialTreasury: CompanyTreasury,
  initialStaffAccounts?: StaffAccount[],
  initialActivityLogs?: ActivityLog[]
) => {
  const unsubscribe = onSnapshot(
    GLOBAL_DOC,
    async (docSnap) => {
      if (!docSnap.exists() && !isInitialGlobalUploadDone) {
        isInitialGlobalUploadDone = true;
        const currentDeleted = Array.from(getDeletedTripIds());
        await syncGlobalStateToCloud(
          initialActiveTripId,
          initialTreasury,
          initialStaffAccounts,
          initialActivityLogs,
          currentDeleted
        );
        onStateUpdate({
          activeTripId: initialActiveTripId,
          treasury: initialTreasury,
          staffAccounts: initialStaffAccounts,
          activityLogs: initialActivityLogs,
          deletedTripIds: currentDeleted,
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
            syncGlobalStateToCloud(
              data.activeTripId || initialActiveTripId,
              sanitizedTreasury,
              data.staffAccounts,
              data.activityLogs,
              data.deletedTripIds
            );
          }
        }

        if (Array.isArray(data.deletedTripIds) && data.deletedTripIds.length > 0) {
          recordDeletedTripIds(data.deletedTripIds);
        }

        syncedGlobalHash = JSON.stringify({ ...data, treasury: sanitizedTreasury });
        onStateUpdate({
          activeTripId: data.activeTripId,
          treasury: sanitizedTreasury,
          staffAccounts: data.staffAccounts,
          activityLogs: data.activityLogs,
          deletedTripIds: data.deletedTripIds,
        });
      }
    },
    (error) => {
      checkAndHandleError(error);
      console.warn('Firestore global state subscription error:', error?.message || error);
    }
  );

  return unsubscribe;
};

/**
 * Save single trip or list of trips to Firestore (only writes if changed and NOT deleted)
 */
export const syncTripToCloud = async (trip: Trip) => {
  try {
    if (!trip || !trip.id) return;
    if (isTripDeleted(trip.id)) {
      console.warn(`[Sync Shield] Skipping upload of deleted trip: ${trip.id}`);
      // Ensure it is purged from Firestore
      const tripDocRef = doc(db, TRIPS_COLLECTION, trip.id);
      await deleteDoc(tripDocRef).catch(() => {});
      return;
    }

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
    const deletedIds = getDeletedTripIds();

    for (const trip of trips) {
      if (!trip || !trip.id || deletedIds.has(trip.id) || isTripDeleted(trip.id)) {
        continue;
      }
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
    recordDeletedTripId(tripId);
    syncedTripHashCache.delete(tripId);

    const tripDocRef = doc(db, TRIPS_COLLECTION, tripId);
    await deleteDoc(tripDocRef).catch(() => {});

    // Permanently record deletion tombstone in Firestore app_config/global
    try {
      await setDoc(
        GLOBAL_DOC,
        {
          deletedTripIds: arrayUnion(tripId),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Could not record deletedTripId in global Firestore doc:', e);
    }
  } catch (err) {
    if (!checkAndHandleError(err)) {
      console.error('Error deleting trip from Firestore:', err);
    }
  }
};

/**
 * Delete all trips from Firestore collection to ensure a fresh, clean reset
 */
export const clearAllTripsFromCloud = async () => {
  try {
    syncedTripHashCache.clear();
    const tripsRef = collection(db, TRIPS_COLLECTION);
    const snapshot = await getDocs(tripsRef);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(doc(db, TRIPS_COLLECTION, docSnap.id)));
    await Promise.all(deletePromises);
  } catch (err) {
    if (!checkAndHandleError(err)) {
      console.error('Error clearing all trips from Firestore:', err);
    }
  }
};

/**
 * Save activeTripId, treasury, staff accounts, activity logs, and deletedTripIds to Firestore
 */
export const syncGlobalStateToCloud = async (
  activeTripId?: string,
  treasury?: CompanyTreasury,
  staffAccounts?: StaffAccount[],
  activityLogs?: ActivityLog[],
  deletedTripIds?: string[]
) => {
  try {
    const payload: Record<string, any> = {};
    if (activeTripId !== undefined) payload.activeTripId = activeTripId;
    if (treasury !== undefined) payload.treasury = sanitizeForFirestore(treasury);
    if (staffAccounts !== undefined) payload.staffAccounts = sanitizeForFirestore(staffAccounts);
    if (activityLogs !== undefined) payload.activityLogs = sanitizeForFirestore(activityLogs.slice(0, 300));
    if (deletedTripIds !== undefined) payload.deletedTripIds = sanitizeForFirestore(deletedTripIds);

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
