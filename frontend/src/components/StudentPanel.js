import React from 'react';

const StudentPanel = ({
  students,
  selectedStudent,
  scoresByStudentId,
  selectedGroup,
  onStudentClick,
  selectedClassId,
  selectedActivityId
}) => {
  if (!selectedClassId) {
    return (
      <div className="glass-panel p-6 text-center animate-in fade-in slide-in-from-bottom duration-500">
        <p className="text-slate-500 text-sm font-medium">Sélectionnez une classe active</p>
      </div>
    );
  }

  if (!selectedActivityId) {
    return (
      <div id="student-panel-empty-activity" className="glass-panel p-6 text-center animate-in fade-in slide-in-from-bottom duration-500">
        <p className="text-slate-500 text-sm font-medium">Sélectionnez une activité pour voir les élèves</p>
      </div>
    );
  }

  return (
    <div id="student-panel-root" className="glass-panel p-2 flex flex-col gap-2 animate-in fade-in slide-in-from-left duration-700 h-full overflow-hidden">
      <div id="student-panel-header" className="flex items-center justify-center border-b border-white/20 pb-2">
        <h3 id="student-panel-title" className="text-base font-bold text-slate-800 font-manrope text-center">
          {selectedGroup ? selectedGroup.name : "Élèves"}
        </h3>
      </div>

      {students.length > 0 ? (
        <ul id="student-panel-list" className="mt-auto flex flex-1 flex-col justify-end gap-2 overflow-y-auto overflow-x-hidden pr-2 pb-4 custom-scrollbar">
          {students.map((student, index) => {
            const isCompleted = scoresByStudentId[student.id] !== undefined;
            const isSelected = selectedStudent?.id === student.id;

            return (
              <li
                id={`student-item-${student.id}`}
                key={student.id}
                onClick={() => !isCompleted && onStudentClick(student)}
                className={`
                  group relative flex items-center px-2 py-2 rounded-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-95
                  ${isCompleted
                    ? "bg-slate-100/30 pointer-events-none opacity-80"
                    : isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "bg-white/40 hover:bg-white/80 text-slate-700 hover:scale-[1.02] active:scale-95"
                  }
                `}
              >
                <span className={`text-sm font-bold ${isCompleted ? 'text-slate-400' :
                    isSelected ? 'text-white' : 'text-slate-700'
                  }`}>
                  {student.firstname}
                </span>

                {isCompleted && (
                  <div className="ml-auto">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {!isCompleted && !isSelected && (
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 text-center bg-white/20 rounded-xl border border-dashed border-white/40">
          <p className="text-slate-500 text-xs font-medium px-4">
            {selectedGroup
              ? "Aucun élève dans ce groupe"
              : "Aucun élève dans cette classe"}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentPanel;
