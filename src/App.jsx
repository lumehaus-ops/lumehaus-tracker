Bidirectional Notes Visibility:

Any note added by Admin, Backup Admin, or Office Manager to a task or project is automatically visible to the assigned person
Any note added by the assigned person (MA, Doctor, Front Desk, VA) is automatically visible to Admin, Backup Admin, and their Office Manager
Notes display with: author name, role, timestamp — in a simple thread/feed format
Neither party needs to do anything extra — visibility is automatic based on assignment



➕ Also add this under Technical Specs:


Task/project notes are stored with task_id, author_id, author_role, note_text, and timestamp
On load, notes are filtered to show only notes where: the viewer is the assignee OR the viewer is an admin/manager with oversight of that task
No private notes on shared tasks — notes are always visible to both sides of the assignment
