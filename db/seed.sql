INSERT INTO members( name) VALUES
('ALICE'),
('PEDRO'),
('JOHNNY');


INSERT INTO tasks (title, member_id, status, due_date) VALUES
('Task 1', 1, 'pending', '2026-12-25'),
('Task 2', 2, 'in_progress', '2026-12-10'),
('Task 3', 3, 'done', '2026-12-15'),
('Task 1', 1, 'done', '2026-12-31'),
('Task 2', 2, 'pending', '2026-10-15'),
('Task 3', 3, 'in_progress', '2026-10-31');

UPDATE tasks SET created_at = '2026-10-01 09:00:00-03';
UPDATE tasks SET completed_at = '2026-10-10 19:00:00-03' WHERE status = 'done';