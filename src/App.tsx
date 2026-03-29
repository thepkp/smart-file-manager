/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  setDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  LogOut, 
  GraduationCap,
  Sparkles,
  ChevronRight,
  Trash2,
  AlertCircle,
  Share2,
  Eye,
  Copy,
  Check,
  ExternalLink,
  User as UserIcon,
  Settings,
  Archive,
  LayoutDashboard,
  Bot,
  Folder,
  Terminal,
  ArrowLeft,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { Material, MaterialType, AssignmentStatus, UserProfile, PriorityLevel } from './types';
import { classifyMaterial, getStudyHelp, solveAssignment } from './services/aiService';
import ReactMarkdown from 'react-markdown';

// Error Boundary for Firestore
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: string;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

const handleFirestoreError = (error: any, operationType: string, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

const MaterialViewer = ({ material, onClose, onShare, onTogglePublic, isOwner }: { 
  material: Material, 
  onClose: () => void,
  onShare?: (m: Material) => void,
  onTogglePublic?: (m: Material) => void,
  isOwner?: boolean
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (onShare) {
      onShare(material);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1A1A1A]/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#2D7FF9]/10 rounded-2xl flex items-center justify-center text-[#2D7FF9] shrink-0">
              {material.type === 'note' && <FileText className="w-7 h-7" />}
              {material.type === 'tutorial' && <BookOpen className="w-7 h-7" />}
              {material.type === 'pyq' && <History className="w-7 h-7" />}
              {material.type === 'link' && <LinkIcon className="w-7 h-7" />}
              {material.type === 'assignment' && <Clock className="w-7 h-7" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 truncate">{material.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{material.subject}</span>
                <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#2D7FF9]">{material.semester}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && onTogglePublic && (
              <button 
                onClick={() => onTogglePublic(material)}
                className={cn(
                  "px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm",
                  material.isPublic ? "bg-green-50 text-green-600 border border-green-100" : "bg-gray-50 text-gray-400 border border-gray-100"
                )}
              >
                {material.isPublic ? "Public" : "Private"}
              </button>
            )}
            {onShare && (
              <button 
                onClick={handleShare}
                className="p-3.5 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
              </button>
            )}
            <button onClick={onClose} className="p-3.5 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-2xl border border-gray-100 transition-all shadow-sm">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-[#FDFCFB]">
          <div className="max-w-4xl mx-auto space-y-10">
            {material.content && material.content.startsWith('data:image') && (
              <div className="flex justify-center">
                <img 
                  src={material.content} 
                  alt={material.title} 
                  className="max-w-full rounded-[32px] shadow-2xl border-8 border-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            {material.content && material.content.startsWith('data:application/pdf') && (
              <div className="w-full h-[700px] rounded-[32px] overflow-hidden border border-gray-100 shadow-2xl bg-white p-2">
                <iframe 
                  src={material.content} 
                  className="w-full h-full rounded-[24px]"
                  title={material.title}
                />
              </div>
            )}
            {material.content && !material.content.startsWith('data:') && (material.type === 'note' || material.type === 'assignment' || material.type === 'tutorial' || material.type === 'pyq') && (
              <div className="bg-white p-12 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#2D7FF9]/10" />
                <div className="prose prose-lg max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed font-serif">
                    {material.content}
                  </p>
                </div>
              </div>
            )}
            {material.type === 'link' && (
              <div className="flex flex-col items-center justify-center py-24 space-y-8 bg-white rounded-[40px] border border-gray-50 shadow-sm">
                <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center text-[#2D7FF9] shadow-inner">
                  <LinkIcon className="w-12 h-12" />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-3xl font-bold tracking-tight">External Resource</h3>
                  <p className="text-gray-400 max-w-sm mx-auto font-medium">This material is hosted on an external platform. Access it securely below.</p>
                </div>
                <a 
                  href={material.content} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-10 py-5 bg-[#2D7FF9] text-white rounded-[24px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl"
                >
                  Open Resource <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            )}

            {material.aiSummary && (
              <div className="p-8 bg-gradient-to-br from-[#2D7FF9]/5 to-transparent rounded-[32px] border border-[#2D7FF9]/10 space-y-4">
                <div className="flex items-center gap-3 text-[#2D7FF9]">
                  <div className="w-8 h-8 bg-[#2D7FF9] text-white rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">AI Summary & Insights</span>
                </div>
                <p className="text-gray-600 italic leading-relaxed text-lg font-serif">
                  {material.aiSummary}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterSemester, setFilterSemester] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [isAdding, setIsAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentSemester, setCurrentSemester] = useState<string | null>(null);
  const [currentSubject, setCurrentSubject] = useState<string | null>(null);
  const [activeMaterialType, setActiveMaterialType] = useState<MaterialType | 'all'>('all');

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<MaterialType>('note');
  const [newContent, setNewContent] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newSemester, setNewSemester] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityLevel>('none');
  const [newDueDate, setNewDueDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<Material | null>(null);
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection by attempting to fetch a non-existent doc from server
        await getDocFromServer(doc(db, '_connection_test_', 'ping'));
        console.log("Firestore connection verified.");
      } catch (error: any) {
        if (error.message?.includes('the client is offline') || error.code === 'unavailable') {
          console.error("Firestore connection failed: The client is offline or the backend is unreachable. Please check your Firebase configuration in firebase-applet-config.json.");
        }
      }
    };
    testConnection();

    // Check for direct material link
    const params = new URLSearchParams(window.location.search);
    const materialId = params.get('id');
    if (materialId) {
      const fetchPublicMaterial = async () => {
        try {
          const docRef = doc(db, 'materials', materialId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Material;
            if (data.isPublic || (auth.currentUser && data.uid === auth.currentUser.uid)) {
              setViewingMaterial({ ...data, id: docSnap.id });
            }
          }
        } catch (error) {
          console.error("Error fetching public material:", error);
        }
      };
      fetchPublicMaterial();
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Ensure user profile exists
        try {
          await setDoc(doc(db, 'users', u.uid), {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, 'write', `users/${u.uid}`);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setMaterials([]);
      return;
    }

    const q = query(
      collection(db, 'materials'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      setMaterials(docs);
    }, (error) => handleFirestoreError(error, 'list', 'materials'));

    return unsubscribe;
  }, [user]);

  const semesters = useMemo(() => {
    const s = new Set(materials.map(m => m.semester).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [materials]);

  const subjects = useMemo(() => {
    const filteredBySem = filterSemester === 'All' 
      ? materials 
      : materials.filter(m => m.semester === filterSemester);
    const s = new Set(filteredBySem.map(m => m.subject).filter(Boolean));
    return ['All', ...Array.from(s).sort()];
  }, [materials, filterSemester]);

  useEffect(() => {
    if (!semesters.includes(filterSemester)) {
      setFilterSemester('All');
    }
  }, [semesters, filterSemester]);

  useEffect(() => {
    if (!subjects.includes(filterSubject)) {
      setFilterSubject('All');
    }
  }, [subjects, filterSubject]);

  const filteredMaterials = useMemo(() => {
    let result = materials.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            m.subject.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSubject = filterSubject === 'All' || m.subject === filterSubject;
      const matchesSemester = filterSemester === 'All' || m.semester === filterSemester;
      return matchesSearch && matchesSubject && matchesSemester;
    });

    if (sortBy === 'priority') {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
      result.sort((a, b) => {
        const pA = priorityOrder[a.priority] ?? 3;
        const pB = priorityOrder[b.priority] ?? 3;
        if (pA !== pB) return pA - pB;
        return b.createdAt?.toMillis() - a.createdAt?.toMillis();
      });
    } else {
      result.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
    }

    return result;
  }, [materials, searchTerm, filterSubject, filterSemester, sortBy]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
        setNewType('note');
      };
      reader.readAsDataURL(file);
      setNewTitle(file.name.split('.')[0]);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle) return;

    setAiLoading(true);
    let subject = newSubject;
    let semester = newSemester;
    let summary = '';

    try {
      const aiResult = await classifyMaterial(newTitle, newContent, newType, filePreview || undefined);
      subject = aiResult.subject;
      semester = aiResult.semester;
      summary = aiResult.summary;
      const detectedType = aiResult.type as MaterialType;

      await addDoc(collection(db, 'materials'), {
        uid: user.uid,
        title: newTitle,
        type: detectedType || newType,
        content: filePreview || newContent,
        subject: subject || 'General',
        semester: semester || 'Unknown',
        status: (detectedType || newType) === 'assignment' ? 'pending' : 'none',
        priority: (detectedType || newType) === 'assignment' ? newPriority : 'none',
        aiSummary: summary,
        dueDate: newDueDate ? Timestamp.fromDate(new Date(newDueDate)) : null,
        createdAt: serverTimestamp()
      });
      setIsAdding(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, 'create', 'materials');
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setNewTitle('');
    setNewType('note');
    setNewContent('');
    setNewSubject('');
    setNewSemester('');
    setNewPriority('none');
    setNewDueDate('');
    setSelectedFile(null);
    setFilePreview(null);
  };

  const toggleStatus = async (material: Material) => {
    if (material.type !== 'assignment') return;
    const newStatus = material.status === 'pending' ? 'completed' : 'pending';
    try {
      await updateDoc(doc(db, 'materials', material.id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, 'update', `materials/${material.id}`);
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'materials', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `materials/${id}`);
    }
  };

  const handleSolveAssignment = async (material: Material) => {
    setChatOpen(true);
    setAiLoading(true);
    setChatResponse('');
    try {
      const solution = await solveAssignment(material);
      setChatResponse(solution);
    } catch (error) {
      setChatResponse("Sorry, I couldn't solve this assignment. Please try again or provide more details.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatQuery) return;
    setAiLoading(true);
    const context = materials.slice(0, 5).map(m => `${m.title}: ${m.aiSummary}`).join('\n');
    const response = await getStudyHelp(chatQuery, context);
    setChatResponse(response);
    setAiLoading(false);
  };

  const togglePublic = async (material: Material) => {
    try {
      const docRef = doc(db, 'materials', material.id);
      await updateDoc(docRef, { isPublic: !material.isPublic });
    } catch (error) {
      handleFirestoreError(error, 'update', `materials/${material.id}`);
    }
  };

  const handleShare = (material: Material) => {
    setIsSharing(material.id);
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${material.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsSharing(null);
    }, 2000);
  };

  if (loading && !viewingMaterial) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <GraduationCap className="w-12 h-12 text-[#5A5A40]" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6">
        <AnimatePresence>
          {viewingMaterial && (
            <MaterialViewer 
              material={viewingMaterial} 
              onClose={() => {
                setViewingMaterial(null);
                window.history.pushState({}, '', window.location.pathname);
              }} 
            />
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[#5A5A40] rounded-3xl flex items-center justify-center shadow-lg">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-serif font-bold text-[#1A1A1A]">AcademiaAI</h1>
            <p className="text-[#5A5A40] font-serif italic">Your intelligent academic sanctuary.</p>
          </div>
          
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-[#E5E5E0] space-y-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              Organize assignments, notes, and resources in one place. 
              Let AI handle the classification while you focus on learning.
            </p>
            <button 
              onClick={handleLogin}
              className="w-full py-4 bg-[#5A5A40] text-white rounded-full font-medium flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-all shadow-md active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-[#1A1A1A] font-sans pb-24">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-[#F8F9FB]/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
            {user.photoURL && user.photoURL !== "" ? (
              <img src={user.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-6 h-6 text-gray-300" />
            )}
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-800">
            {activeTab === 'dashboard' ? 'Academic Hub' : activeTab === 'assistant' ? 'The Focused Academic' : 'My Profile'}
          </span>
        </div>
        <button className="p-3 bg-white text-gray-400 hover:text-[#2D7FF9] rounded-2xl shadow-sm border border-gray-100 transition-all">
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="px-6 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!currentSemester ? (
              /* View 1: Semesters */
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight">Semesters</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Batch 2024-28</p>
                  </div>
                  <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                    <Settings className="w-6 h-6" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4'].map((sem, idx) => (
                    <motion.div
                      key={sem}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setCurrentSemester(sem)}
                      className="w-full p-8 bg-white rounded-[32px] text-left hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-gray-50 group"
                    >
                      <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-gray-800">{sem}</h2>
                        <div className="flex items-center gap-2 text-[#2D7FF9] font-bold text-sm">
                          View Details <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : !currentSubject ? (
              /* View 2: Subjects for a Semester */
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentSemester(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <ArrowLeft className="w-8 h-8" />
                    </button>
                    <div className="space-y-1">
                      <h1 className="text-4xl font-bold tracking-tight">{currentSemester}</h1>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">My Subjects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                      <Settings className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {Array.from(new Set(materials.filter(m => m.semester === currentSemester).map(m => m.subject))).map((subject, idx) => {
                    const subjectMaterials = materials.filter(m => m.subject === subject && m.semester === currentSemester);
                    const taskCount = subjectMaterials.filter(m => m.type === 'assignment' && m.status === 'pending').length;
                    const subjectType = subjectMaterials[0]?.type === 'assignment' ? 'Core Engineering' : 'General';
                    
                    return (
                      <motion.div
                        key={subject}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => setCurrentSubject(subject)}
                        className="w-full p-6 bg-white rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2D7FF9]" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#EBF2FF] rounded-lg flex items-center justify-center text-[#2D7FF9]">
                                <BookOpen className="w-4 h-4" />
                              </div>
                              <h3 className="text-xl font-bold text-gray-800">{subject}</h3>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-10">{subjectType}</p>
                          </div>
                          {taskCount > 0 && (
                            <div className="px-3 py-1 bg-[#2D7FF9] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                              {taskCount} tasks
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {materials.filter(m => m.semester === currentSemester).length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-100">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Folder className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-gray-400 font-medium">No subjects found for this semester.</p>
                      <button onClick={() => setIsAdding(true)} className="mt-4 text-[#2D7FF9] font-bold hover:underline">Add your first material</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* View 3: Subject Detail (Materials categorized) */
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentSubject(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <ArrowLeft className="w-8 h-8" />
                    </button>
                    <div className="space-y-1">
                      <h1 className="text-4xl font-bold tracking-tight">{currentSubject}</h1>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{currentSemester}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="w-8 h-8 rounded-full" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                      <Settings className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Tabs for Material Types */}
                  <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hide border-b border-gray-100">
                    {(['assignment', 'tutorial', 'link', 'pyq'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setActiveMaterialType(type)}
                        className={cn(
                          "pb-4 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative",
                          activeMaterialType === type || (activeMaterialType === 'all' && type === 'assignment')
                            ? "text-[#2D7FF9]" 
                            : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {type === 'pyq' ? 'PYQs' : type + 's'}
                        {(activeMaterialType === type || (activeMaterialType === 'all' && type === 'assignment')) && (
                          <motion.div 
                            layoutId="activeTabUnderline"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-[#2D7FF9] rounded-full" 
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {materials
                      .filter(m => m.subject === currentSubject && m.semester === currentSemester)
                      .filter(m => {
                        const typeToFilter = activeMaterialType === 'all' ? 'assignment' : activeMaterialType;
                        return m.type === typeToFilter;
                      })
                      .map((m, idx) => (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-6 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-bold text-lg shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingMaterial(m)}>
                              <h3 className={cn("text-xl font-bold truncate", m.status === 'completed' && "text-gray-400")}>{m.title}</h3>
                              <p className="text-[10px] text-gray-400 font-medium mt-1">
                                {m.type === 'assignment' ? 'Unit ' + (idx + 1) : m.type.toUpperCase()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {m.type === 'assignment' && (
                              m.status === 'completed' ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                  <Check className="w-4 h-4" /> Completed
                                </div>
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleSolveAssignment(m); }}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#2D7FF9] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-[#1D6FE9] transition-all"
                                >
                                  <Sparkles className="w-4 h-4" /> Solve using AI
                                </button>
                              )
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => deleteMaterial(m.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {materials.filter(m => m.subject === currentSubject && m.semester === currentSemester).length === 0 && (
                      <div className="text-center py-20 text-gray-400">No materials found for this subject.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[calc(100vh-160px)] space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-[#E1F0F7] text-[#2D7FF9] rounded-2xl flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">Hello! I'm your Academic Assistant.</h1>
                </div>
                <p className="text-gray-500 max-w-md leading-relaxed">
                  I can summarize your materials, explain complex concepts, or help organize your schedule. What are we working on today?
                </p>
              </div>
              <button 
                onClick={() => { setChatResponse(''); setChatQuery(''); }}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                title="Clear Chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide">
                {chatResponse ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-end">
                      <div className="bg-[#2D7FF9] text-white px-6 py-4 rounded-[24px] rounded-tr-none max-w-[80%] shadow-md">
                        <p className="font-medium">{chatQuery}</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-700 px-6 py-4 rounded-[24px] rounded-tl-none max-w-[90%] shadow-sm border border-gray-100 prose prose-sm">
                        <ReactMarkdown>{chatResponse}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-end mb-4">
                      <div className="bg-[#EBF2FF] text-[#2D7FF9] px-6 py-4 rounded-[24px] rounded-tr-none max-w-[80%] shadow-sm text-sm font-medium">
                        Can you explain the main theories of cognitive development from the Psychology 101 PDF I uploaded?
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <button 
                        onClick={() => setChatQuery('Summarize this PDF')}
                        className="w-full p-6 bg-white rounded-[24px] shadow-sm border border-gray-50 flex items-center gap-4 hover:shadow-md transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-800">Summarize this PDF</h4>
                          <p className="text-xs text-gray-400">Get key insights instantly from any document.</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setChatQuery('Explain this topic')}
                        className="w-full p-6 bg-white rounded-[24px] shadow-sm border border-gray-50 flex items-center gap-4 hover:shadow-md transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-800">Explain this topic</h4>
                          <p className="text-xs text-gray-400">Simplifying complex academic theories.</p>
                        </div>
                      </button>
                      
                      <button 
                        onClick={() => setChatQuery('Create a study plan')}
                        className="w-full p-6 bg-white rounded-[24px] shadow-sm border border-gray-50 flex items-center gap-4 hover:shadow-md transition-all text-left group"
                      >
                        <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                          <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-800">Create a study plan</h4>
                          <p className="text-xs text-gray-400">Organize your goals for the coming week.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-2 rounded-[32px] shadow-xl border border-gray-100 flex items-center gap-2">
                <button className="p-4 text-gray-400 hover:text-gray-600">
                  <LinkIcon className="w-6 h-6" />
                </button>
                <input 
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                  placeholder="Ask me anything about your studies..."
                  className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-gray-700 text-sm"
                />
                <button 
                  onClick={handleChat}
                  disabled={aiLoading || !chatQuery}
                  className="p-4 bg-[#2D7FF9] text-white rounded-[24px] hover:bg-[#1D6FE9] transition-all disabled:opacity-50 shadow-lg"
                >
                  {aiLoading ? <Sparkles className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setActiveTab('dashboard')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-8 h-8" />
              </button>
              <h1 className="text-3xl font-bold tracking-tight">Academic Profile</h1>
              <button className="p-2 text-[#2D7FF9] hover:bg-blue-50 rounded-full transition-colors">
                <Settings className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                {user.photoURL && user.photoURL !== "" ? (
                  <img src={user.photoURL} className="w-32 h-32 rounded-full border-4 border-white shadow-2xl" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-32 h-32 bg-[#5A5A40] rounded-full flex items-center justify-center border-4 border-white shadow-2xl">
                    <UserIcon className="w-16 h-16 text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#2D7FF9] text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <Check className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-4xl font-bold tracking-tight">{user.displayName}</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Undergraduate Scholar</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex items-center gap-6">
                <div className="w-12 h-12 bg-blue-50 text-[#2D7FF9] rounded-2xl flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">College</p>
                  <p className="text-lg font-bold text-gray-800">ABES Engineering College</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex items-center gap-6">
                <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Current Semester</p>
                  <p className="text-lg font-bold text-gray-800">Semester VI</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex items-center gap-6">
                <div className="w-12 h-12 bg-blue-50 text-[#2D7FF9] rounded-2xl flex items-center justify-center shrink-0">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Batch</p>
                  <p className="text-lg font-bold text-gray-800">Class of 2028</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-50 flex items-center gap-6">
                <div className="w-12 h-12 bg-blue-50 text-[#2D7FF9] rounded-2xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">Email</p>
                  <p className="text-lg font-bold text-gray-800">{user.email}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full py-5 bg-red-50 text-red-500 rounded-[32px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsAdding(true)}
        className="fixed bottom-32 right-6 w-16 h-16 bg-[#2D7FF9] text-white rounded-[24px] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Bottom Navigation */}
      <div className="fixed bottom-8 left-6 right-6 z-50">
        <div className="bg-white/90 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-2xl p-2 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 rounded-[24px] transition-all",
              activeTab === 'dashboard' ? "bg-[#EBF2FF] text-[#2D7FF9]" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('assistant')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 rounded-[24px] transition-all",
              activeTab === 'assistant' ? "bg-[#EBF2FF] text-[#2D7FF9]" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Bot className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">AI Assistant</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 rounded-[24px] transition-all",
              activeTab === 'profile' ? "bg-[#EBF2FF] text-[#2D7FF9]" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">New Material</h2>
                  <button onClick={() => setIsAdding(false)} className="p-2 text-gray-400 hover:text-gray-600">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleAddMaterial} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Upload File (PDF/Image)</label>
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-[#2D7FF9] transition-all">
                        {filePreview && filePreview.length > 0 && filePreview.startsWith('data:image/') ? (
                          <img src={filePreview} className="w-20 h-20 object-cover rounded-lg shadow-sm" alt="Preview" referrerPolicy="no-referrer" />
                        ) : selectedFile ? (
                          <div className="flex flex-col items-center gap-2 text-[#2D7FF9]">
                            {selectedFile.type === 'application/pdf' ? <FileText className="w-10 h-10" /> : <Plus className="w-10 h-10" />}
                            <span className="text-xs font-bold truncate max-w-[150px]">{selectedFile.name}</span>
                          </div>
                        ) : (
                          <>
                            <Plus className="w-6 h-6 text-gray-400" />
                            <span className="text-xs text-gray-400">Click or drag to upload</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Title</label>
                    <input 
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Calculus Assignment 1"
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#2D7FF9] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Type</label>
                      <select 
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as MaterialType)}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#2D7FF9] outline-none appearance-none"
                      >
                        <option value="note">Note / Other</option>
                        <option value="assignment">Assignment</option>
                        <option value="tutorial">Tutorial</option>
                        <option value="link">Link</option>
                        <option value="pyq">PYQ</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Subject (Optional)</label>
                      <input 
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        placeholder="AI will detect if empty"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#2D7FF9] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Semester (Optional)</label>
                      <input 
                        value={newSemester}
                        onChange={(e) => setNewSemester(e.target.value)}
                        placeholder="e.g., Semester 1"
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#2D7FF9] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Due Date (Optional)</label>
                      <input 
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#2D7FF9] outline-none"
                      />
                    </div>
                  </div>

                  {newType === 'assignment' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Priority</label>
                      <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as PriorityLevel[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setNewPriority(p)}
                            className={cn(
                              "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                              newPriority === p 
                                ? p === 'high' ? "bg-red-500 text-white border-red-500" :
                                  p === 'medium' ? "bg-orange-500 text-white border-orange-500" :
                                  "bg-blue-500 text-white border-blue-500"
                                : "bg-white text-gray-400 border-gray-200 hover:border-[#2D7FF9]"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Content / URL</label>
                    <textarea 
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Paste link, note text, or description..."
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[#2D7FF9] outline-none resize-none"
                    />
                  </div>

                  <button 
                    disabled={aiLoading}
                    className="w-full py-4 bg-[#2D7FF9] text-white rounded-full font-bold shadow-lg hover:bg-[#1D6FE9] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {aiLoading ? (
                      <>
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        AI is classifying...
                      </>
                    ) : (
                      'Save Material'
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingMaterial && (
          <MaterialViewer 
            material={viewingMaterial} 
            onClose={() => {
              setViewingMaterial(null);
              window.history.pushState({}, '', window.location.pathname);
            }} 
            onShare={handleShare}
            onTogglePublic={togglePublic}
            isOwner={user?.uid === viewingMaterial.uid}
          />
        )}

        {/* Chat Modal removed in favor of integrated Assistant tab */}
      </AnimatePresence>
    </div>
  );
}
