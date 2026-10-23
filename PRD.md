# SlothMind --- Product Requirements Document (PRD)

**Document status:** Initial product specification\
**Product name:** SlothMind *(working name; verify trademark, domain,
package and repository availability before public launch)*\
**Version:** 1.0\
**Product type:** Local-first, AI-powered knowledge workspace for
desktop\
**Primary audience:** Developers and AI/ML researchers\
**Initial environment:** Kali Linux, with an NVIDIA RTX 3050 4 GB GPU\
**Working tagline:** *Your second brain. Your rules.*\
**Alternative campaign line:** *Think less about organizing. Do more
with what you know.*

------------------------------------------------------------------------

## 0. Instructions for the coding agent

You are implementing **SlothMind**, a local-first AI knowledge workspace
inspired by the strengths of Obsidian and Notion AI. This is a new
product, not a pixel-perfect clone of either product.

### Non-negotiable principles

1.  **Local-first:** the app's core must work without creating an
    account or depending on a cloud service.
2.  **User-owned data:** notes are ordinary Markdown files in a
    user-selected local vault. Never make a proprietary database the
    only copy of a user's notes.
3.  **Local AI by default:** support a local inference runtime,
    initially Ollama. Do not require a cloud AI API key for the core AI
    experience.
4.  **Honest privacy:** do not claim a feature is offline or local
    unless it actually is. Make local/cloud boundaries clear in the UI
    and documentation.
5.  **Source-grounded AI:** when answering questions about a vault,
    retrieve relevant note content and show citations to the actual
    source notes. Do not fabricate citations.
6.  **Reliable files:** protect user data from accidental overwrite,
    corruption, or silent deletion.
7.  **Ship a coherent MVP before adding stretch features.** Prefer a
    small working end-to-end product over many non-functional screens.
8.  **No fake functionality:** no buttons that do nothing, hard-coded
    fake AI responses, fake sync, fake model status, or misleading
    progress indicators.
9.  **Respect hardware constraints:** the initial development machine is
    Kali Linux with an NVIDIA RTX 3050 4 GB. Use small quantized models
    and bounded context sizes; never assume a large model fits in VRAM.
10. **Keep the architecture extensible** for optional paid cloud
    services later, but do not build billing, cloud sync, or a complex
    multi-user backend into the first MVP.

### Coding-agent workflow

-   First inspect the existing repository, package manager, runtime
    versions, and project structure. Do not overwrite existing work
    blindly.
-   If the repository is empty, scaffold the smallest maintainable
    project that satisfies this PRD.
-   Before major implementation, provide a concise plan and list any
    assumptions.
-   Implement in small, verifiable stages. After each stage, run
    available type checks, linting, tests, and build commands.
-   Fix errors rather than hiding them or disabling checks.
-   Use clear types, modular components, meaningful error handling, and
    accessible controls.
-   Keep secrets out of source control. Provide `.env.example` only if
    environment variables are actually needed.
-   Document setup, model installation, testing, known limitations, and
    packaging.
-   If a feature is too large for the first pass, implement a useful,
    honest minimal version and record the remainder in `ROADMAP.md`.
-   Do not claim the app has been tested on hardware or operating
    systems that have not actually been tested.

------------------------------------------------------------------------

## 1. Product vision

SlothMind is a private, local-first knowledge workspace where developers
and researchers can collect notes, technical documentation, research
findings, code snippets, debugging lessons, and project decisions---and
then use AI to retrieve, understand, summarize, and act on that
knowledge.

The product combines:

-   An Obsidian-like Markdown workspace and local vault.
-   A local AI assistant powered initially by Ollama.
-   Retrieval-augmented generation (RAG) over the user's notes.
-   Source citations that link answers back to original files and
    relevant excerpts.
-   Productivity workflows that turn stored knowledge into summaries,
    tasks, study materials, and project briefs.

### Core promise

**Your notes, your AI, your machine.**

### Product positioning

SlothMind is not intended to win by being another generic notes editor
or another chat window. Its initial differentiation is:

> A local AI workspace that remembers your project knowledge and helps
> you reuse it---with evidence from your own notes.

### Example value proposition

A developer saved an error message, a failed debugging attempt, and the
final fix several weeks ago. They later ask:

> "How did I solve this error before, and why did I reject the other
> approach?"

SlothMind searches relevant notes, produces a concise answer, links to
the source files/passages, and optionally saves the result as a new
Markdown note.

------------------------------------------------------------------------

## 2. Problem statement

Developers and researchers often keep knowledge in disconnected places:

-   Markdown notes and personal wikis.
-   Research papers and PDF annotations.
-   Code snippets and debugging logs.
-   Project architecture decisions.
-   Meeting notes and action items.
-   Documentation bookmarks and copied excerpts.
-   Chat conversations and temporary scratch files.

This creates several problems:

1.  Information is hard to find when it is needed.
2.  Keyword search misses semantically related information.
3.  Repeatedly summarizing, organizing, and revising information wastes
    time.
4.  Generic AI assistants do not reliably know the user's personal
    project history.
5.  Uploading private notes to cloud AI services can create privacy
    concerns.
6.  Proprietary note formats make portability and long-term ownership
    harder.

SlothMind should reduce the time spent organizing and recovering
knowledge while keeping the user's local notes accessible and portable.

------------------------------------------------------------------------

## 3. Goals and non-goals

### 3.1 MVP goals

1.  Users can open or create a local vault.
2.  Users can create, edit, search, rename, and organize Markdown notes.
3.  Changes are saved safely to disk.
4.  Users can connect to a local Ollama instance and select an available
    model.
