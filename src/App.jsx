import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  User, BookOpen, Terminal, Code, Award, FileText, 
  Github, Mail, Lock, LogOut, Edit3, Plus, Trash2, 
  Save, X, Image as ImageIcon, ChevronDown, ExternalLink 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, getDoc, setDoc, 
  addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// --- Firebase Configuration & Initialization ---
// 注意：在实际部署到 GitHub Pages 时，请去 Firebase 控制台创建一个项目
// 并将下方的配置替换为你自己的配置。

const firebaseConfig = {
    apiKey: "AIzaSyBVuP_ZSX_EJxuddBolKDSGvr95FSwnwOc",
    authDomain: "myspacesite-1eb9c.firebaseapp.com",
    projectId: "myspacesite-1eb9c",
    storageBucket: "myspacesite-1eb9c.firebasestorage.app",
    messagingSenderId: "95930352702",
    appId: "1:95930352702:web:8d517afc51d98594573d6f",
    measurementId: "G-ZYK0KF6PJZ"
  };


const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app';

// --- Default Data (Fallback when database is empty) ---
const DEFAULT_PROFILE = {
  name: "Alex Chen",
  title: "CS Master Student & Developer",
  intro: "热爱探索人工智能与全栈开发。目前专注于计算机视觉领域的研究，同时保持对前端新技术的敏锐嗅觉。",
  cet6: { listening: 210, reading: 220, writing: 195, total: 625 },
  kaoyan: { politics: 78, math: 135, english: 82, signal: 140 },
  projects: [
    { id: 1, name: "基于Transformer的图像修复", desc: "使用PyTorch复现SOTA模型，改进了注意力机制。", stack: "Python, PyTorch" },
    { id: 2, name: "分布式爬虫系统", desc: "设计并实现了一个高并发爬虫，支持自动IP代理池。", stack: "Golang, Redis" }
  ],
  papers: [
    { id: 1, title: "Attention is All You Need (Review)", status: "Reading", link: "#" },
    { id: 2, title: "YOLOv8 Performance Analysis", status: "Writing", link: "#" }
  ]
};

// --- Components ---

