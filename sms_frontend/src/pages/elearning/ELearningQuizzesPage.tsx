import { useEffect, useState } from 'react'
import { apiClient } from '../../api/client'

interface Quiz {
  id: number
  title: string
  course_name?: string
  total_marks: number
  pass_percentage: number
  is_active: boolean
}

export default function ELearningQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/elearning/quizzes/')
      .then(res => setQuizzes(res.data.results || res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Quizzes</h1>
          <p className="text-slate-400 mt-1">Assess student knowledge through online tests.</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl transition font-medium shadow-lg shadow-emerald-500/20">
          Create Quiz
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/40">
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Quiz Title</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Course</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Total Marks</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Pass %</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 animate-pulse font-medium">Loading quizzes...</td></tr>
            ) : quizzes.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">No quizzes found.</td></tr>
            ) : (
              quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 font-medium text-white">{quiz.title}</td>
                  <td className="px-6 py-4 text-slate-300 font-medium uppercase tracking-wider text-[11px]">{quiz.course_name}</td>
                  <td className="px-6 py-4 text-slate-300 font-bold">{quiz.total_marks}</td>
                  <td className="px-6 py-4 text-slate-300">{quiz.pass_percentage}%</td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      quiz.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {quiz.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition">Take Quiz</button>
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
