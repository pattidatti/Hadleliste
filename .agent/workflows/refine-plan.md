---
description: Critique and refine implementation plans for higher quality output.
---

This workflow provides a structured approach to improving implementation plans before execution.

1. **Review Context**: Read the current `implementation_plan.md`, `task.md`, and `gemini.md` (if it exists) to understand the goals and project constraints.
2. **Technical Critique**: Evaluate the plan for:
   - **Architectural Fit**: Does it follow the project's established patterns (e.g., hooks for logic, components for UI)?
   - **Efficiency**: Are there more optimized ways to handle state or database interactions?
   - **Security**: Are Firebase rules, authentication, or sensitive data handled correctly?
   - **Edge Cases**: Are loading states, error handling, and empty states addressed?
3. **UX & Aesthetic Review**: Ensure the proposal aligns with "Avant-Garde" and "Intentional Minimalism" (from `gemini.md`).
4. **Constructive Feedback**: Provide specific, actionable criticism in the chat.
   - **Preserve Detail**: Ensure the critique does not lead to a reduction in technical detail or granularity. More detail is generally better for implementation.
5. **Update Plan**: Modify `implementation_plan.md` and `task.md` to incorporate the improvements.
   - **Maintain Granularity**: Do not simplify or abstract away details during the update.
   - **Exception**: Only remove details if the corresponding feature or logic is being intentionally removed from the scope.
6. **Request Final Review**: Use `notify_user` to get approval on the refined plan.
