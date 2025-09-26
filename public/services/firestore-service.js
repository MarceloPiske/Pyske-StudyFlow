import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  setDoc,
  query, 
  where, 
  orderBy 
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

export class FirestoreService {
  constructor(db, user) {
    this.db = db;
    this.user = user;
  }

  async getCollection(collectionName, orderField = 'createdAt', orderDirection = 'desc') {
    try {
      const q = query(
        collection(this.db, collectionName),
        where('userId', '==', this.user.uid),
        orderBy(orderField, orderDirection)
      );
      const snapshot = await getDocs(q);
      
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      
      return items;
    } catch (error) {
      console.error(`Error loading ${collectionName}:`, error);
      return [];
    }
  }

  async getDocument(collectionName, docId) {
    try {
      const docRef = doc(this.db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting document ${docId}:`, error);
      return null;
    }
  }

  async createDocument(collectionName, data) {
    try {
      const docData = {
        ...data,
        userId: this.user.uid,
        createdAt: new Date()
      };
      const docRef = await addDoc(collection(this.db, collectionName), docData);
      return { id: docRef.id, ...docData };
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  async updateDocument(collectionName, docId, data) {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date()
      };
      await updateDoc(doc(this.db, collectionName, docId), updateData);
      return { id: docId, ...updateData };
    } catch (error) {
      console.error(`Error updating document ${docId}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName, docId) {
    try {
      await deleteDoc(doc(this.db, collectionName, docId));
      return true;
    } catch (error) {
      console.error(`Error deleting document ${docId}:`, error);
      throw error;
    }
  }

  async setUserDocument(docPath, data) {
    try {
      const docRef = doc(this.db, 'users', this.user.uid, ...docPath.split('/'));
      await setDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error(`Error setting user document ${docPath}:`, error);
      throw error;
    }
  }

  async getUserDocument(docPath) {
    try {
      const docRef = doc(this.db, 'users', this.user.uid, ...docPath.split('/'));
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error(`Error getting user document ${docPath}:`, error);
      return null;
    }
  }

  async getTopicResources(topicId) {
    try {
      const q = query(
        collection(this.db, 'resources'),
        where('userId', '==', this.user.uid),
        where('primaryTopicId', '==', topicId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const resources = [];
      snapshot.forEach(doc => {
        resources.push({ id: doc.id, ...doc.data() });
      });
      
      return resources;
    } catch (error) {
      console.error('Error loading topic resources:', error);
      return [];
    }
  }

  async getTopicBooks(topicId) {
    try {
      const q = query(
        collection(this.db, 'books'),
        where('userId', '==', this.user.uid),
        where('relatedTopicIds', 'array-contains', topicId)
      );
      const snapshot = await getDocs(q);
      
      const books = [];
      snapshot.forEach(doc => {
        books.push({ id: doc.id, ...doc.data() });
      });
      
      return books;
    } catch (error) {
      console.error('Error loading topic books:', error);
      return [];
    }
  }

  async getTopicSessions(topicId) {
    try {
      const q = query(
        collection(this.db, 'studySessions'),
        where('userId', '==', this.user.uid),
        where('topicId', '==', topicId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const sessions = [];
      snapshot.forEach(doc => {
        sessions.push({ id: doc.id, ...doc.data() });
      });
      
      return sessions;
    } catch (error) {
      console.error('Error loading topic sessions:', error);
      return [];
    }
  }
}