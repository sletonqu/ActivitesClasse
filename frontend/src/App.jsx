
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

const AdminView = lazy(() => import("./views/AdminView"));
const TeacherView = lazy(() => import("./views/TeacherView"));
const StudentView = lazy(() => import("./views/StudentView"));
const ResultsView = lazy(() => import("./views/ResultsView"));

function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <span>Chargement...</span>
            </div>
          </div>
        }
      >
        <Routes>
          <Route path="/admin" element={<AdminView />} />
          <Route path="/teacher" element={<TeacherView />} />
          <Route path="/results" element={<ResultsView />} />
          <Route path="/" element={<StudentView />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
