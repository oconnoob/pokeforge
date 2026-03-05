# Project development and values:

## Overarching principles

These code-quality principles apply at **every stage** of development:

- Test-Driven Design (TDD)
- 1.2 Modularity & Loose Coupling
  - Design components to be swappable (e.g., SQLite → PostgreSQL)
  - Use dependency injection for testability and flexibility
  - Favor composition over inheritance
- SOLID principles
- High Cohesion
  - Related functionality stays together
  - Modules have clear, focused purposes
- Security
  - Write secure code, highlight potential vulnerabilities, and suggest architectural and other decisions to enhance security
- Pure code
  - Write pure functions for easily testability where possible

## Developer practices

Beyond code quality, we also want to ensure good **developer hygiene**. That means:

- Atomic commits
- Clean git history
- Semantic versioning
- Conventional Commits
  - All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
  - Format: `<type>(<scope>): <description>`
  - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`
- Trunk-based workflow for managing git branches
  - Use `no-ff` to maintain branch structure
- Git hooks - for things like testing, linting, post-merge processes, etc.

## Project context management

Context management is **critical** for effective AI-assisted development. The AI needs to understand project conventions, decisions, and domain language.

Create a `docs/AI_CONTEXT.md` file at the project root containing:

- project overview (what the project is, its goals, etc.)
- architecture
- conventions
- tech stack
- domain concepts
- current state
- important decisions (references to ADRs or inline summaries of key decisions, stored in ``docs/adr/` as noted [below](#architecture-decision-records-adrs))

Where relevant, refernce `docs/` or create new docs if helpful.

Additionally, create `TODO.md` file where you will keep track of the main tasks that need to be accomplished (and salient subtasks)

## Development loop - planning

Before writing any code, complete these planning phases:

### Abstractions

- Identify where abstractions provide value (database access, external services, etc.)
- Don't over-abstract - start concrete, abstract when patterns emerge
- Document abstraction rationale in ADRs

### Architecture Design

- Define high-level system architecture
- Identify major components and their responsibilities
- Document in `docs/architecture/`

### System Diagrams

Create and maintain:

- Component diagrams (how pieces interact)
- Data flow diagrams (how data moves through the system)
- Entity relationship diagrams (for data modeling)
- Sequence diagrams (for complex interactions)
- Store in `docs/diagrams/` using tools like Mermaid

### API/Contract Definitions

- Define interfaces **before** implementation
- Use OpenAPI/Swagger for REST APIs
- Define TypeScript interfaces or similar for internal contracts
- Store in `docs/api/` or alongside code

### Domain Objects

- Identify core domain entities
- Define their properties and relationships
- Use ubiquitous language from domain-driven design
- Document in a domain glossary `docs/glossary`

## Development loop - boostrapping / initialization

Next, **initialize** the project. This should include

- Determining the optimal stack for the problem statement
- Presenting several options to the user
- Building a "minimum viable app", or bootstrapping a starter repo, to initialize the project

## Development loop - main development loop

### Build

1. Check `TODO.md`
2. Determine the next feature that should be built, and build it
3. Use atomic and sensible commits while you build. Make sure to run tests before each commit
4. When the feature is ready, kick off a **review**

### Review

1. Perform a thorough review of the code. Check for:

- code quality
- best practices
- adherence to project-specific conventions
- tests are passing

2. If everything looks good:

- merge into `main`

3. Otherwise:

- Fix issues until the tests resolve, then repeat the review from the beginning

### After a review

1. Determine if an [ADR](#architecture-decision-records-adrs) needs to be created. If so, create it
2. Determine if any other documentation should be updated

## Appendix

### Architecture Decision Records (ADRs)

And ADR is a short document capturing:

- **Context:** What situation prompted this decision?
- **Decision:** What was decided?
- **Consequences:** What are the trade-offs?

ADRs capture the **why** behind significant decisions.

Store new ADRs in `docs/adr/`, based on `docs/adr/TEMPLATE.md` with naming: `NNNN-title-with-dashes.md`

When to create a new ADR:

- Choosing between technologies (database, framework, library)
- Architectural patterns (monolith vs microservices, event-driven, etc.)
- Significant trade-offs (performance vs simplicity, etc.)
- Deviations from common practices
- Decisions that would confuse a future developer

# Directions:

Now that you have read and understand this file, perform the following (in order):

1. Generate an `AGENT.md` file to provide useful context when you start a session. It should have links to need-to-know documentation before a session
2. Generate all of the required files listed above (e.g. those in `docs/`) and any other files you think are necessary
3. Report back to the user (me) with next steps to request details about the particular project we will be building
4. Ask follow up questions until the problem statement is sufficiently clearly defined
5. Begin the development loop (starting with [planning](#development-loop---planning))
