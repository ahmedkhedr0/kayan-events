import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, CompanyTreasury, StaffAccount } from '../types';

const TRIPS_COLLECTION = 'trips';
const GLOBAL_DOC = doc(db, 'app_config', 'global');

let isInitialTripsUploadDone = false;
let isInitialGlobalUploadDone = false;

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
        // Upload initial trips to cloud
        await syncAllTripsToCloud(initialTripsFallback);
        onTripsUpdate(initialTripsFallback);
        return;
      }

      if (!snapshot.empty) {
        isInitialTripsUploadDone = true;
        const cloudTrips: Trip[] = [];
        snapshot.forEach((docSnap) => {
          cloudTrips.push(docSnap.data() as Trip);
        });

        // Sort by createdAt or preserve trip order if possible
        cloudTrips.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
        onTripsUpdate(cloudTrips);
      }
    },
    (error) => {
      console.warn('Firestore trips subscription error (falling back to offline cache):', error);
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
        await syncGlobalStateToCloud(initialActiveTripId, initialTreasury, initialStaffAccounts);
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
        onStateUpdate({
          activeTripId: data.activeTripId,
          treasury: data.treasury,
          staffAccounts: data.staffAccounts,
        });
      }
    },
    (error) => {
      console.warn('Firestore global state subscription error:', error);
    }
  );

  return unsubscribe;
};

/**
 * Save single trip or list of trips to Firestore
 */
export const syncTripToCloud = async (trip: Trip) => {
  try {
    if (!trip || !trip.id) return;
    const sanitizedTrip = sanitizeForFirestore(trip);
    const tripDocRef = doc(db, TRIPS_COLLECTION, trip.id);
    await setDoc(tripDocRef, sanitizedTrip, { merge: true });
  } catch (err) {
    console.error('Error syncing trip to Firestore:', err);
  }
};

export const syncAllTripsToCloud = async (trips: Trip[]) => {
  try {
    if (!Array.isArray(trips) || trips.length === 0) return;
    for (const trip of trips) {
      await syncTripToCloud(trip);
    }
  } catch (err) {
    console.error('Error syncing all trips to Firestore:', err);
  }
};

export const deleteTripFromCloud = async (tripId: string) => {
  try {
    if (!tripId) return;
    const tripDocRef = doc(db, TRIPS_COLLECTION, tripId);
    await deleteDoc(tripDocRef);
  } catch (err) {
    console.error('Error deleting trip from Firestore:', err);
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
    const payload: Record<string, any> = {};
    if (activeTripId !== undefined) payload.activeTripId = activeTripId;
    if (treasury !== undefined) payload.treasury = sanitizeForFirestore(treasury);
    if (staffAccounts !== undefined) payload.staffAccounts = sanitizeForFirestore(staffAccounts);

    if (Object.keys(payload).length > 0) {
      const sanitizedPayload = sanitizeForFirestore(payload);
      await setDoc(GLOBAL_DOC, sanitizedPayload, { merge: true });
    }
  } catch (err) {
    console.error('Error syncing global state to Firestore:', err);
  }
};
