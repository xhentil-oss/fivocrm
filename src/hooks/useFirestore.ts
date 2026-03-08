import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

// Types for query options
interface QueryOptions {
  where?: { field: string; operator: string; value: any }[];
  orderBy?: { field: string; direction?: 'asc' | 'desc' };
}

// Convert Firestore timestamps to Date
function convertTimestamps(data: DocumentData): DocumentData {
  const converted: DocumentData = { ...data };
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  }
  return converted;
}

// Hook to fetch a collection with real-time updates
export function useCollection<T = DocumentData>(
  collectionName: string,
  options?: QueryOptions
) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const constraints: QueryConstraint[] = [];

    // Add where clauses
    if (options?.where) {
      options.where.forEach((w) => {
        constraints.push(where(w.field, w.operator as any, w.value));
      });
    }

    // Add orderBy
    if (options?.orderBy) {
      constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
    }

    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...convertTimestamps(doc.data())
        })) as (T & { id: string })[];
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(options)]);

  return { data, loading, error };
}

// Hook to fetch a single document
export function useDocument<T = DocumentData>(
  collectionName: string,
  documentId: string | undefined
) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, collectionName, documentId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setData({
            id: snapshot.id,
            ...convertTimestamps(snapshot.data())
          } as T & { id: string });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching document:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, documentId]);

  return { data, loading, error };
}

// Helper to remove undefined values (Firebase doesn't accept undefined)
function removeUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
}

// Hook for mutations (create, update, delete)
export function useMutation<T = DocumentData>(collectionName: string) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: Omit<T, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      const docData = removeUndefined({
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdByUserId: user?.uid || null
      });
      const docRef = await addDoc(collection(db, collectionName), docData);
      setLoading(false);
      return { id: docRef.id, ...docData };
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [collectionName, user]);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, removeUndefined({
        ...data,
        updatedAt: Timestamp.now()
      }) as any);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [collectionName]);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [collectionName]);

  return { create, update, remove, loading, error };
}
