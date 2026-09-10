# CI Workflows & Quality Gates

To ensure code stability and maintain a "completely green CI pipeline," you MUST run these quality gates locally before completing any coding task or finalizing a feature/fix. 

If you introduce any breakages in these checks, you must fix them before reporting the task as done. Adapt the commands based on the project's primary language (e.g., Go vs. TypeScript).

## 1. Local CI Checklist

Always execute the following checks in the project root:

1. Tests
2. Linting & Formatting
3. Compilation / Type Checking
4. Project-Specific Scripts
