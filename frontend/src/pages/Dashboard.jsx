import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== 'admin') {
      return
    }

    loadStats()
  }, [user])

  const loadStats = async () => {
    try {
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Bu sayfaya sadece admin erişebilir.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
  }

  if (!stats) {
    return <div className="text-center py-12 text-gray-600">Veri yüklenemedi.</div>
  }

  const formatMinutes = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} dk`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}s ${mins}dk`
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="text-sm text-gray-600 mb-2">Aktif Dosya</div>
          <div className="text-3xl font-bold text-gray-800">{stats.active_files}</div>
        </div>

        <div className="glass-card p-6">
          <div className="text-sm text-gray-600 mb-2">Bugün Tamamlanan</div>
          <div className="text-3xl font-bold text-gray-800">{stats.today_completed}</div>
        </div>

        <div className="glass-card p-6">
          <div className="text-sm text-gray-600 mb-2">Ön repro</div>
          <div className="text-3xl font-bold text-gray-800">{stats.by_department['Ön repro'] || 0}</div>
        </div>

        <div className="glass-card p-6">
          <div className="text-sm text-gray-600 mb-2">Repro</div>
          <div className="text-3xl font-bold text-gray-800">{stats.by_department['Repro'] || 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6">
          <div className="text-sm text-gray-600 mb-2">Kalite</div>
          <div className="text-3xl font-bold text-gray-800">{stats.by_department['Kalite'] || 0}</div>
        </div>

        <div className="glass-card p-6">
          <div className="text-sm text-gray-600 mb-2">Kolaj</div>
          <div className="text-3xl font-bold text-gray-800">{stats.by_department['Kolaj'] || 0}</div>
        </div>
      </div>

      {/* Chart */}
      {stats.last_7_days && stats.last_7_days.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Son 7 Gün Tamamlanan Dosyalar</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.last_7_days}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255,255,255,0.9)', 
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px'
                }} 
              />
              <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Longest Waiting Files */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">En Uzun Bekleyen 10 Dosya</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SAP No</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Müşteri</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Departman</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bekleme Süresi</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Durum</th>
              </tr>
            </thead>
            <tbody>
              {stats.longest_waiting.map((file) => (
                <tr key={file.id} className="border-b border-white/10 hover:bg-white/10">
                  <td className="py-3 px-4 text-sm text-gray-800">{file.sap_no || '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{file.customer || '-'}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{file.current_department}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatMinutes(file.waiting_minutes)}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      file.status === 'Waiting' 
                        ? 'bg-yellow-100/50 text-yellow-800' 
                        : 'bg-blue-100/50 text-blue-800'
                    }`}>
                      {file.status === 'Waiting' ? 'Bekliyor' : 'İşleniyor'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard


