# Contributing to CRMOrbit

Thank you for your interest in contributing to CRMOrbit!

## Development Setup

1. Clone the repository
2. Navigate to the CRMOrbit directory
3. Install dependencies:
   ```bash
   cd CRMOrbit
   npx expo install
   ```

## Code Quality

This project uses automated code quality tools to maintain consistency:

### Pre-commit Hooks

We use [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automatically format and lint code before each commit.

When you commit changes, the following will run automatically:
- **Prettier**: Formats your code according to project standards
- **ESLint**: Checks and auto-fixes linting issues

The pre-commit hook is configured to run on all TypeScript files (`*.ts`, `*.tsx`).

### Manual Code Quality Commands

You can also run these tools manually:

```bash
# Run ESLint (with auto-fix)
npm run lint -- --fix

# Format all files with Prettier
npx prettier --write "**/*.{ts,tsx}"
```

### How Pre-commit Hooks Work

1. When you run `git commit`, husky intercepts the command
2. lint-staged runs on staged files matching the configured patterns
3. Prettier formats the files
4. ESLint checks and fixes linting issues
5. If successful, the commit proceeds
6. If there are errors, the commit is blocked and you'll see the error messages

### Bypassing Pre-commit Hooks

In rare cases where you need to bypass the pre-commit hook (not recommended):

```bash
git commit --no-verify -m "your message"
```

**Note**: Only use `--no-verify` when absolutely necessary, as it skips important code quality checks.

## Testing

Run the test suite:

```bash
npm test

# Or in watch mode
npm run test:watch
```

## Commit Message Guidelines

We follow conventional commit format for clear and semantic commit history:

- `feat:` New features
- `fix:` Bug fixes
- `refactor:` Code refactoring
- `docs:` Documentation changes
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Example:
```
feat(contacts): add search functionality to contacts list
```

## Pull Request Process

1. Create a feature branch from `master`
2. Make your changes
3. Ensure all tests pass
4. Ensure code passes linting (pre-commit hooks will help with this)
5. Submit a pull request with a clear description of changes

## Questions?

If you have questions about contributing, please open an issue for discussion.
