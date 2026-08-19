# AGENTS.md - FE_TTHC

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
- Do not edit generated or dependency folders such as `build/`, `node_modules/`, or coverage output unless explicitly requested.

## Frontend Rules

- Use the existing React, MUI, styled-components, Redux, and routing patterns already present in this codebase.
- Components use `PascalCase`; hooks start with `use`; Redux slices and regular JS files use `camelCase`.
- API calls must go through `axiosInstance`, `api`, or the existing service layer. Do not hardcode API domains or shared constants in components.
- Do not use `console.log` in committed code. Use the project logger/global logging helper when logging is required.
- Split non-trivial component logic into hooks or helper functions. Avoid adding inline functions when a named handler/hook is clearer.
- Use ESLint and Prettier according to project configuration.

## Style And Theme Rules

- Do not add new inline styles (`style={{ ... }}`) or `<style>` blocks for normal UI work.
- Style components must inherit from `src/styles/SkyStyles.js` or existing files under `src/styles` / local `componentStyle` or `.styles.js` files.
- When a new styled component is needed, extend the existing Sky base components such as `SkyBox`, `SkyTypography`, `SkyButton`, `SkyTextField`, `SkyDialog`, or other project base components.
- Use `theme.palette`, `theme.spacing`, and theme values instead of hardcoded colors or one-off visual constants.
- Inline style is allowed only for legacy code preservation or truly dynamic runtime values that cannot be expressed cleanly in styled components; keep it minimal and localized.
- Prefer `max-width`, `flex`, `grid`, `width: 100%`, `min-width: 0`, and `overflow` for responsive layout.
- Use `rem`, `em`, `%`, `vh`, or `vw` for scalable UI values. Do not add fixed `px` font sizes in new code.
- Avoid `white-space: nowrap` unless overflow is handled on mobile.
- Tables must support horizontal overflow when needed. Dialogs and popups must resize correctly on mobile.

## Project Structure

- Keep shared/base UI in `src/components`.
- Keep theme and reusable styled components in `src/styles`.
- Keep Redux state in `src/redux`.
- Keep route configuration in the existing route folders.
- Keep helpers in `src/utils` or the matching existing utility folder.

## Validation

- After modifying code in any file, always run ESLint checks on the modified files before completing the task.
- For build-impacting changes, run `npm run build` when feasible.
- For behavior changes with tests, run `npm test` or the relevant focused test command.
- If validation cannot be run, report the reason clearly.