// 1. Particle Background Component (Interactive)
const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    const particleCount = 60;
    const connectionDistance = 150;
    const mouseDistance = 200;

    let mouse = { x: null, y: null };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse interaction
        if (mouse.x != null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouseDistance) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouseDistance - distance) / mouseDistance;
            const directionX = forceDirectionX * force * this.size;
            const directionY = forceDirectionY * force * this.size;
            this.x -= directionX;
            this.y -= directionY;
          }
        }
      }

      draw() {
        ctx.fillStyle = 'rgba(147, 197, 253, 0.8)'; // blue-300
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        for (let j = i; j < particles.length; j++) {
          let dx = particles[i].x - particles[j].x;
          let dy = particles[i].y - particles[j].y;
          let distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(147, 197, 253, ${1 - distance / connectionDistance})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleMouseMove = (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };
    
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full -z-10 bg-slate-900" />;
};

// 2. Simple Editor for Blog
const SimpleEditor = ({ value, onChange }) => {
  const [imgUrl, setImgUrl] = useState('');

  const insertTag = (tag) => {
    // This is a simplified way to insert tags. 
    // In a real app, you might use a ref to get cursor position.
    if (tag === 'img') {
        if (!imgUrl) return;
        onChange(value + `\n<img src="${imgUrl}" alt="blog-img" className="w-full rounded-lg my-4" />\n`);
        setImgUrl('');
    } else {
        onChange(value + `\n<${tag}>Title</${tag}>\n`);
    }
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setImgUrl(reader.result);
          };
          reader.readAsDataURL(file);
      }
  }

  return (
    <div className="border border-slate-700 rounded-lg p-2 bg-slate-800 mb-4">
      <div className="flex gap-2 mb-2 border-b border-slate-700 pb-2 flex-wrap">
        <button onClick={() => insertTag('h2')} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 text-sm font-bold">H2</button>
        <button onClick={() => insertTag('h3')} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 text-sm font-bold">H3</button>
        <button onClick={() => insertTag('p')} className="px-2 py-1 bg-slate-700 rounded hover:bg-slate-600 text-sm">Para</button>
        <div className="flex items-center gap-1 bg-slate-900 px-2 rounded">
            <input type="file" onChange={handleImageUpload} className="text-xs w-24 text-slate-400" />
            <button onClick={() => insertTag('img')} className="text-blue-400 hover:text-blue-300">
                <ImageIcon size={16} />
            </button>
        </div>
      </div>
      <textarea 
        className="w-full h-64 bg-slate-900 p-4 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="支持 HTML 标签。例如: <p>这是一段正文</p>"
      />
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // Local "Admin" state for the demo
  const [password, setPassword] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  
  // Data States
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Editing States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState(null);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: '' });
  const [showPostEditor, setShowPostEditor] = useState(false);

  // --- Firebase Logic ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Data
  useEffect(() => {
    if (!user || !db) return;

    // Fetch Profile
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'profile_main');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
            // Initialize if not exists (Admin logic usually, but doing here for demo)
            await setDoc(docRef, DEFAULT_PROFILE);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };
    fetchProfile();

    // Fetch Posts (Real-time)
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'blog_posts'), orderBy('timestamp', 'desc'));
    const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPosts(postData);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
    });

    return () => unsubscribePosts();
  }, [user]);


  // --- Handlers ---

  const handleAdminLogin = (e) => {
      e.preventDefault();
      // Simple hardcoded password for demonstration
      if (password === 'admin123') {
          setIsAdmin(true);
          setShowLogin(false);
          setPassword('');
      } else {
          alert('Incorrect password. Try "admin123"');
      }
  };

  const handleSaveProfile = async () => {
      if (!user) return;
      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profile_main'), editProfileData);
          setProfile(editProfileData);
          setIsEditingProfile(false);
      } catch (e) {
          console.error("Save failed", e);
      }
  };

  const handleSavePost = async () => {
      if (!user) return;
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'blog_posts'), {
              title: newPost.title,
              content: newPost.content,
              tags: newPost.tags,
              timestamp: serverTimestamp(),
              author: profile.name
          });
          setNewPost({ title: '', content: '', tags: '' });
          setShowPostEditor(false);
      } catch (e) {
          console.error("Post failed", e);
      }
  };

  const handleDeletePost = async (id) => {
      if (!confirm('确定删除这篇文章吗?')) return;
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blog_posts', id));
      } catch (e) { console.error(e) }
  }

  const scrollDown = () => {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  // --- Render Helpers ---

  // Renders HTML content safely (for the blog)
  const MarkupContent = ({ html }) => {
      return <div className="prose prose-invert prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (loading && !user) return <div className="h-screen w-full bg-slate-900 flex items-center justify-center text-blue-400">Loading Matrix...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-x-hidden selection:bg-blue-500 selection:text-white">
      <ParticleBackground />
      
      {/* --- Navigation / Header --- */}
      <nav className="fixed top-0 w-full p-6 flex justify-between items-center z-50 bg-gradient-to-b from-slate-950/80 to-transparent backdrop-blur-sm">
        <div className="text-xl font-bold tracking-tighter flex items-center gap-2">
            <Terminal size={24} className="text-blue-400" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                {profile.name}
            </span>
        </div>
        <div className="flex gap-4 items-center">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white text-slate-400 transition-colors"><Github size={20}/></a>
            <a href="mailto:test@example.com" className="hover:text-white text-slate-400 transition-colors"><Mail size={20}/></a>
            
            {isAdmin ? (
                <button onClick={() => setIsAdmin(false)} className="flex items-center gap-1 text-red-400 text-sm border border-red-400/30 px-3 py-1 rounded-full hover:bg-red-400/10 transition">
                    <LogOut size={14} /> Exit Admin
                </button>
            ) : (
                <button onClick={() => setShowLogin(true)} className="text-slate-500 hover:text-blue-400 transition">
                    <Lock size={18} />
                </button>
            )}
        </div>
      </nav>

      {/* --- Login Modal --- */}
      {showLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 w-80 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold">Admin Access</h3>
                    <button onClick={() => setShowLogin(false)}><X size={20} className="text-slate-500 hover:text-white"/></button>
                  </div>
                  <form onSubmit={handleAdminLogin}>
                      <input 
                        type="password" 
                        placeholder="Password (admin123)" 
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 mb-4 text-white focus:outline-none focus:border-blue-500"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded font-medium transition">Unlock</button>
                  </form>
              </div>
          </div>
      )}

      {/* --- Landing Page (100vh) --- */}
      <header className="relative h-screen flex flex-col items-center justify-center px-4 text-center">
        <div className="z-10 animate-fade-in-up max-w-3xl">
            {/* Admin Edit Button */}
            {isAdmin && !isEditingProfile && (
                <button onClick={() => { setEditProfileData(profile); setIsEditingProfile(true); }} className="absolute top-0 right-0 translate-x-full md:translate-x-0 bg-blue-600/20 text-blue-400 p-2 rounded-full hover:bg-blue-600 hover:text-white transition">
                    <Edit3 size={16} />
                </button>
            )}

            {isEditingProfile ? (
                <div className="bg-slate-900/90 p-6 rounded-xl border border-blue-500/50 text-left w-full max-w-lg mx-auto backdrop-blur-xl">
                   <h3 className="text-blue-400 font-bold mb-4">编辑个人信息</h3>
                   <label className="text-xs text-slate-500">姓名</label>
                   <input className="w-full bg-slate-800 p-2 rounded mb-2 border border-slate-700" value={editProfileData.name} onChange={e => setEditProfileData({...editProfileData, name: e.target.value})} />
                   <label className="text-xs text-slate-500">头衔</label>
                   <input className="w-full bg-slate-800 p-2 rounded mb-2 border border-slate-700" value={editProfileData.title} onChange={e => setEditProfileData({...editProfileData, title: e.target.value})} />
                   <label className="text-xs text-slate-500">简介</label>
                   <textarea className="w-full bg-slate-800 p-2 rounded mb-4 border border-slate-700" rows={3} value={editProfileData.intro} onChange={e => setEditProfileData({...editProfileData, intro: e.target.value})} />
                   
                   <div className="grid grid-cols-2 gap-4 mb-4">
                       <div>
                           <h4 className="text-xs font-bold text-slate-400 mb-2">六级成绩</h4>
                           <input placeholder="听力" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.cet6.listening} onChange={e => setEditProfileData({...editProfileData, cet6: {...editProfileData.cet6, listening: parseInt(e.target.value)}})} />
                           <input placeholder="阅读" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.cet6.reading} onChange={e => setEditProfileData({...editProfileData, cet6: {...editProfileData.cet6, reading: parseInt(e.target.value)}})} />
                           <input placeholder="写作" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.cet6.writing} onChange={e => setEditProfileData({...editProfileData, cet6: {...editProfileData.cet6, writing: parseInt(e.target.value)}})} />
                           <input placeholder="总分" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.cet6.total} onChange={e => setEditProfileData({...editProfileData, cet6: {...editProfileData.cet6, total: parseInt(e.target.value)}})} />
                       </div>
                       <div>
                           <h4 className="text-xs font-bold text-slate-400 mb-2">考研成绩</h4>
                           <input placeholder="政治" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.kaoyan.politics} onChange={e => setEditProfileData({...editProfileData, kaoyan: {...editProfileData.kaoyan, politics: parseInt(e.target.value)}})} />
                           <input placeholder="数学" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.kaoyan.math} onChange={e => setEditProfileData({...editProfileData, kaoyan: {...editProfileData.kaoyan, math: parseInt(e.target.value)}})} />
                           <input placeholder="英语" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.kaoyan.english} onChange={e => setEditProfileData({...editProfileData, kaoyan: {...editProfileData.kaoyan, english: parseInt(e.target.value)}})} />
                           <input placeholder="专业课" type="number" className="w-full bg-slate-800 p-1 mb-1 text-xs rounded border border-slate-700" value={editProfileData.kaoyan.signal} onChange={e => setEditProfileData({...editProfileData, kaoyan: {...editProfileData.kaoyan, signal: parseInt(e.target.value)}})} />
                       </div>
                   </div>

                   <div className="flex justify-end gap-2">
                       <button onClick={() => setIsEditingProfile(false)} className="px-3 py-1 text-sm rounded hover:bg-slate-800">Cancel</button>
                       <button onClick={handleSaveProfile} className="px-3 py-1 bg-blue-600 text-sm rounded hover:bg-blue-500 flex items-center gap-1"><Save size={14}/> Save</button>
                   </div>
                </div>
            ) : (
                <>
                    <h1 className="text-5xl md:text-7xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-white drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                        Hello, I'm {profile.name}.
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-200/80 mb-8 font-light tracking-wide">
                        {profile.title}
                    </p>
                    <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                        {profile.intro}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto mb-12 text-left">
                        {/* CET-6 Card */}
                        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl hover:border-blue-500/50 transition duration-300 group">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:text-blue-300"><BookOpen size={24}/></div>
                                <h3 className="text-lg font-bold">CET-6 英语六级</h3>
                                <span className="ml-auto text-2xl font-bold text-blue-400">{profile.cet6.total}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="bg-slate-800/50 p-2 rounded">
                                    <div className="text-slate-500 text-xs">听力</div>
                                    <div className="font-mono">{profile.cet6.listening}</div>
                                </div>
                                <div className="bg-slate-800/50 p-2 rounded">
                                    <div className="text-slate-500 text-xs">阅读</div>
                                    <div className="font-mono">{profile.cet6.reading}</div>
                                </div>
                                <div className="bg-slate-800/50 p-2 rounded">
                                    <div className="text-slate-500 text-xs">写作/翻译</div>
                                    <div className="font-mono">{profile.cet6.writing}</div>
                                </div>
                            </div>
                        </div>

                        {/* Kaoyan Card */}
                        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl hover:border-purple-500/50 transition duration-300 group">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:text-purple-300"><Award size={24}/></div>
                                <h3 className="text-lg font-bold">研究生入学考试</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">政治</span>
                                    <span className="font-mono font-bold text-green-400">{profile.kaoyan.politics}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">英语一</span>
                                    <span className="font-mono font-bold text-green-400">{profile.kaoyan.english}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">数学一</span>
                                    <span className="font-mono font-bold text-blue-400">{profile.kaoyan.math}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                                    <span className="text-slate-400">841信号与系统</span>
                                    <span className="font-mono font-bold text-purple-400">{profile.kaoyan.signal}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Projects & Papers Preview */}
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
                {profile.projects.slice(0, 2).map(p => (
                     <div key={p.id} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                        <Code size={14} className="text-yellow-500"/>
                        <span>{p.name}</span>
                     </div>
                ))}
                 {profile.papers.slice(0, 2).map(p => (
                     <div key={p.id} className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
                        <FileText size={14} className="text-pink-500"/>
                        <span>{p.title}</span>
                     </div>
                ))}
            </div>
        </div>

        {/* Scroll Indicator */}
        <button onClick={scrollDown} className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-500 hover:text-white transition">
            <ChevronDown size={32} />
        </button>
      </header>

      {/* --- Blog & Details Section --- */}
      <section className="min-h-screen bg-slate-950 border-t border-slate-800 relative z-10 px-4 py-20">
          <div className="max-w-5xl mx-auto">
              
              <div className="flex justify-between items-end mb-12 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">My Notebook</h2>
                    <p className="text-slate-400">项目进展、论文笔记与随想。</p>
                  </div>
                  {isAdmin && (
                      <button onClick={() => setShowPostEditor(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition shadow-lg shadow-blue-500/20">
                          <Plus size={18}/> New Post
                      </button>
                  )}
              </div>

              {/* Post Editor Modal */}
              {showPostEditor && (
                   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                       <div className="bg-slate-900 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 shadow-2xl p-6">
                           <div className="flex justify-between items-center mb-6">
                               <h3 className="text-xl font-bold text-blue-400">Create New Post</h3>
                               <button onClick={() => setShowPostEditor(false)}><X size={24} className="text-slate-500 hover:text-white"/></button>
                           </div>
                           <input 
                                className="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-lg font-bold mb-4 focus:outline-none focus:border-blue-500" 
                                placeholder="文章标题"
                                value={newPost.title}
                                onChange={e => setNewPost({...newPost, title: e.target.value})}
                           />
                           <input 
                                className="w-full bg-slate-800 border border-slate-700 p-2 rounded-lg text-sm mb-4 focus:outline-none focus:border-blue-500" 
                                placeholder="Tags (e.g. AI, CV, Life)"
                                value={newPost.tags}
                                onChange={e => setNewPost({...newPost, tags: e.target.value})}
                           />
                           
                           {/* Custom Simple Editor */}
                           <SimpleEditor value={newPost.content} onChange={val => setNewPost({...newPost, content: val})} />

                           <div className="flex justify-end gap-3">
                               <button onClick={() => setShowPostEditor(false)} className="px-6 py-2 rounded-lg text-slate-400 hover:bg-slate-800">Discard</button>
                               <button onClick={handleSavePost} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500">Publish</button>
                           </div>
                       </div>
                   </div>
              )}

              {/* Blog List */}
              <div className="grid grid-cols-1 gap-8">
                  {posts.length === 0 ? (
                      <div className="text-center py-20 text-slate-600">
                          <Terminal size={48} className="mx-auto mb-4 opacity-20"/>
                          <p>Is this the void? Write something...</p>
                      </div>
                  ) : (
                      posts.map((post) => (
                          <article key={post.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition duration-300 group">
                              <div className="p-8">
                                  <div className="flex justify-between items-start mb-4">
                                      <div>
                                          <div className="flex gap-2 mb-2">
                                              {post.tags && post.tags.split(',').map((tag, i) => (
                                                  <span key={i} className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded">{tag.trim()}</span>
                                              ))}
                                          </div>
                                          <h3 className="text-2xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{post.title}</h3>
                                      </div>
                                      {isAdmin && (
                                          <button onClick={() => handleDeletePost(post.id)} className="text-slate-600 hover:text-red-500 p-2">
                                              <Trash2 size={18} />
                                          </button>
                                      )}
                                  </div>
                                  
                                  {/* Post Content */}
                                  <div className="text-slate-400 leading-relaxed mb-6 space-y-4">
                                      <MarkupContent html={post.content} />
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-800 pt-4">
                                      <span>Posted on {post.timestamp ? new Date(post.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                                      <span className="flex items-center gap-1"><User size={12}/> {post.author || 'Admin'}</span>
                                  </div>
                              </div>
                          </article>
                      ))
                  )}
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-600 text-sm border-t border-slate-900 relative z-10 bg-slate-950">
          <p>© {new Date().getFullYear()} {profile.name}. Built with React & Firebase.</p>
      </footer>
    </div>
  );
}