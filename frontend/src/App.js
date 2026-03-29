
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminView from "./views/AdminView";
import TeacherView from "./views/TeacherView";
import StudentView from "./views/StudentView";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminView />} />
        <Route path="/teacher" element={<TeacherView />} />
        <Route path="/" element={<StudentView />} />
      </Routes>
    </Router>
  );
}

export default App;
