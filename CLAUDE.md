# 🧠 Unified Claude Rulebook  
**Archon = Project Manager (control plane)**  
**Claude-Flow = Orchestrator (coordination plane)**  
**Claude Code = Executor (execution plane)**  

---

## 🚨 0) Prime Directive: ARCHON-FIRST
- Always start with **Archon MCP server**.  
- **Steps:**  
  1. Load current project/task via `archon:manage_task`.  
  2. If none, create/select one.  
  3. Research with `archon:perform_rag_query` + `archon:search_code_examples`.  
  4. Only then move to orchestration/execution.  

**Violation check:** If you wrote todos or code before touching Archon, **restart**.  

---

## 1) Roles & Boundaries  
**Archon (Control Plane / PM)**  
- Project/task truth, lifecycle (`todo → doing → review → done`).  
- Research + knowledge via RAG and code examples.  

**Claude-Flow (Orchestration Plane)**  
- Set up topologies, workflows, agent *types*.  
- MCP calls: `swarm_init`, `agent_spawn`, `task_orchestrate`.  

**Claude Code (Execution Plane)**  
- Primary executor: Task tool spawns **working agents** in parallel.  
- Does all file ops, code, bash, tests, lint/typecheck, git.  
- `TodoWrite` = only for **secondary notes** after Archon setup.  

---

## 2) Concurrency & Batching  
- **1 message = all related operations.**  
- **Batch**: tasks, todos, files, bash, memory.  
- **Never write to repo root**. Use: `/src`, `/tests`, `/docs`, `/config`, `/scripts`, `/examples`.  

---

## 3) Canonical Agentic Pattern  

### A) Control + Orchestration (Archon + Claude-Flow)  
```bash
archon:manage_task(action="list", filter_by="status", filter_value="todo")
archon:manage_task(action="get", task_id="[id]")
archon:perform_rag_query(query="[topic]", match_count=4)
archon:search_code_examples(query="[pattern]", match_count=3)
archon:manage_task(action="update", task_id="[id]", update_fields={"status":"doing"})

mcp__claude-flow__swarm_init { topology:"mesh", maxAgents:6 }
mcp__claude-flow__agent_spawn { type:"researcher" }
mcp__claude-flow__agent_spawn { type:"coder" }
mcp__claude-flow__agent_spawn { type:"tester" }
mcp__claude-flow__task_orchestrate { plan:"SPARC TDD for [feature]" }
```

### B) Execution (Claude Code — Task Tool)  
```javascript
Task("Research","Summarize Archon findings","researcher")
Task("Coder","Implement feature in /src","coder")
Task("Tester","Write failing tests in /tests","tester")
Task("Reviewer","Review & log notes","reviewer")

Bash("mkdir -p src tests docs config scripts && npm run lint || true && npm run typecheck || true")

Write "tests/feature.spec.ts"
Write "src/feature.ts"

TodoWrite {
  todos: [
    {id:"t1", content:"Write failing tests first", status:"pending"},
    {id:"t2", content:"Implement feature to pass tests", status:"pending"},
    {id:"t3", content:"Security review", status:"pending"}
  ]
}

Bash("npm run test && npm run build")
```

### C) Close Loop (Archon Sync)  
```bash
archon:manage_task(action="update", task_id="[id]", update_fields={"status":"review"})
```

---

## 4) SPARC + TDD with Claude-Flow  
- `sparc run spec-pseudocode "<task>"`  
- `sparc run architect "<task>"`  
- `sparc tdd "<feature>"`  
- `sparc run integration "<task>"`  
- Batch/pipeline for parallel phases.  

---

## 5) File/Repo Discipline  
- Never write to root.  
- Prefer **editing existing files**.  
- Only create docs/README if **explicitly asked**.  

---

## 6) Quality Gates  
- Tests first (TDD).  
- ~90% coverage.  
- No secrets in code.  
- Security review mandatory.  
- Update Archon after each task.  

---

## 7) Quickstart Snippets  
**Add Claude-Flow MCP:**  
```bash
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

**Spawn Worker Agents (Claude Code):**  
```javascript
Task("Coder","Implement /src module","coder")
Task("Tester","Write failing tests in /tests","tester")
Task("Reviewer","Security check","reviewer")
```

---

## ✅ Success Criteria  
- Implemented per Archon research.  
- Tests passing.  
- Lint/typecheck clean.  
- Archon updated (`doing → review → done`).  
