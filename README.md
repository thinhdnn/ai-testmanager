# AI Test Manager - Playwright Integration

This module provides Playwright integration for the AI Test Manager, allowing automated test generation and execution using Playwright.

## Features

- Automatic Playwright project initialization
- Template-based test case generation
- Fixture management and generation
- Integration with Prisma database for test case and fixture management

## Project Structure

```
src/
  ├── lib/
  │   ├── playwright.service.ts    # Core Playwright integration service
  │   └── test-manager.service.ts  # Test management service
  ├── template/
  │   ├── test.template           # Template for test case files
  │   └── fixture.template        # Template for fixture files
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Usage

### Initialize a Playwright Project

```typescript
const testManager = new TestManagerService(projectRoot);
await testManager.initializePlaywrightProject(projectId);
```

### Generate Test Files

```typescript
const testManager = new TestManagerService(projectRoot);
await testManager.createTestFile(testCaseId);
```

### Generate Fixture Files

```typescript
const testManager = new TestManagerService(projectRoot);
await testManager.createFixtureFile(fixtureId);
```

## Templates

The module uses Handlebars templates for generating test and fixture files:

- `test.template`: Template for generating test case files
- `fixture.template`: Template for generating fixture files

## Database Integration

The module integrates with the following Prisma models:

- Project
- TestCase
- Fixture
- Step

## Development

1. Install development dependencies:
```bash
npm install --save-dev
```

2. Run TypeScript compiler in watch mode:
```bash
npm run dev
```

## Seeding Global Tags

The application supports a global tag repository that makes standard tags available to all projects. To seed the default global tags:

```bash
npm run seed-tags
```

This will create a special "Global Tags Repository" project and populate it with default tags like priority levels (high, medium, low) and test types (smoke, regression, api, ui, etc.).

These global tags will automatically be available in all projects when adding tags to test cases. 