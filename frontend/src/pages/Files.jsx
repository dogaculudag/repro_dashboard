import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'

function Files() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [files, setFiles] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    customer: '',
    siparis_no: '',
    sap_no: '',
    baski_malz: '',
    department: 'Flexible'
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const response = await api.get('/files', {
        params: search ? { search } : {}
      })
      setFiles(response.data)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFiles()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    // Validate required fields
    if (!formData.customer || formData.customer.trim() === '') {
      setFormError('Müşteri alanı zorunludur')
      setFormLoading(false)
      return
    }

    try {
      console.log('Submitting form data:', formData)
      const response = await api.post('/files', formData)
      console.log('File created:', response.data)
      setFormData({
        customer: '',
        siparis_no: '',
        sap_no: '',
        baski_malz: '',
        department: 'Flexible'
      })
      setShowForm(false)
      loadFiles()
    } catch (error) {
      console.error('Error creating file:', error)
      console.error('Error response:', error.response)
      setFormError(error.response?.data?.error || error.message || 'Dosya oluşturulamadı')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (fileId, fileIdDisplay) => {
    if (!confirm(`"${fileIdDisplay}" dosyasını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }

    try {
      console.log('Deleting file:', fileId)
      const response = await api.delete(`/files/${fileId}`)
      console.log('Delete response:', response)
      loadFiles()
    } catch (error) {
      console.error('Delete error:', error)
      console.error('Error response:', error.response)
      alert(error.response?.data?.error || error.message || 'Dosya silinirken hata oluştu')
    }
  }

  if (loading && files.length === 0) {
    return <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
  }

  // Check if user can create files (Admin or Ön repro user)
  const canCreateFile = user?.role === 'admin' || user?.department === 'Ön repro'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dosyalar</h1>
        {canCreateFile && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="glass-button"
          >
            {showForm ? '✕ İptal' : '+ Yeni Dosya'}
          </button>
        )}
      </div>

      {/* New File Form */}
      {showForm && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Dosya Ekle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-100/50 backdrop-blur-sm border border-red-300/50 rounded-xl p-4 text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Müşteri <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Müşteri adı"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sipariş No
                </label>
                <input
                  type="text"
                  value={formData.siparis_no}
                  onChange={(e) => setFormData({ ...formData, siparis_no: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Örn: SIP-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SAP No
                </label>
                <input
                  type="text"
                  value={formData.sap_no}
                  onChange={(e) => setFormData({ ...formData, sap_no: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Örn: SAP-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baskı Malz.
                </label>
                <input
                  type="text"
                  value={formData.baski_malz}
                  onChange={(e) => setFormData({ ...formData, baski_malz: e.target.value })}
                  className="glass-input w-full"
                  placeholder="Baskı malzemesi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departman
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="glass-input w-full"
                >
                  <option value="Flexible">Flexible</option>
                  <option value="Tobacco">Tobacco</option>
                </select>
              </div>
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
                    customer_no: '',
                    silindir_boyu: '',
                    silindir_capi: ''
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

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input w-full max-w-md"
          placeholder="Müşteri veya SAP No ile ara..."
        />
      </div>

      <div className="glass-card p-6">
        {files.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Dosya bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">SAP No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Müşteri</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sipariş No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Baskı Malz.</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Departman</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sorumlu</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Durum</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Oluşturma</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => navigate(`/files/${file.id}`)}
                    className="border-b border-white/10 hover:bg-white/10 cursor-pointer"
                  >
                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{file.sap_no || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{file.customer || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{file.siparis_no || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{file.baski_malz || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{file.current_department}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{file.owner_name || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        file.status === 'Completed'
                          ? 'bg-green-100/50 text-green-800'
                          : file.status === 'InProgress'
                          ? 'bg-blue-100/50 text-blue-800'
                          : 'bg-yellow-100/50 text-yellow-800'
                      }`}>
                        {file.status === 'Completed' ? 'Tamamlandı' : 
                         file.status === 'InProgress' ? 'İşleniyor' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(file.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(file.id, file.sap_no || '-')
                        }}
                        className="px-3 py-1 rounded-lg bg-red-100/30 text-red-700 hover:bg-red-100/40 transition-all duration-200 text-xs font-medium"
                        title="Dosyayı Sil"
                      >
                        🗑️ Sil
                      </button>
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

export default Files


