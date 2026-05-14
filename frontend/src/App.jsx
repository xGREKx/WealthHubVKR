import { useState, useEffect, useCallback } from 'react';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import SearchPanel from './components/layout/SearchPanel.jsx';

import HomePage         from './pages/HomePage.jsx';
import LoginPage        from './pages/LoginPage.jsx';
import CabinetPage      from './pages/CabinetPage.jsx';
import FinancePage      from './pages/FinancePage.jsx';
import AnalyticsPage    from './pages/AnalyticsPage.jsx';
import MarketplacePage  from './pages/MarketplacePage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import ProjectEditPage  from './pages/ProjectEditPage.jsx';
import EntrepreneurPage from './pages/EntrepreneurPage.jsx';
import AdminPage        from './pages/AdminPage.jsx';
import AdminTicketsPage from './pages/AdminTicketsPage.jsx';
import AdminUsersPage   from './pages/AdminUsersPage.jsx';
import SupportPage      from './pages/SupportPage.jsx';
import FAQPage          from './pages/FAQPage.jsx';
import SocialPage       from './pages/SocialPage.jsx';
import SettingsPage     from './pages/SettingsPage.jsx';
import WithdrawPage     from './pages/WithdrawPage.jsx';

import { useAuth } from './contexts/AuthContext.jsx';
import { useToast } from './contexts/ToastContext.jsx';
import { projectsApi } from './api/client.js';

export default function App() {
  const { user, loading } = useAuth();
  const { showToast } = useToast();

  const [page, setPage]                       = useState('home');
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [editProjectId, setEditProjectId]     = useState(null);
  const [searchOpen, setSearchOpen]           = useState(false);
  const [authMode, setAuthMode]               = useState('login');

  const [projects, setProjects]               = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Версия портфеля — увеличивается после любого действия, меняющего баланс/инвестиции.
  // Страницы, зависящие от портфеля (Кабинет, Финансы, Аналитика), читают этот счётчик
  // и перезагружают данные.
  const [portfolioVersion, setPortfolioVersion] = useState(0);
  const bumpPortfolio = useCallback(() => setPortfolioVersion((v) => v + 1), []);

  const loadProjects = useCallback(async () => {
    try {
      setProjectsLoading(true);
      const data = await projectsApi.list({ page_size: 100 });
      setProjects(data.results || data);
    } catch (e) {
      showToast('Не удалось загрузить проекты. Проверьте, что backend запущен.', 'error');
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleNavigate = (target) => {
    const protectedPages = [
      'cabinet', 'finance', 'analytics', 'entrepreneur',
      'admin', 'admin-tickets', 'admin-users',
      'support', 'settings', 'withdraw',
    ];
    if (protectedPages.includes(target) && !user) {
      setAuthMode('login');
      setPage('login');
      return;
    }
    setPage(target);
  };

  const handleOpenProject = (projectOrId) => {
    const id = typeof projectOrId === 'object' ? projectOrId.id : projectOrId;
    setActiveProjectId(id);
    setPage('project');
    setSearchOpen(false);
  };

  const handleEditProject = (id) => {
    setEditProjectId(id);
    setPage('project-edit');
  };
  const handleCreateProject = () => {
    setEditProjectId(null);
    setPage('project-edit');
  };

  const handleOpenAuth = (mode) => {
    setAuthMode(mode);
    setPage('login');
  };

  const onAuthSuccess = (loggedUser) => {
    if (loggedUser.role === 'admin') setPage('admin');
    else if (loggedUser.role === 'entrepreneur') setPage('entrepreneur');
    else setPage('cabinet');
    showToast(`Добро пожаловать, ${loggedUser.first_name_ru || loggedUser.username}!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-muted text-sm">Загрузка...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <HomePage projects={projects} loading={projectsLoading} onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;

      case 'login':
        return <LoginPage initialMode={authMode} onAuthSuccess={onAuthSuccess} />;

      case 'marketplace':
        return <MarketplacePage projects={projects} loading={projectsLoading} onOpenProject={handleOpenProject} />;

      case 'project':
        if (!activeProjectId) { setPage('marketplace'); return null; }
        return (
          <ProjectDetailPage
            projectId={activeProjectId}
            onBack={() => setPage('marketplace')}
            onInvested={() => {
              loadProjects();
              bumpPortfolio();        // триггер обновления Кабинета/Финансов
              setPage('finance');
            }}
          />
        );

      case 'project-edit':
        if (!user || user.role !== 'entrepreneur') { setPage('home'); return null; }
        return (
          <ProjectEditPage
            projectId={editProjectId}
            onBack={() => setPage('entrepreneur')}
            onSaved={() => {
              loadProjects();
              setPage('entrepreneur');
            }}
          />
        );

      case 'cabinet':
        return <CabinetPage onNavigate={handleNavigate} portfolioVersion={portfolioVersion} />;

      case 'finance':
        if (user?.role === 'entrepreneur') {
          setPage('entrepreneur');
          return null;
        }
        return <FinancePage onNavigate={handleNavigate} onOpenProject={handleOpenProject} portfolioVersion={portfolioVersion} />;

      case 'analytics':
        if (user?.role === 'entrepreneur') { setPage('entrepreneur'); return null; }
        return <AnalyticsPage portfolioVersion={portfolioVersion} />;

      case 'entrepreneur':
        return <EntrepreneurPage
          onProjectsChanged={loadProjects}
          onOpenProject={handleOpenProject}
          onEditProject={handleEditProject}
          onCreateProject={handleCreateProject}
        />;

      case 'admin':           return <AdminPage onProjectsChanged={loadProjects} />;
      case 'admin-tickets':   return <AdminTicketsPage />;
      case 'admin-users':     return <AdminUsersPage />;

      case 'support':         return <SupportPage />;
      case 'settings':        return <SettingsPage />;
      case 'withdraw':        return <WithdrawPage onNavigate={handleNavigate} onTransacted={bumpPortfolio} />;

      case 'faq':             return <FAQPage />;
      case 'social':          return <SocialPage />;

      default:
        return <HomePage projects={projects} loading={projectsLoading} onNavigate={handleNavigate} onOpenProject={handleOpenProject} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper relative">
      <Header
        onNavigate={handleNavigate}
        onOpenSearch={() => setSearchOpen((s) => !s)}
        onOpenAuth={handleOpenAuth}
        currentPage={page}
        searchOpen={searchOpen}
      />

      <SearchPanel
        open={searchOpen}
        projects={projects}
        onSelectProject={handleOpenProject}
        onSelectSection={(id) => { handleNavigate(id); setSearchOpen(false); }}
        onClose={() => setSearchOpen(false)}
      />

      <main className="flex-1 flex flex-col">
        {renderPage()}
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
