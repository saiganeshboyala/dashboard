import { useState, useEffect } from 'react'
import { getPerformanceLeaderboard } from '../../utils/api'
import { getUser } from '../../utils/auth'
import { Loading } from './Loading'
import { TrendingUp, TrendingDown, Flame, Trophy, Zap, Target, Crown, Star } from 'lucide-react'

const PERIOD_LABELS = { week: 'This Week', month: 'This Month' }

// ── Podium Card (Top 3) ─────────────────────────────────────────────────────

const PODIUM = [
  {
    gradient: 'from-amber-400 via-yellow-400 to-amber-500',
    glow: 'shadow-[0_0_30px_rgba(251,191,36,0.3)]',
    ring: 'ring-2 ring-amber-300/60',
    badge: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    textColor: 'text-amber-700',
    bgColor: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
    icon: Crown,
    label: '1ST',
  },
  {
    gradient: 'from-slate-300 via-gray-300 to-slate-400',
    glow: 'shadow-[0_0_20px_rgba(148,163,184,0.25)]',
    ring: 'ring-2 ring-slate-300/60',
    badge: 'bg-gradient-to-br from-slate-400 to-gray-500',
    textColor: 'text-slate-600',
    bgColor: 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100',
    icon: Star,
    label: '2ND',
  },
  {
    gradient: 'from-orange-400 via-amber-500 to-orange-500',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.2)]',
    ring: 'ring-2 ring-orange-300/60',
    badge: 'bg-gradient-to-br from-orange-400 to-amber-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50',
    icon: Trophy,
    label: '3RD',
  },
]

function PodiumCard({ entry, style, isMe, maxScore }) {
  const Icon = style.icon
  const initials = (entry.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const barWidth = maxScore > 0 ? Math.max(8, (entry.score / maxScore) * 100) : 0

  return (
    <div className={`relative rounded-xl border ${style.bgColor} ${style.glow} p-3 transition-all hover:scale-[1.02] ${
      isMe ? 'ring-2 ring-blue-400' : ''
    }`}>
      {/* Rank badge */}
      <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 ${style.badge} text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1`}>
        <Icon size={10} />
        {style.label}
      </div>

      <div className="flex flex-col items-center mt-2">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold text-white bg-gradient-to-br ${style.gradient} ${style.ring} shadow-md mb-2`}>
          {initials}
        </div>

        {/* Name */}
        <div className="flex items-center gap-1 mb-0.5">
          <span className={`text-[12px] font-bold truncate max-w-[100px] ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
            {entry.name?.split(' ')[0]}
          </span>
          {isMe && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
        </div>

        {/* Score */}
        <div className="flex items-center gap-1 mb-2">
          <Zap size={12} className={style.textColor} />
          <span className={`text-[18px] font-black ${style.textColor}`}>{entry.score}</span>
          {entry.trend > 0 && <Flame size={12} className="text-orange-500" />}
        </div>

        {/* Score bar */}
        <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${style.gradient} transition-all duration-700`}
            style={{ width: `${barWidth}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 text-[9px] text-gray-500 font-medium">
          <span>{entry.submissions}s</span>
          <span className="text-gray-300">|</span>
          <span>{entry.interviews}i</span>
          {entry.placements > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-green-600">{entry.placements}p</span>
            </>
          )}
        </div>
      </div>

      {/* Trend */}
      {entry.trend !== 0 && (
        <div className={`absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold ${
          entry.trend > 0 ? 'text-green-600' : 'text-red-500'
        }`}>
          {entry.trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {entry.trend > 0 ? '+' : ''}{entry.trend}%
        </div>
      )}
    </div>
  )
}

// ── Row (Rank 4+) ────────────────────────────────────────────────────────────

function LeaderboardRow({ entry, isMe, maxScore, animDelay }) {
  const initials = (entry.name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  const barWidth = maxScore > 0 ? Math.max(5, (entry.score / maxScore) * 100) : 0
  const colors = [
    'bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-teal-100 text-teal-700',
    'bg-pink-100 text-pink-700', 'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700',
  ]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-gray-50 ${
        isMe ? 'bg-blue-50/70 border-l-3 border-l-blue-500' : ''
      }`}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Rank */}
      <span className="w-6 text-center text-[12px] font-bold text-gray-400">
        {entry.rank}
      </span>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${colors[(entry.rank - 1) % colors.length]}`}>
        {initials}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[12px] font-semibold truncate ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
            {entry.name}
          </span>
          {isMe && <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
          {entry.trend > 20 && <Flame size={11} className="text-orange-500 shrink-0" />}
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-[9px] text-gray-400 font-medium shrink-0">
        <span>{entry.submissions}s</span>
        <span>{entry.interviews}i</span>
        {entry.placements > 0 && <span className="text-green-600">{entry.placements}p</span>}
      </div>

      {/* Score + trend */}
      <div className="text-right shrink-0 w-12">
        <div className="text-[13px] font-bold text-gray-700">{entry.score}</div>
        {entry.trend !== 0 && (
          <div className={`flex items-center justify-end gap-0.5 text-[9px] font-medium ${
            entry.trend > 0 ? 'text-green-600' : 'text-red-500'
          }`}>
            {entry.trend > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {entry.trend > 0 ? '+' : ''}{entry.trend}%
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function Leaderboard({ className = '' }) {
  const user = getUser()
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPerformanceLeaderboard(period)
      .then(res => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period])

  const leaderboard = data?.leaderboard || []
  const myRecId = user?.recruiterId
  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)
  const maxScore = leaderboard[0]?.score || 1

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Trophy size={16} className="text-amber-300" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-white">Leaderboard</h3>
              <p className="text-[10px] text-indigo-200">Top performers ranked by activity</p>
            </div>
          </div>
          <div className="flex bg-white/15 backdrop-blur rounded-lg p-0.5">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                  period === key
                    ? 'bg-white text-indigo-700 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-200">
            <Target size={10} /> <span>Submissions <b className="text-white">x1</b></span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-200">
            <Zap size={10} /> <span>Interviews <b className="text-white">x2</b></span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-200">
            <Flame size={10} /> <span>Placements <b className="text-white">x5</b></span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12"><Loading /></div>
      ) : leaderboard.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-[14px] font-semibold text-gray-600 mb-1">No activity yet</p>
          <p className="text-[12px] text-gray-400">Start submitting to claim the top spot!</p>
        </div>
      ) : (
        <>
          {/* Podium — Top 3 */}
          {top3.length > 0 && (
            <div className={`grid gap-3 p-4 bg-gradient-to-b from-gray-50 to-white ${
              top3.length === 1 ? 'grid-cols-1 max-w-[200px] mx-auto' :
              top3.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {top3.map((entry, i) => (
                <PodiumCard
                  key={entry.id}
                  entry={entry}
                  style={PODIUM[i]}
                  isMe={entry.id === myRecId}
                  maxScore={maxScore}
                />
              ))}
            </div>
          )}

          {/* Rest of the pack */}
          {rest.length > 0 && (
            <div className="border-t border-gray-100">
              <div className="px-4 py-2 bg-gray-50/80">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Chasing the podium</span>
              </div>
              <div className="divide-y divide-gray-50">
                {rest.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.id}
                    entry={entry}
                    isMe={entry.id === myRecId}
                    maxScore={maxScore}
                    animDelay={i * 50}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
