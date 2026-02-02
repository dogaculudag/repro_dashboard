import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'

function FileDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFile()
  }, [id])

  const loadFile = async () => {
    try {
      const response = await api.get(`/files/${id}`)
      setFile(response.data)
    } catch (error) {
      console.error('Error loading file:', error)
      if (error.response?.status === 403) {
        alert('Bu dosyaya erişim yetkiniz yok')
        navigate('/files')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatMinutes = (minutes) => {
    if (!minutes || minutes === 0) return '-'
    if (minutes < 60) return `${Math.round(minutes)} dakika`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours} saat ${mins} dakika`
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('tr-TR')
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
  }

  if (!file) {
    return <div className="text-center py-12 text-gray-600">Dosya bulunamadı.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dosya Detay</h1>
        <button
          onClick={() => navigate('/files')}
          className="glass-button"
        >
          ← Geri
        </button>
      </div>

      {/* File Info */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Dosya Bilgileri</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">SAP No</div>
            <div className="text-lg font-semibold text-gray-800">{file.sap_no || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Müşteri</div>
            <div className="text-lg font-semibold text-gray-800">{file.customer || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Sipariş No</div>
            <div className="text-lg text-gray-800">{file.siparis_no || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Baskı Malz.</div>
            <div className="text-lg text-gray-800">{file.baski_malz || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Departman</div>
            <div className="text-lg text-gray-800">{file.department || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Mevcut Departman</div>
            <div className="text-lg font-semibold text-gray-800">{file.current_department}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Sorumlu Kişi</div>
            <div className="text-lg text-gray-800">{file.owner_name || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Durum</div>
            <div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                file.status === 'Completed'
                  ? 'bg-green-100/50 text-green-800'
                  : file.status === 'InProgress'
                  ? 'bg-blue-100/50 text-blue-800'
                  : 'bg-yellow-100/50 text-yellow-800'
              }`}>
                {file.status === 'Completed' ? 'Tamamlandı' : 
                 file.status === 'InProgress' ? 'İşleniyor' : 'Bekliyor'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Oluşturma Tarihi</div>
            <div className="text-lg text-gray-800">{formatDate(file.created_at)}</div>
          </div>
        </div>
      </div>

      {/* Department Times */}
      {file.department_times && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Departman Bazlı Süreler</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Ön repro', 'Repro', 'Kalite', 'Kolaj'].map((dept) => {
              const times = file.department_times[dept]
              return (
                <div key={dept} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="text-sm font-semibold text-gray-800 mb-2">{dept}</div>
                  <div className="text-xs text-gray-600 mb-1">Bekleme:</div>
                  <div className="text-sm text-gray-800 mb-3">
                    {formatMinutes(times?.waiting_time)}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">İşleme:</div>
                  <div className="text-sm text-gray-800">
                    {formatMinutes(times?.processing_time)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Event Log */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">İşlem Geçmişi</h2>
        <div className="space-y-3">
          {file.event_logs && file.event_logs.length > 0 ? (
            file.event_logs.map((log) => (
              <div
                key={log.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-start gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800">{log.type}</span>
                    {log.from_department && log.to_department && (
                      <span className="text-sm text-gray-600">
                        {log.from_department} → {log.to_department}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {log.user_name} - {formatDate(log.timestamp)}
                  </div>
                  {log.note && (
                    <div className="text-sm text-gray-700 mt-1">{log.note}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-600">İşlem geçmişi bulunamadı.</p>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      {user?.role === 'admin' && file.status !== 'Completed' && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Admin İşlemleri</h2>
          <button
            onClick={async () => {
              if (confirm('Dosya sahibini sıfırlamak istediğinize emin misiniz?')) {
                try {
                  await api.post(`/files/${id}/reset`)
                  loadFile()
                } catch (error) {
                  alert(error.response?.data?.error || 'Hata oluştu')
                }
              }
            }}
            className="glass-button bg-orange-100/30 text-orange-800 hover:bg-orange-100/40"
          >
            Sorumluyu Sıfırla
          </button>
        </div>
      )}
    </div>
  )
}

export default FileDetail


