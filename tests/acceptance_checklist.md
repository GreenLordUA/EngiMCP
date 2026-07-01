# Acceptance Checklist for the MVP

- [ ] `engi_project_init` creates a project.
- [ ] `engi_doc_read` reads a document by ID.
- [ ] `engi_doc_patch_section` changes only the target section.
- [ ] `engi_validate_project` catches duplicate IDs.
- [ ] `engi_validate_project` catches broken links.
- [ ] `engi_impact_analyze` returns transitive dependencies.
- [ ] `engi_context_pack` returns relevant documents with reasons.
- [ ] read-only mode blocks write tools.
- [ ] path traversal is impossible.
- [ ] symlink outside root is impossible.
- [ ] audit log is written after a write.
- [ ] git status shows changed files.