5.  Users can chat with the model with streaming output.
6.  Users can ask questions about their vault using RAG.
7.  Vault answers cite real source notes and relevant excerpts.
8.  Users can summarize or rewrite selected text and save AI output as
    notes.
9.  The core experience does not require an account or cloud AI.
10. A new user can install the app, create a vault, add sample notes,
    and complete the key workflow using clear instructions.

### 3.2 Product goals after MVP

-   Improve retrieval quality through hybrid keyword and semantic
    search.
-   Add backlinks, related-note suggestions, and a knowledge graph.
-   Add research and developer workflows.
-   Add optional encrypted cross-device sync and optional hosted AI.
-   Validate willingness to pay before investing in subscriptions and
    infrastructure.

### 3.3 Non-goals for the first MVP

Do **not** implement these before the core flow is working:

-   Full Notion parity, databases, collaborative editing, or complex
    block-based documents.
-   A custom LLM trained from scratch.
-   A proprietary inference server or model hosting platform.
-   Required user accounts.
-   Billing, payments, subscription management, or a SaaS admin
    dashboard.
-   Cloud sync or cloud backup.
-   Multi-user workspaces and real-time collaboration.
-   Mobile apps.
-   A complex autonomous agent system.
-   Automatic modifications to many files without user approval.
-   A large knowledge graph before basic note retrieval is reliable.

------------------------------------------------------------------------

## 4. Target users and personas

### Persona A: Developer

**Needs** - Save code snippets, bug fixes, technical decisions, and
architecture notes. - Search previous debugging solutions. - Keep
knowledge grouped by project. - Explain saved code or documentation. -
Avoid repeatedly solving the same problem.

**Success scenario** The developer asks a question about a previous
issue and gets an answer with clickable links to the exact notes that
contain the fix.

### Persona B: AI/ML researcher

**Needs** - Organize paper summaries, experiment logs, methodologies,
and findings. - Compare ideas across notes. - Generate research briefs
and revision material. - Preserve sources and avoid unsupported AI
claims.

**Success scenario** The researcher asks what their notes say about two
approaches and receives a comparison grounded in the relevant notes.

### Persona C: Privacy-conscious knowledge worker

**Needs** - A searchable personal knowledge base. - Local storage and
control over files. - Useful AI without mandatory account creation or
cloud uploads. - Simple backup and export.

**Success scenario** The user can disconnect the internet and continue
editing and searching local notes. AI features work offline when the
local inference runtime and required model are available.

------------------------------------------------------------------------

## 5. Product principles

### 5.1 Local-first, not local-only by dogma

Local processing is the default, but optional future integrations may
include cloud AI or sync. They must be opt-in, clearly labeled, and
separable from the core workspace.

### 5.2 Markdown is the source of truth

The user's Markdown files and attachments are authoritative. SQLite is a
rebuildable index/cache for metadata and retrieval. Deleting or
rebuilding the database must not delete the original notes.

### 5.3 Evidence over confident guesses

Vault Q&A should distinguish between: - Information supported by
retrieved notes. - General model knowledge. - Information not found in
the vault.

If the retrieved context does not support an answer, say that the vault
did not provide enough information. Do not invent source citations.

### 5.4 Fast and calm UX

The interface should be focused, keyboard-friendly, visually polished,
and responsive. Do not overload the MVP with settings, graphs, or
decorative UI.

### 5.5 User consent for destructive or external actions

Renaming, moving, deleting, overwriting, importing, or exporting data
should be clear and recoverable where possible. Any future cloud action
must be explicit.

------------------------------------------------------------------------

## 6. Feature requirements and priority

Priority labels: - **P0:** Required for a credible MVP. - **P1:**
Important after the core path is stable. - **P2:** Future enhancement.

### 6.1 Workspace and navigation

  -------------------------------------------------------------------------
  ID               Feature                       Priority Acceptance
                                                          criteria
  ---------------- ---------------- --------------------- -----------------
  WS-01            Open existing                       P0 User can choose a
                   vault                                  local folder and
                                                          see its supported
                                                          notes.

  WS-02            Create vault                        P0 User can
                                                          create/select a
                                                          folder and
                                                          initialize the
                                                          app's local
                                                          metadata.

  WS-03            File explorer                       P0 Shows nested
                                                          folders and
                                                          Markdown notes;
                                                          reflects
                                                          filesystem
                                                          changes safely.

  WS-04            Create note                         P0 Creates a `.md`
                                                          file in the
                                                          selected vault
                                                          with a sensible
                                                          default name.

  WS-05            Edit note                           P0 User can edit
                                                          Markdown content
                                                          and see a clear
                                                          saved/unsaved
                                                          state.

  WS-06            Autosave                            P0 Saves after a
                                                          short debounce
                                                          and on safe
                                                          lifecycle events;
                                                          save errors are
                                                          visible.

  WS-07            Rename/move note                    P0 Updates the file
                                                          and refreshes the
                                                          index; does not
                                                          silently
                                                          overwrite another
                                                          file.

  WS-08            Delete note                         P0 Requires
                                                          confirmation or
                                                          uses a
                                                          recoverable trash
                                                          flow; clearly
                                                          communicates
                                                          impact.

  WS-09            Quick switcher                      P1 Keyboard-driven
                                                          navigation to
                                                          notes.

  WS-10            Command palette                     P1 Searchable list
                                                          of working app
                                                          actions.

  WS-11            Recent notes                        P1 Displays recently
                                                          opened notes.

  WS-12            Multiple vaults                     P1 Users can switch
                                                          between
                                                          independent local
                                                          vaults.
  -------------------------------------------------------------------------

