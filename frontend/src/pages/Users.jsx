import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'

function Users() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'user',
    department: ''
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers()
    }
  }, [user])

  const loadUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    try {
      await api.post('/users', formData)
      setFormData({
        name: '',
        username: '',
        password: '',
        role: 'user',
        department: ''
      })
      setShowForm(false)
      loadUsers()
    } catch (error) {
      setFormError(error.response?.data?.error || 'Personel oluşturulamadı')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (userId, userName) => {
    if (!confirm(`${userName} adlı personeli silmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      console.log('Deleting user:', userId)
      const response = await api.delete(`/users/${userId}`)
      console.log('Delete response:', response)
      loadUsers()
    } catch (error) {
      console.error('Delete error:', error)
      console.error('Error response:', error.response)
      alert(error.response?.data?.error || error.message || 'Personel silinemedi')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Personeller</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="glass-button"
        >
          {showForm ? '✕ İptal' : '+ Yeni Personel'}
        </button>
      </div>

      {/* New User Form */}
      {showForm && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Personel Ekle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-100/50 backdrop-blur-sm border border-red-300/50 rounded-xl p-4 text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kullanıcı Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Örn: ahmet_yilmaz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Şifre <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-input w-full"
                  placeholder="En az 6 karakter"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, department: '' })}
                  className="glass-input w-full"
                  required
                >
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Departman <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="glass-input w-full"
                    required
                  >
                    <option value="">Seçiniz</option>
                    <option value="Ön repro">Ön repro</option>
                    <option value="Repro">Repro</option>
                    <option value="Kalite">Kalite</option>
                    <option value="Kolaj">Kolaj</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={formLoading}
                className="glass-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormError('')
                  setFormData({
                    name: '',
                    username: '',
                    password: '',
                    role: 'user',
                    department: ''
                  })
                }}
                className="glass-button bg-gray-100/30 text-gray-700 hover:bg-gray-100/40"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card p-6">
        {users.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Personel bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ad Soyad</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Kullanıcı Adı</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rol</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Departman</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Oluşturma Tarihi</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/10 hover:bg-white/10">
                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{u.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{u.username}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        u.role === 'admin'
                          ? 'bg-purple-100/50 text-purple-800'
                          : 'bg-blue-100/50 text-blue-800'
                      }`}>
                        {u.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{u.department || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="px-3 py-1 rounded-lg bg-red-100/30 text-red-700 hover:bg-red-100/40 transition-all duration-200 text-xs font-medium"
                          title="Personeli Sil"
                        >
                          🗑️ Sil
                        </button>
                      )}
                      {u.id === user.id && (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Users


