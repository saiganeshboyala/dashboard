import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { getHomePath } from '../../utils/auth'

export default function AccessDeniedPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-card p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-5">
          <ShieldOff size={26} className="text-danger-500" />
        </div>
        <h1 className="text-[22px] font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-[13px] text-gray-500 mb-8">
          You don't have permission to view this page. Contact your administrator if you believe this is a mistake.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Go back
          </button>
          <button
            onClick={() => navigate(getHomePath())}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-[13px] font-medium hover:bg-brand-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
