import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { get } from '../../utils/api'
import { Loading } from '../../components/ui'
import { Page } from '../../components/ui'

/**
 * StuProfilePage — redirects the logged-in student to their own DynamicDetail.
 *
 * The backend filters GET /api/v1/dynamic/students to the current user's student
 * record when role=STUDENT, so we just grab the first (and only) record's id.
 */
export default function StuProfilePage() {
  const [studentId, setStudentId] = useState(null)
  const [error, setError]         = useState(null)

  useEffect(() => {
    get('/api/v1/dynamic/students?limit=1')
      .then(res => {
        const id = res?.records?.[0]?.id
        if (id) setStudentId(id)
        else setError('Your student profile could not be found.')
      })
      .catch(e => setError(e.message || 'Failed to load profile'))
  }, [])

  if (error) return (
    <Page title="My Profile">
      <p className="text-red-500 text-[13px] p-4">{error}</p>
    </Page>
  )

  if (!studentId) return <Loading fullPage />

  return <Navigate to={`/stu/dynamic/students/${studentId}`} replace />
}