### 6.2 Markdown editor

  ------------------------------------------------------------------------
  ID               Feature                       Priority Acceptance
                                                          criteria
  ---------------- ---------------- --------------------- ----------------
  ED-01            Markdown editing                    P0 Correctly reads
                                                          and writes UTF-8
                                                          Markdown files.

  ED-02            Common syntax                       P0 Supports
                                                          headings, lists,
                                                          links,
                                                          blockquotes,
                                                          tables,
                                                          checkboxes, and
                                                          fenced code.

  ED-03            Code blocks                         P0 Code is readable
                                                          and language
                                                          labels are
                                                          preserved.

  ED-04            Markdown preview                    P1 User can inspect
                                                          rendered
                                                          Markdown without
                                                          altering the
                                                          stored source.

  ED-05            Internal note                       P1 Note links can
                   links                                  open the
                                                          referenced local
                                                          note when it
                                                          exists.

  ED-06            Backlinks                           P1 Displays notes
                                                          that link to the
                                                          current note.

  ED-07            Templates                           P1 User can create
                                                          a note from a
                                                          template.

  ED-08            Daily notes                         P2 Creates or opens
                                                          a date-based
                                                          note.
  ------------------------------------------------------------------------

**Editor implementation note:** prefer a maintainable editor that
preserves Markdown. If using a rich-text editor, ensure round-trip
serialization does not unexpectedly rewrite or lose existing Markdown. A
Markdown-first editor is acceptable for the MVP.

### 6.3 Search and indexing

  ----------------------------------------------------------------------------
  ID               Feature                       Priority Acceptance criteria
  ---------------- ---------------- --------------------- --------------------
  SR-01            Full-text search                    P0 Searches note titles
                                                          and content within
                                                          the active vault.

  SR-02            Search results                      P0 Shows title,
                                                          matching excerpt,
                                                          and opens the
                                                          selected note.

  SR-03            Filesystem index                    P0 Index tracks note
                                                          paths, content
                                                          hashes/timestamps,
                                                          and searchable
                                                          content.

  SR-04            Index recovery                      P0 Index can be rebuilt
                                                          from Markdown files
                                                          without changing
                                                          source notes.

  SR-05            Semantic search                     P1 Finds conceptually
                                                          related passages
                                                          using local
                                                          embeddings.

  SR-06            Hybrid retrieval                    P1 Combines lexical and
                                                          semantic retrieval
                                                          and avoids duplicate
                                                          results.

  SR-07            Filters                             P2 Supports filtering
                                                          by folder, tag, or
                                                          file type.
  ----------------------------------------------------------------------------

### 6.4 Local AI integration

  -----------------------------------------------------------------------------
  ID               Feature                       Priority Acceptance criteria
  ---------------- ---------------- --------------------- ---------------------
  AI-01            Runtime status                      P0 UI accurately
                                                          indicates whether the
                                                          configured local AI
                                                          runtime is reachable.

  AI-02            Model discovery                     P0 Lists models actually
                                                          available from the
                                                          runtime.

  AI-03            Model selection                     P0 User can choose an
                                                          installed model;
                                                          errors are clear if
                                                          none are available.

  AI-04            Streaming chat                      P0 Response text appears
                                                          incrementally and can
                                                          be cancelled where
                                                          supported.

  AI-05            Error handling                      P0 Handles runtime
                                                          offline, model
                                                          missing, timeout, and
                                                          generation errors.

  AI-06            Summarize note                      P0 Summarizes current
                                                          note using its
                                                          content and lets the
                                                          user copy or save the
                                                          result.

  AI-07            Rewrite                             P0 Rewrites selected
                   selection                              text with a chosen
                                                          instruction without
                                                          silently replacing
                                                          the original.

  AI-08            Continue writing                    P1 Generates a
                                                          continuation using
                                                          explicit note
                                                          context.

  AI-09            Explain code                        P1 Explains selected
                                                          code or a saved code
                                                          block.

  AI-10            Model settings                      P1 Provides safe
                                                          defaults for
                                                          temperature/context
                                                          and explains that
                                                          performance depends
                                                          on model/hardware.
  -----------------------------------------------------------------------------

### 6.5 Ask your vault / RAG

  --------------------------------------------------------------------------
  ID               Feature                        Priority Acceptance
                                                           criteria
  ---------------- ----------------- --------------------- -----------------
  RAG-01           Note chunking                        P0 Splits notes into
                                                           manageable
                                                           passages while
                                                           retaining file
                                                           path and section
                                                           metadata.

  RAG-02           Retrieval                            P0 Retrieves
                                                           relevant passages
                                                           for a user
                                                           question.

  RAG-03           Context-bounded                      P0 Sends only a
                   prompt                                  controlled number
                                                           of relevant
                                                           passages to the
                                                           model.

  RAG-04           Source citations                     P0 Each displayed
                                                           citation refers
                                                           to a real note
                                                           and, where
                                                           possible,
                                                           section/heading
                                                           or excerpt.

  RAG-05           Open source                          P0 Clicking a
                                                           citation opens
                                                           the source note
                                                           and navigates to
                                                           the relevant
                                                           section if
                                                           possible.

  RAG-06           Abstention                           P0 When context is
                                                           insufficient, the
                                                           assistant states
                                                           that the vault
                                                           does not contain
                                                           enough evidence.

  RAG-07           Retrieval                            P1 User can inspect
                   visibility                              the passages used
                                                           to answer a
                                                           question.

  RAG-08           Semantic                             P1 Adds local
                   embeddings                              embeddings with a
                                                           clear setup path
                                                           and model
                                                           requirements.

  RAG-09           Re-indexing                          P1 Updates only
                                                           changed notes
                                                           where practical.

  RAG-10           Chat history                         P1 Stores local
                                                           conversation
                                                           history with an
                                                           option to clear
                                                           it.
  --------------------------------------------------------------------------

**Important MVP trade-off:** if time is short, begin with reliable
keyword/SQLite full-text retrieval and real source citations. Design
retrieval behind an interface so local semantic embeddings and hybrid
retrieval can be added without rewriting the chat UI.

### 6.6 AI actions and workflows

  -----------------------------------------------------------------------------
  ID               Feature                            Priority Acceptance
                                                               criteria
  ---------------- --------------------- --------------------- ----------------
  WF-01            Summarize                                P0 Produces an
                                                               output the user
                                                               can inspect,
                                                               copy, or save.

  WF-02            Rewrite                                  P0 Preserves the
                                                               original unless
                                                               the user
                                                               explicitly
                                                               replaces it.

  WF-03            Save as note                             P0 Saves generated
                                                               output as a new
                                                               Markdown file
                                                               after user
                                                               confirmation.

  WF-04            Research brief                           P1 Combines
                                                               retrieved notes
                                                               and includes
                                                               source links.

  WF-05            Task extraction                          P1 Suggests tasks
                                                               from a note and
                                                               asks for
                                                               confirmation
                                                               before writing
                                                               them.

  WF-06            Flashcards/revision                      P1 Creates
                   sheet                                       structured study
                                                               material from
                                                               chosen notes.

  WF-07            Meeting-to-actions                       P2 Extracts
                                                               decisions and
                                                               follow-ups from
                                                               supplied notes.

  WF-08            Batch workflows                          P2 Processes
                                                               multiple notes
                                                               with visible
                                                               progress and
                                                               cancellation.
  -----------------------------------------------------------------------------

### 6.7 Privacy, data safety, and portability

  --------------------------------------------------------------------------
  ID               Feature                       Priority Acceptance
                                                          criteria
  ---------------- ---------------- --------------------- ------------------
  PV-01            No mandatory                        P0 User can use local
                   account                                workspace without
                                                          registration.

  PV-02            Local data                          P0 Clearly identifies
                   indicator                              local inference
                                                          and any optional
                                                          external service.

  PV-03            No silent                           P0 Note content is
                   uploads                                never sent to a
                                                          remote service
                                                          without explicit
                                                          configuration and
                                                          consent.

  PV-04            Portable files                      P0 Notes remain
                                                          usable in ordinary
                                                          Markdown editors.

  PV-05            Export                              P0 User can export or
                                                          access the vault
                                                          as ordinary files.

  PV-06            Backup guidance                     P1 Documentation
                                                          explains safe
                                                          backup and
                                                          recovery.

  PV-07            Data deletion                       P1 User can clear
                                                          local AI
                                                          chat/index data
                                                          without deleting
                                                          original notes
                                                          unintentionally.

  PV-08            Telemetry                           P2 If ever
                                                          introduced, it is
                                                          opt-in,
                                                          documented,
                                                          minimal, and does
                                                          not collect note
                                                          contents.
  --------------------------------------------------------------------------

### 6.8 Future monetization and freemium

These are **future product requirements, not MVP blockers**.

  -----------------------------------------------------------------------
  Capability              Free tier direction     Potential paid value
  ----------------------- ----------------------- -----------------------
  Local notes and vault   Keep free               Never lock user's files
                                                  behind a subscription

  Local AI                Allow users to use      Premium convenience,
                          their own local runtime not charging for the
                                                  user's own compute

  Basic search and links  Free                    Advanced productivity
                                                  workflows

  Basic vault Q&A         Free/basic              More advanced retrieval
                                                  and multi-document
                                                  research

  Local templates         Free starter set        Optional curated
                                                  workflow/template packs

  Hosted AI               Optional; user may      Paid
                          bring own provider      credits/subscription
                                                  with transparent limits

  Cloud sync              Not required for MVP    Managed encrypted
                                                  cross-device sync

  Managed backup          Local backup guidance   Optional hosted backup
                          initially               

  Team features           Out of scope initially  Only consider after
                                                  validating demand
  -----------------------------------------------------------------------

**Monetization rules** - Do not finalize prices until users and costs
are validated. - Candidate experiments discussed: Plus around ₹199/month
and optional sync around ₹99/month. These are hypotheses, not committed
prices. - Cloud AI pricing must account for inference costs and usage
limits. - Local features should continue working if a subscription
expires. - Subscription cancellation must not lock or delete local
files. - Do not implement payments before validating that users
repeatedly use and value the product.

------------------------------------------------------------------------

## 7. Primary user journeys

### Journey A: First launch

1.  User launches SlothMind.
2.  Welcome screen explains local-first storage and local AI
    requirements.
3.  User chooses **Create vault** or **Open existing vault**.
4.  User selects a local directory.
5.  App displays the file explorer and an empty-state prompt to create a
    note.
6.  User creates a note and writes content.
7.  App saves it as a `.md` file in the selected vault.
8.  User closes/reopens the app and verifies that the note persists.

**Acceptance test:** no account, cloud service, or AI runtime is
required to create and edit a local note.

### Journey B: Connect local AI

1.  User opens AI settings.
2.  App checks whether the configured Ollama endpoint is reachable.
3.  If unavailable, the UI explains how to install/start Ollama and
    provides a retry action.
4.  If reachable, app lists available models.
5.  User selects a model.
6.  User asks a general question.
7.  The response streams into the chat.
8.  If generation fails, the error is visible and the user's prompt is
    preserved.

**Acceptance test:** no fake response is shown when the runtime or model
is unavailable.

### Journey C: Ask a question about the vault

1.  User creates or imports several Markdown notes.
2.  App indexes their text.
3.  User asks a question in the vault assistant.
4.  App retrieves relevant passages and includes source metadata.
5.  Model answers using those passages.
6.  The answer displays clickable source citations.
7.  Clicking a citation opens the source note.
8.  When evidence is missing, the model is instructed to say so.

**Acceptance test:** all displayed citations map to actual indexed
notes; deleted or moved files do not produce broken citations after
index refresh.

### Journey D: Turn knowledge into a reusable artifact

1.  User opens a note or selects passages.
2.  User invokes **Summarize**, **Rewrite**, or **Generate revision
    sheet**.
3.  App shows a loading state and allows cancellation where supported.
4.  User reviews the result.
5.  User copies it or saves it as a new note.
6.  Original note remains unchanged unless the user explicitly chooses
    to replace it.

### Journey E: Offline use

1.  User has previously downloaded a local model.
2.  User disconnects from the internet.
3.  User opens the vault, edits notes, and performs local search.
4.  User invokes local AI, assuming the local runtime and model are
    available.
5.  App does not silently fall back to a cloud service.

**Acceptance test:** the app accurately distinguishes "offline-capable"
from "AI unavailable because the runtime/model is missing."

------------------------------------------------------------------------

## 8. UX and visual direction

### Design personality

-   Calm, focused, modern, premium, developer-friendly.
-   Dark theme as the initial default; a light theme can follow.
-   Use a restrained charcoal background with a violet accent and clear
    neutral text.
-   Sloth mascot can be a subtle brand element, not a distraction.
-   Avoid excessive gradients, glassmorphism, giant hero cards, or
    unnecessary animations.
-   Prioritize readable note content and a clear hierarchy.

### Suggested desktop layout

1.  **Left sidebar**
    -   SlothMind logo/name.
    -   Vault switcher.
    -   Search/quick switcher.
    -   File tree.
    -   New note action.
    -   Settings at the bottom.
2.  **Main workspace**
    -   Tab or breadcrumb for the active note.
    -   Markdown editor.
    -   Clear saved/unsaved state.
    -   Contextual actions for summarization and rewriting.
3.  **Optional right AI panel**
    -   Chat and vault Q&A.
    -   Source citations.
    -   Selected model/status.
    -   Collapse/expand control.
4.  **Status/footer**
    -   Active vault.
    -   Local AI runtime/model status.
    -   Indexing status when relevant.
    -   No misleading online/privacy indicators.

### Responsive behavior

The first target is a desktop-sized viewport. The app should remain
usable at narrower window sizes by collapsing side panels and avoiding
horizontal overflow. A mobile app is not part of the MVP.

### Accessibility

-   Keyboard navigation for core flows.
-   Visible focus indicators.
-   Accessible labels for icon-only buttons.
-   Sufficient contrast.
-   Do not rely on color alone to communicate save/runtime/error status.

------------------------------------------------------------------------

## 9. Technical architecture

### 9.1 Proposed stack

  -----------------------------------------------------------------------
  Layer                   Proposed technology     Notes
  ----------------------- ----------------------- -----------------------
  Desktop shell           Tauri                   Preferred for a
                                                  lightweight desktop
                                                  app; verify
                                                  compatibility with the
                                                  chosen Tauri version
                                                  and Linux dependencies.

  Frontend                React + TypeScript      Component-based, typed
                                                  UI.

  Build tooling           Vite                    Use the standard
                                                  compatible setup for
                                                  the selected Tauri
                                                  version.

  Styling                 Tailwind CSS            Consistent spacing and
                                                  reusable design tokens.

  Icons                   Lucide                  Use a consistent icon
                                                  family.

  Notes                   Markdown files          Canonical source of
                                                  truth.

  Metadata/index          SQLite                  Rebuildable index;
                                                  never the only copy of
                                                  notes.

  Local AI                Ollama HTTP API         Configurable local
                                                  endpoint; no assumption
                                                  that the runtime is
                                                  installed.

  Retrieval               SQLite full-text search Keep retrieval behind
                          initially; local        an abstraction.
                          embeddings/hybrid       
                          retrieval later         

  Testing                 Vitest/React Testing    Match the final stack
                          Library and Rust/Tauri  and available
                          tests where appropriate toolchain.
  -----------------------------------------------------------------------

**Implementation flexibility:** if the repository already has a sound
stack, inspect it before replacing it. Do not switch technologies
without explaining the trade-off. If Tauri packaging threatens the
deadline, a local web MVP can be built first, but local file access must
remain safe and clearly scoped.

### 9.2 High-level architecture

``` text
┌──────────────────────────────────────────────────┐
│                 SlothMind UI                     │
│  File tree | Markdown editor | AI chat | Search  │
└──────────────────────┬───────────────────────────┘
                       │ typed application services
┌──────────────────────▼───────────────────────────┐
│              Application / Domain Layer          │
│ Vault service | Note service | Search | AI | RAG │
└─────────────┬─────────────────────┬──────────────┘
              │                     │
┌─────────────▼──────────┐  ┌───────▼──────────────┐
│ Local Vault Files      │  │ Local AI Runtime     │
│ Markdown + attachments │  │ Ollama HTTP API      │
└─────────────┬──────────┘  └──────────────────────┘
              │
┌─────────────▼────────────────────────────────────┐
│ SQLite metadata/search index                     │
│ Paths, hashes, headings, chunks, retrieval data  │
└──────────────────────────────────────────────────┘
```

### 9.3 Suggested module boundaries

``` text
src/
  app/
    App.tsx
    routes-or-layout.tsx
  components/
    layout/
    sidebar/
    editor/
    search/
    ai/
    settings/
    common/
  features/
    vault/
    notes/
    search/
    chat/
    rag/
    settings/
  services/
    filesystem/
    ollama/
    indexing/
    retrieval/
  hooks/
  types/
  utils/
  styles/
src-tauri/
  src/
    commands/
    services/
    main.rs
  tauri.conf.json
tests/
  unit/
  integration/
docs/
  architecture.md
  privacy.md
README.md
ROADMAP.md
```

This is a suggested structure, not a requirement to create empty
folders. Keep code organized around real functionality and avoid
unnecessary abstraction.

### 9.4 Vault and file operations

-   Use the user-selected vault directory as the root boundary.
-   Validate and normalize paths; prevent path traversal outside the
    vault.
-   Handle Unicode filenames and UTF-8 content.
-   Avoid overwriting existing files without explicit confirmation.
-   Use safe write patterns where supported (temporary file + atomic
    replacement).
-   Handle filesystem permission errors and externally deleted/moved
    files.
-   Refresh or reconcile the index when files change.
-   If external filesystem watching is used, debounce events and avoid
    feedback loops caused by the app's own writes.
-   Never recursively delete a folder without a clear confirmation.
-   Treat attachments as files in the vault, not opaque database blobs.

### 9.5 SQLite index

Suggested conceptual tables (adjust to the selected SQLite/FTS setup):

-   `notes`: note id, relative path, title, content hash, modified time,
    indexed time.
-   `note_chunks`: chunk id, note id, heading/section, start/end
    offsets, chunk text or retrievable content, hash.
-   `links`: source note id/path, target note reference.
-   `conversations`: local conversation metadata if chat history is
    implemented.
-   `messages`: local messages and timestamps if chat history is
    implemented.
-   Optional embedding table or vector extension only after validating
    library compatibility.

The database must be disposable/rebuildable from the source vault. Avoid
storing duplicate sensitive content unnecessarily.

### 9.6 Local AI provider interface

Create a small provider interface so the UI is not tightly coupled to
Ollama. For the MVP, implement Ollama only.

Expected capabilities: - Check runtime health. - List locally available
models. - Stream chat/generation responses. - Abort/cancel a request if
supported. - Return typed errors for unavailable runtime, missing model,
timeout, invalid response, and generation failure.

Do not assume a specific endpoint or response shape without checking the
current Ollama API documentation and the installed version. Configure
the endpoint safely and document it.

### 9.7 RAG pipeline

Initial pipeline:

1.  Read Markdown content from the active vault.
2.  Normalize text while preserving the original Markdown source.
3.  Split content into chunks with file path, heading, and offsets.
4.  Index chunks.
5.  For a question, retrieve a bounded set of relevant chunks.
6.  Construct a prompt that clearly labels the retrieved passages as
    untrusted reference material, not system instructions.
7.  Ask the model to answer from the context, cite source IDs, and
    abstain if evidence is insufficient.
8.  Validate returned source IDs against the actual retrieved source
    list.
9.  Render citations using trusted local file metadata, not
    model-invented paths.
10. Allow the user to open each source note.

**Prompt-injection safety:** note content is untrusted data. A note may
contain text that looks like instructions. Do not let retrieved notes
override application/system instructions or trigger tools/actions. RAG
is read-only in the MVP.

### 9.8 Performance and hardware

Initial target machine: - Kali Linux. - NVIDIA RTX 3050 with 4 GB VRAM.

Requirements: - Do not bundle large model weights with the
application. - Let users install/download a compatible model through
their chosen runtime. - Recommend small quantized models as examples,
but do not hard-code a model as universally compatible. - Limit context
size and retrieved passage count. - Keep note editing responsive while
indexing or generating. - Use background work for expensive indexing
tasks. - Show cancellation/progress when practical. - Gracefully fall
back to CPU/runtime defaults where available; do not promise GPU
acceleration without verification. - Measure performance with real test
vaults before claiming speed benchmarks.

------------------------------------------------------------------------

## 10. Security and privacy requirements

1.  **No secret collection:** never ask for or log user passwords or API
    keys unnecessarily.
2.  **No silent remote requests:** cloud AI, telemetry, sync, and remote
    backup are out of scope unless explicitly enabled.
3.  **Local endpoint safety:** document the configured Ollama endpoint
    and avoid exposing the local runtime to the network by default.
4.  **Path safety:** filesystem operations remain inside the chosen
    vault unless a user explicitly selects another path for
    import/export.
5.  **Input safety:** Markdown and AI output must be rendered safely. Do
    not execute arbitrary HTML or scripts from notes.
6.  **External links:** open links through safe platform APIs and avoid
    automatically opening arbitrary URLs from model output.
7.  **RAG trust boundaries:** note contents and model output are
    untrusted. Do not execute commands generated by the model.
8.  **No autonomous destructive actions:** any future tool execution,
    bulk file edits, or file deletion requires explicit user
    confirmation.
9.  **Dependency hygiene:** use maintained packages, lock dependencies,
    and explain any native dependencies.
10. **Privacy documentation:** state where notes, index data, chat
    history, model prompts, and model outputs are stored.

### Privacy UX

-   Label the active AI provider as **Local** or **Cloud**.
-   If cloud support is added in the future, show which data will be
    sent before the first use and provide a clear opt-in.
-   Avoid absolute "100% private" claims; describe the actual data flow
    and limitations.

------------------------------------------------------------------------

## 11. Error states and edge cases

The UI must handle, not hide, these cases:

-   No vault selected.
-   Empty vault.
-   No Markdown files.
-   Note deleted or moved outside the app.
-   Duplicate filename.
-   Filesystem read/write permission denied.
-   Disk full or write failure.
-   Malformed/very large Markdown file.
-   Ollama not installed or not running.
-   No local model installed.
-   Model unavailable or request times out.
-   User cancels generation.
-   Invalid response from the AI runtime.
-   Index is stale or corrupted.
-   Source note deleted after an answer was generated.
-   Unsupported file type during import.
-   App is closed during a save or indexing task.

For all error states, preserve user input where possible and offer a
clear recovery action.

------------------------------------------------------------------------

## 12. Non-functional requirements

### Reliability

-   Never silently discard unsaved note edits.
-   Save state must be visible.
-   Rebuilding the index must not modify source notes.
-   Critical filesystem operations must be tested.

### Performance

-   App shell and file tree should feel responsive on a typical
    developer laptop.
-   Large indexing operations should not freeze the editor.
-   AI latency depends on the user's model and hardware; show a loading
    state rather than promising instant output.

### Maintainability

-   Use TypeScript types and clear interfaces.
-   Keep UI, filesystem, AI, indexing, and retrieval responsibilities
    separate.
-   Avoid a single enormous component or file.
-   Keep dependencies justified and limited.

### Portability

-   Notes must remain usable outside SlothMind.
-   Document vault layout and backup method.
-   Do not require a proprietary account to read local files.

### Observability

-   Provide useful local error messages and safe diagnostic logs.
-   Do not log full note contents or prompts by default.
-   Make debugging possible without exposing sensitive user content.

------------------------------------------------------------------------

## 13. MVP acceptance criteria

The MVP is considered ready for a demo when all of these are true:

1.  The app launches successfully in the supported development
    environment.
2.  A user can create a vault and a Markdown note.
3.  The note is saved as an ordinary local `.md` file.
4.  The user can close and reopen the app and the note persists.
5.  The user can edit, rename, search, and open notes without corrupting
    them.
6.  The app clearly indicates save state and handles save errors.
7.  The user can detect an unavailable Ollama runtime and receives
    helpful setup instructions.
8.  The user can select an actually installed model.
9.  Chat responses stream from the local model; there are no fabricated
    demo responses.
10. The user can summarize or rewrite a note, review the result, and
    save it as a new note.
11. Vault Q&A retrieves actual notes and provides citations that open
    those notes.
12. The assistant acknowledges when relevant information cannot be
    found.
13. Core notes and search remain usable without internet access.
14. The app does not silently send note content to remote services.
15. The README explains setup, runtime/model setup, limitations, and
    demo workflow.
16. Build/type checks and the available automated tests pass.
17. A short demo shows the complete workflow from note creation to cited
    AI answer.

If semantic embeddings cannot be implemented reliably within the first
delivery window, a well-tested keyword retrieval baseline with source
citations is acceptable for the first MVP. Record semantic retrieval as
the next milestone rather than shipping a broken approximation.

------------------------------------------------------------------------

## 14. Suggested implementation phases

These phases are ordered by dependency. Time estimates are intentionally
not guaranteed; adapt to the current deadline and repository state.

### Phase 0 --- Inspect and bootstrap

-   Inspect existing repository and runtime.
-   Choose the appropriate package manager and lockfile.
-   Create the Tauri + React + TypeScript baseline if needed.
-   Establish lint, typecheck, test, and build commands.
-   Create initial README and architecture notes.

**Exit criteria:** clean starter app builds.

### Phase 1 --- Workspace foundation

-   Main layout and navigation.
-   Vault create/open flow.
-   File explorer.
-   Markdown create/edit/save.
-   Basic full-text search.
-   Empty states and file-operation error handling.

**Exit criteria:** local notes work without AI.

### Phase 2 --- Local AI

-   Ollama health check.
-   Model list and selection.
-   Streaming chat.
-   Summarize/rewrite actions.
-   Cancellation and error states.
-   Model setup documentation.

**Exit criteria:** a real local model produces responses through the
app.

### Phase 3 --- Ask your vault

-   Chunk and index Markdown content.
-   Retrieval service.
-   Context-limited prompts.
-   Citation validation and navigation.
-   Insufficient-evidence behavior.
-   Index refresh/rebuild.

**Exit criteria:** a question about sample notes returns a grounded
answer with working citations.

### Phase 4 --- Polish and submission

-   Keyboard shortcuts and visual consistency.
-   Error handling and tests.
-   Verify local/offline behavior.
-   Create realistic sample vault.
-   Write README, screenshots, and demo recording.
-   Draft DEV.to article and verify official submission requirements.

**Exit criteria:** repeatable end-to-end demo and reproducible setup
instructions.

### Phase 5 --- Post-MVP validation

-   Gather feedback from developers/researchers.
-   Measure which workflows are repeatedly used.
-   Improve retrieval quality.
-   Add backlinks/graph or research workflows based on demand.
-   Test willingness to pay before building billing.

### Phase 6 --- Monetization

-   Optional hosted AI provider and usage limits.
-   Optional encrypted sync/backup.
-   Account and entitlement layer only where required.
-   Transparent pricing and subscription cancellation behavior.
-   Keep the local core functional if the subscription expires.

------------------------------------------------------------------------

## 15. Hacktoberfest / launch context

The original motivation is the DEV Community Hacktoberfest Week 3
challenge, themed around "Slow and Steady" and using open-source AI to
reduce repetitive work.

The submission angle for SlothMind is:

> Developers repeatedly waste time searching old notes, debugging logs,
> project decisions, and research findings. SlothMind makes that
> knowledge searchable and actionable with local AI, while keeping the
> user's notes on their own machine.

A compelling demo should show: 1. A vault containing real sample project
notes. 2. A question asked in natural language. 3. Relevant source notes
retrieved. 4. A grounded answer with clickable citations. 5. A generated
summary or reusable note. 6. The local runtime/model status and honest
privacy behavior.

**Important deadline caveat:** the challenge deadline was discussed as
October 25, 2026, at 11:59 PM Pacific Time, corresponding to October 26,
2026, at 12:29 PM IST. The official page may show a closed submission
state. Verify the live official challenge page before claiming
eligibility or submitting. Do not assume a late submission will qualify.

Submission materials to prepare if the window permits: - Public
repository. - Working demo/video. - Installation and setup
instructions. - DEV.to article using the official challenge format and
required tag. - Clear explanation of the repetitive task being automated
and why open-source AI matters. - Accurate attribution for any reused
code/assets.

------------------------------------------------------------------------

## 16. Branding

### Product name

**SlothMind** --- provisional working name.

The name combines: - **Sloth:** calm, steady work and less repetitive
effort. - **Mind:** personal knowledge, memory, and AI.

### Tagline

**Your second brain. Your rules.**

### Supporting line

**Think less about organizing. Do more with what you know.**

### Visual direction

-   Charcoal/dark neutral base.
-   Restrained violet accent.
-   Optional subtle sloth mascot.
-   Professional developer tool, not a cartoon game.
-   Clean typography and high contrast.

Before a public launch, verify trademarks, domain availability,
package/repository naming, and existing products with similar names. Do
not assume availability based on a quick name brainstorm.

------------------------------------------------------------------------

## 17. Success metrics

Measure product utility before revenue:

### Activation

-   Can a new user create/open a vault and save a note in under a few
    minutes?
-   Can they connect a local model without unclear setup steps?

### Core utility

-   Do users successfully find old information with vault Q&A?
-   Do citations open the correct note?
-   Do users save AI-generated outputs as reusable notes?

### Reliability

-   Note save failures.
-   Indexing failures.
-   Runtime/model connection failures.
-   Broken citation rate.
-   Crashes or lost edits.

### Retention and monetization validation

-   Do users return to the product over multiple days?
-   Which workflows are used repeatedly?
-   Would users pay for advanced workflows, optional sync, or hosted AI?
-   What price do users accept after experiencing the product?

Do not invent benchmark numbers or claim product-market fit before
collecting evidence.

------------------------------------------------------------------------

## 18. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Scope becomes too large             Enforce P0-first delivery and defer
                                      graph, sync, billing, and agents.

  Local model is too slow or too      Let users choose models; document
  large                               small quantized options and context
                                      limits.

  AI hallucinations                   Retrieve source passages, validate
                                      citations, and abstain when
                                      evidence is missing.

  Notes get corrupted                 Use safe writes, preserve
                                      originals, test filesystem
                                      operations, and document backups.

  Ollama is unavailable               Show clear setup instructions and
                                      keep notes/search functional.

  RAG quality is weak                 Start with a reliable baseline,
                                      evaluate on sample questions, then
                                      improve chunking and embeddings.

  Open-source users expect all        Clearly document free core versus
  features free                       optional hosted services.

  Paid features feel artificial       Monetize real
                                      convenience/cost-bearing services
                                      and validate demand first.

  Name conflicts                      Verify trademarks and domains
                                      before public launch.

  Challenge window is closed          Verify official status; continue as
                                      an independent open-source launch
                                      if ineligible.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 19. Decisions already made

Treat these as the current product direction unless repository
constraints require a documented change:

-   Product name: **SlothMind** (working name).
-   Product category: local-first AI knowledge workspace.
-   Primary audience: developers and AI/ML researchers.
-   Inspiration: Obsidian-style local Markdown notes plus Notion
    AI-style assistance.
-   Core differentiation: AI can retrieve and reuse personal project
    knowledge with citations.
-   Local data format: Markdown files.
-   Initial local AI runtime: Ollama.
-   Initial metadata/index: SQLite.
-   Proposed UI stack: Tauri + React + TypeScript + Tailwind CSS.
-   Initial hardware target: Kali Linux, RTX 3050 4 GB.
-   Monetization direction: open-core/freemium; optional paid cloud AI,
    sync, backup, and advanced workflows later.
-   No mandatory account for the local core.
-   No cloud sync, billing, or full agent system in the MVP.
-   Build and demonstrate a working end-to-end flow before expanding
    features.

------------------------------------------------------------------------

## 20. Open questions to resolve during implementation

Do not block the first working MVP on every question. Choose sensible
defaults and document them.

1.  Which Markdown editor best preserves source Markdown while providing
    a polished experience?
2.  Which SQLite/FTS approach is compatible with the selected desktop
    architecture?
3.  Which local embedding model/runtime works reliably on the target
    machine?
4.  What exact chunking and citation-offset strategy is most robust?
5.  Should chat history be on by default, and how should users clear it?
6.  Which OS platforms should be supported after the initial Linux
    build?
7.  Which paid workflow, if any, has enough user demand to justify a
    subscription?
8.  Which domain and legal brand identity are available for SlothMind?

------------------------------------------------------------------------

## 21. First task for T3 Code

Start by inspecting the current repository and reporting: - Current
stack and package manager. - Existing implementation, if any. - Whether
the repository is empty or already scaffolded. - Required system
dependencies for the chosen desktop stack. - The smallest implementation
plan to reach the first acceptance milestone.

Then implement **Phase 0 and Phase 1** in working increments.

Do not generate the entire app as one unreviewable code dump. Do not add
cloud billing, cloud sync, or advanced graph features before local note
creation/editing/search is reliable.

The first demonstrable milestone is:

> Launch SlothMind → open/create a local vault → create a Markdown note
> → type and autosave → close and reopen → find the note through search.

Once that works, add the real local AI integration, then vault RAG with
validated citations.

**Definition of done:** a reproducible, honest, functional local-first
application---not just a beautiful mockup.
