import React from 'react';

const LeaderboardPanel = ({ 
  leaderboard, 
  selectedClassId, 
  selectedActivityId, 
  onExport 
}) => {
  if (!selectedClassId || !selectedActivityId) {
    return (
      <div className="glass-panel p-6 text-center animate-in fade-in slide-in-from-bottom duration-500">
        <p className="text-slate-500 text-sm font-medium">Sélectionnez une activité pour voir le classement</p>
      </div>
    );
  }

  return (
    <div id="leaderboard-panel-root" className="glass-panel p-2 flex flex-col gap-2 animate-in fade-in slide-in-from-right duration-700 h-full overflow-hidden">
      <div id="leaderboard-panel-header" className="flex items-center justify-center border-b border-white/20 pb-2">
        <h3 id="leaderboard-panel-title" className="text-base font-bold text-slate-800 font-manrope text-center">Classement</h3>
      </div>

      {leaderboard.length > 0 ? (
        <ol id="leaderboard-panel-list" className="space-y-2 overflow-y-auto overflow-x-hidden pr-2 pb-4 custom-scrollbar">
          {leaderboard.map((student, index) => (
            <li
              id={`leaderboard-item-${student.id}`}
              key={student.id}
              className="flex items-center justify-between px-2 py-2 bg-white/40 border border-white/40 rounded-lg hover:bg-white/60 transition-all group hover:scale-[1.02]"
            >
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <span className="text-[10px] font-black text-slate-300 group-hover:text-indigo-400 transition-colors w-3 shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm font-bold text-slate-700 truncate">
                  {student.firstname}
                </span>
              </div>
              <div className="bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0 hidden group-hover:flex animate-in fade-in zoom-in-95 duration-200">
                <span className="text-xs font-black text-indigo-600">{student.score}/20</span>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center bg-white/20 rounded-xl border border-dashed border-white/40 gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-400 text-xs font-medium italic">
            En attente de premiers résultats
          </p>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPanel;
