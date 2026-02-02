import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'

function DepartmentQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [waitingFiles, setWaitingFiles] = useState([])
  const [myFiles, setMyFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFiles()
  }, [user])

  const loadFiles = async () => {
    try {
      const response = await api.get('/files', {
        params: { department: user.department }
      })
      
      const files = response.data
      setWaitingFiles(files.filter(f => f.status === 'Waiting'))
      setMyFiles(files.filter(f => f.status === 'InProgress' && Number(f.current_owner_user_id) === Number(user.id)))
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTake = async (fileId) => {
    try {
      await api.post(`/files/${fileId}/take`)
      loadFiles()
    } catch (error) {
      alert(error.response?.data?.error || 'Hata oluştu')
    }
  }

  const handleTransfer = async (fileId) => {
    try {
      await api.post(`/files/${fileId}/transfer`)
      loadFiles()
    } catch (error) {
      alert(error.response?.data?.error || 'Hata oluştu')
    }
  }

  const handleComplete = async (fileId) => {
    try {
      await api.post(`/files/${fileId}/complete`)
      loadFiles()
    } catch (error) {
      alert(error.response?.data?.error || 'Hata oluştu')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Yükleniyor...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Departman Kuyruğu - {user.department}
      </h1>

      {/* Waiting Files */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Bekleyen Dosyalar</h2>
        {waitingFiles.length === 0 ? (
          <p className="text-gray-600">Bekleyen dosya yok.</p>
        ) : (
          <div className="space-y-3">
            {waitingFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{file.sap_no || '-'}</div>
                  <div className="text-sm text-gray-600">Müşteri: {file.customer || '-'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {file.siparis_no && `Sipariş: ${file.siparis_no}`}
                  </div>
                </div>
                <button
                  onClick={() => handleTake(file.id)}
                  className="glass-button ml-4"
                >
                  Üzerime Al
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Files */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Üzerimde</h2>
        {myFiles.length === 0 ? (
          <p className="text-gray-600">Üzerinizde dosya yok.</p>
        ) : (
          <div className="space-y-3">
            {myFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{file.sap_no || '-'}</div>
                  <div className="text-sm text-gray-600">Müşteri: {file.customer || '-'}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {file.siparis_no && `Sipariş: ${file.siparis_no}`}
                  </div>
                </div>
                <div className="flex gap-3 ml-4">
                  {file.current_department === 'Kolaj' ? (
                    <button
                      onClick={() => handleComplete(file.id)}
                      className="glass-button bg-green-100/30 text-green-800 hover:bg-green-100/40"
                    >
                      Bitir
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTransfer(file.id)}
                      className="glass-button bg-blue-100/30 text-blue-800 hover:bg-blue-100/40"
                    >
                      Bitir & Devret
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/files/${file.id}`)}
                    className="glass-button"
                  >
                    Detay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DepartmentQueue

