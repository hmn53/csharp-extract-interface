# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

C# Essentials is a VS Code extension providing refactoring tools and quality-of-life improvements for C# developers. Current features include extracting interfaces from C# classes - parsing the class, generating an interface with public methods and events, creating the interface file, and updating the original class to implement it.

## Common Commands

```bash
# Build the extension (webpack)
npm run compile

# Run tests (requires compile-tests first)
npm run pretest && npm test

# Run tests only (if already compiled)
npm test

# Lint the code
npm run lint

# Watch mode for development
npm run watch

# Package for production
npm run package
```

## Architecture

The extension has two main source files:

- **src/extension.ts**: VS Code integration layer
  - Registers the `csharp.extractInterface` command
  - Implements `ExtractInterfaceCodeActionProvider` for Ctrl+. quick actions (triggered on `public class` declarations)
  - Handles file I/O: prompts for interface name, creates interface file, updates original class file

- **src/logic.ts**: Pure parsing and generation logic (no VS Code dependencies)
  - `generateInterfaceCode()`: Parses C# class text using regex, extracts public methods and events, generates interface code with namespace and usings
  - `updateClassToImplementInterface()`: Modifies class declaration to implement the interface, handles both regular classes and primary constructors, preserves existing inheritance

## Testing

Tests use Mocha via `@vscode/test-cli`. Test files are in `src/test/`:
- `logic.test.ts`: Unit tests for the parsing/generation logic
- `extension.test.ts`: Integration tests for VS Code commands

Tests run in a VS Code instance. The test configuration is in `.vscode-test.mjs`.

## Key Implementation Details

- Interface detection: Regex `/public\s+class\s+\w+/` triggers the code action
- Method extraction: Regex captures return type, method name, generics, and parameters; excludes constructors by matching against class name
- Event extraction: Separate regex for `public event` declarations
- Primary constructor support: Special regex handles C# 12 primary constructors with parameters in class declaration
