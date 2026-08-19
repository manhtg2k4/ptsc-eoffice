# AGENTS.md - BE_TTHC

AI agents working in this source must read this file before making changes. Follow the project rules from the project coding standard PDF and keep edits scoped to the requested task.

## Character Encoding

- All source files MUST remain encoded as UTF-8.
- NEVER change a file's character encoding.
- NEVER replace Vietnamese Unicode characters with corrupted text.
- Preserve all existing Vietnamese text exactly as it appears.
- When editing a file, modify only the requested content and leave all other Vietnamese text unchanged.
- If the encoding of a file is uncertain, stop and ask instead of rewriting the file.
- Do not normalize, re-encode, or escape Vietnamese Unicode characters.
- Never convert Vietnamese characters into HTML entities or Unicode escape sequences.

## Git Workflow

- Do not work directly on `main`, `develop`, or equivalent shared branches.
- Branch names must follow `project_<devname>_<name>_feature`, `project_<devname>_<name>_bugfix`, or `project_<devname>_<name>_hotfix`.
- Use lowercase, accent-free branch names. Do not use vague names like `fix`, `test`, `abc`.
- Every commit must trace to a task or issue.
- Commit messages must use one consistent format:
  - `[TASK-ID] type: short description`
  - `type: [TASK-ID] short description`
- Allowed commit types include `feat`, `fix`, `update`, `refactor`, `style`, `remove`, `optimize`, and `docs`.
- Never bypass commit verification with `git commit -n`, `--no-verify`, or similar flags.
- Do not merge PR/MR without review and approval.

## General Coding Rules

- Prefer clear, readable code over premature optimization.
- Use meaningful names. Avoid `a`, `data1`, `temp`, `test`, `utils2`, `newfile`, `fix`, or `abc` unless the meaning is explicit.
- Keep each change related to the requested task. Do not reformat or refactor unrelated code.
- Run the configured linter/formatter when relevant, but do not format whole unrelated files.
- Do not edit generated or dependency folders such as `dist/`, `node_modules/`, `coverage/`, `tmp/`, or uploaded runtime files unless explicitly requested.

## Backend Rules

- Follow the existing NestJS and TypeScript structure in this repository.
- Controllers must only handle request/response orchestration. Do not put complex business logic in controllers.
- Services contain business logic, but must use an existing repository/data-access layer when one already exists.
- Do not put all logic in a single file. Split modules, services, DTOs, entities, guards, decorators, helpers, or providers according to the current folder pattern.
- Each function should do one clear job. Split long or hard-to-follow functions before adding more branching.
- Do not introduce unnecessary abstractions; match the local module style first.
- Use `PascalCase` for classes and interfaces.
- Use `camelCase` for variables, functions, and methods.
- Use `UPPER_SNAKE_CASE` for constants.
- Keep file names aligned with the existing module naming pattern and the primary class/function they contain.

## Logging And Error Handling

- Logs must have a clear purpose.
- Never log secrets, tokens, passwords, personal data, or sensitive request payloads.
- Remove temporary debug logs before completing a task.
- Do not swallow errors. Empty `catch` blocks are not allowed.
- Error messages must be clear and include enough context for troubleshooting.
- Do not throw vague errors such as `Error("error")` or `throw err` without context when the code can add useful context.

## Validation

- Use the configured project commands:
  - `npm run lint`
  - `npm run format`
  - `npm run build`
  - `npm test`
- Run focused validation appropriate to the change. For broad or shared behavior, run broader tests.
- If validation cannot be run, report the reason clearly.
