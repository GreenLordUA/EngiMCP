# Acceptance Checklist for the MVP

- [x] `engi_project_init` creates a project.
- [x] `engi_doc_read` reads a document by ID.
- [x] `engi_doc_patch_section` changes only the target section.
- [x] `engi_validate_project` catches duplicate IDs.
- [x] `engi_validate_project` catches broken links.
- [x] `engi_impact_analyze` returns transitive dependencies.
- [x] `engi_context_pack` returns relevant documents with reasons.
- [x] read-only mode blocks write tools.
- [x] path traversal is impossible.
- [x] symlink outside root is impossible.
- [x] audit log is written after a write.
- [x] git status shows changed files.
