import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', adminOnly: true },
    { path: '/queue', label: 'Departman Kuyruğu', icon: '📋', adminOnly: false },
    { path: '/files', label: 'Dosyalar', icon: '📁', adminOnly: false },
    { path: '/users', label: 'Personeller', icon: '👥', adminOnly: true },
  ]

  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && user.role !== 'admin') return false
    if (item.deptOnly && user.department !== item.deptOnly && user.role !== 'admin') return false
    return true
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 glass-card m-4 rounded-2xl p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Repro Demo</h1>
          <p className="text-sm text-gray-600">{user.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {user.role === 'admin' ? 'Admin' : user.department}
          </p>
        </div>

        <nav className="flex-1 space-y-2">
          {visibleMenuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                location.pathname === item.path
                  ? 'bg-white/30 backdrop-blur-md text-gray-800 font-medium'
                  : 'text-gray-700 hover:bg-white/20'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto px-4 py-3 rounded-xl bg-red-100/30 backdrop-blur-md text-red-700 hover:bg-red-100/40 transition-all duration-200"
        >
          Çıkış Yap
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="glass-card p-8 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout


