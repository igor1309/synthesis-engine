### **Project Blueprint: The "Synthesis Engine"**

*   **The Goal:** To create an AI-powered utility that reads all your disparate notes from your `inbox` folders and generates a single, multi-faceted "synthesis memo" to reveal hidden themes, challenge ideas, and spark new connections.

*   **The AI Persona:** A hybrid of an **Objective Synthesizer** and a **Critical Thinker**. It first neutrally identifies patterns and connections, then rigorously stress-tests the ideas for conflicts and weaknesses.

*   **The End-to-End Workflow:**
    1.  A "collector" script reads a `config/repos.txt` file and uses a GitHub PAT to access your private repositories.
    2.  The collector gathers all markdown files from the `inbox` folder of each specified repository.
    3.  Your existing `scripts/repo2md.sh` script is used to format the collected files into a single, large `context.md` file.
    4.  A core script reads `context.md`, injects it into a sophisticated master prompt, and sends it to the OpenAI API in a single call.
    5.  The AI's response is saved as a new, verifiable Markdown file: `synthesis_memo.md`.

*   **The Output Format:** A "Referenced & Verifiable" Markdown memo with two distinct sections:
    *   **Part 1: Objective Synthesis:** Identifies emergent themes and surprising cross-domain connections, with every point referencing the source file(s).
    *   **Part 2: Critical Analysis:** Identifies conflicting ideas, potential counter-arguments, and weaknesses in the notes, again with verifiable references.
