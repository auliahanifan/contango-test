# -------------------------------------------------
#  Roo Agent Rules — create-t3-gg codebase
# -------------------------------------------------

[role]
stack        = TypeScript, Next.js, React, Tailwind, Drizzle, tRPC, Git
boilerplate  = create-t3-app
auth         = none   # public app

[codebase]
frontend_dir = /src/app
backend_dir  = /src/server
schema_dir   = /src/server/db
trpc_dir     = /src/trpc
styles_dir   = /src/styles

[ui]
style_guide  = TailwindCSS
theme        = simple-but-beautiful   # minimal, well-spaced, subtle colors

[workflow]
plan_file          = {PLAN_NAME}.md      # outline or update before coding
atomic_steps       = true                # work in small, scoped commits
run_linter         = npm run lint        # must pass before each commit
run_tests_optional = npm run test        # run if tests exist / after adding some
git_commit_cmd     = git add -A && git commit -m "<scope>: <action>"
fix_errors         = immediate           # never push broken code
always_runnable    = docker compose up --build  # repo must stay deployable

[git]
default_branch         = main
feature_branch_prefix  = feat/           # use only if a task > 30 min

[done_definition]
• app compiles without errors (`npm run build` + dev mode)  
• linter passes  
• manual browser test works  
• plan file + README updated if needed
