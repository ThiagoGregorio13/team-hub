CREATE TABLE members(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE tasks(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  member_id INTEGER NOT NULL REFERENCES members(id),
  status TEXT NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);