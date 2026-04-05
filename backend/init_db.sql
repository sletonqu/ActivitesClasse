-- SQL de création des tables pour Ma Classe Interactive
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacher_id INTEGER,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  class_id INTEGER NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_name_class
ON groups(name, class_id);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  firstname TEXT NOT NULL,
  class_id INTEGER,
  group_id INTEGER,
  FOREIGN KEY (class_id) REFERENCES classes(id),
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_name_firstname
ON students(name, firstname);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  status TEXT,
  js_file TEXT
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER,
  activity_id INTEGER,
  score INTEGER,
  completed_at TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);
