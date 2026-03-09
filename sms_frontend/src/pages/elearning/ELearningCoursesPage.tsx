import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface Course {
  id: number
  title: string
  subject_name?: string
  school_class_name?: string
  teacher_name?: string
  is_active: boolean
}

export default function ELearningCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/elearning/courses/')
      .then(res => setCourses(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Courses</h1>
          <p className="text-slate-400 mt-1">Manage online course curriculum.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition font-medium shadow-lg shadow-emerald-500/20">
          Create Course
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course Title</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Class & Subject</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Teacher</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 animate-pulse font-medium">Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">No courses found.</td></tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-medium text-white">{course.title}</td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className="text-emerald-400 font-medium">{course.school_class_name}</span>
                    <span className="mx-2 text-slate-600">|</span>
                    <span className="text-slate-400">{course.subject_name}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{course.teacher_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      course.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition">View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
