
# ✅ Technical Design Document – **AI Test Manager**

## 🎯 Objective
Build a web-based platform for managing manual and automated test cases. The system integrates AI to assist in test step suggestions and connects with Playwright to generate and execute real test files.

## 🧱 Tech Stack
| Layer         | Technology                          |
|---------------|--------------------------------------|
| Frontend      | Next.js 15+, TypeScript, Tailwind, Shadcn UI |
| Backend       | Next.js API Routes                   |
| Database      | Prisma + SQLite                      |
| AI Service    | OpenAI / Gemini / Grok               |
| Auth          | NextAuth or custom JWT               |
| RBAC          | Role → Permission per module         |
| Test Engine   | Playwright CLI                       |
| File System   | Node.js `fs` module                  |
| State Mgmt    | Zustand or React Context             |

## 🧩 Layout & Interface

### ⚙️ General Layout
| Component        | Description                                                |
|------------------|------------------------------------------------------------|
| Sidebar Menu     | Fixed left-side vertical menu with navigation              |
| Header           | Displays user info, logout button, and current project     |
| Main Content     | Dynamic based on route or selected tab                     |
| Tab Navigation   | Used inside Project Detail (e.g., Test Cases, Fixtures)    |
| Card Layout      | Used for Project, Fixture, and Test Case lists             |
| Data Table       | Supports sorting, filtering, and inline editing            |
| Modal/Dialog     | For create/update/delete actions                           |
| Toast/Sonner     | Displays success/error feedback                            |

### 📱 Responsive Design
| Small Device Behavior | Description                         |
|------------------------|-------------------------------------|
| Sidebar                | Hidden, toggled via menu button     |
| Tabs                   | Becomes dropdown on mobile          |
| Table View             | Horizontal scroll with hover detail |

## 📦 Folder Structure
```
/app
  /template
     test.template
     fixture.template
  /lib
    /playwright/playwright-service.ts
    /ai/ai-provider.ts
    /ai/ai-service.ts
    /ai/ai-settings.ts
    /auth/auth-utils.ts
    /rbac/check-permission.ts
    /rbac/use-permission.ts
  /components/ui
    datatable.tsx
    filter.tsx
  /projects
    page.tsx
    [projectId]/
      page.tsx
      /test-cases/
      /fixtures/
      /settings/
  /users
  /settings
/prisma
  schema.prisma
```

## 🧬 Data Model (Prisma Schema)
| Entity               | Description                                                |
|----------------------|------------------------------------------------------------|
| `Project`            | Represents a Playwright-managed test project               |
| `TestCase`           | Manual or automated test case                              |
| `Step`               | Action within a test case                                  |
| `Fixture`            | Reusable data or logic                                     |
| `TestResultHistory`  | Records of test runs                                       |
| `TestCaseVersion`    | Version history of test cases                              |
| `StepVersion`        | Version history of test steps                              |
| `User`, `Role`, `Permission` | Access control management                      |
| `Tag`                | Annotations like `@regression`, `@smoke`                   |

## 🔍 Feature Breakdown

### 🔹 0. Layout & Navigation [Top Priority]
| Feature                | Description                                         |
|------------------------|-----------------------------------------------------|
| Sidebar Menu           | Links to Dashboard, Projects, Users, Settings       |
| Project Detail Tabs    | Test Cases, Fixtures, Test History, Settings        |

### 🖥 1. Dashboard [Low Priority]
| Component       | Description                                            |
|------------------|--------------------------------------------------------|
| Charts           | Stats on projects, test cases, pass/fail, contributors |
| Analytics        | Visual trends, tag heatmap                            |

### 📁 2. Project Manager [High Priority]
| Feature           | Description                                                  |
|-------------------|--------------------------------------------------------------|
| View Mode         | Card layout with project name, env, URL, test stats          |
| Create Project    | Form: name, description, URL, environment                    |
| Notifications     | Sonner toasts on success/failure                             |

### 📂 3. Project Detail Tabs [High Priority]
| Tab              | Purpose                                       |
|------------------|-----------------------------------------------|
| Test Cases       | Manage test cases                             |
| Fixtures         | View reusable logic/data                      |
| Test History     | Execution logs                                |
| Settings         | Configure project-level options               |

### 🧪 4. Test Case Manager [High Priority]
| Feature           | Description                                                   |
|-------------------|---------------------------------------------------------------|
| Table View        | Columns: Name, Status, Tags, Created, Last Run, Actions       |
| Empty State       | CTA for creating a new test case                              |
| Create/Edit       | Form: name, status, tags, manual?, version tracking           |

### 🔍 5. Test Case Detail [High Priority]
| Feature         | Description                                                   |
|------------------|---------------------------------------------------------------|
| Metadata         | name, tags, status, last run                                 |
| Toolbar          | Actions: Back, Edit, Clone, Run, View File                   |
| Step Table       | Columns: Order, Action, Data, Expected, Status, Actions      |
| Step Actions     | Add, Clone, Edit, Delete, Bulk, Import (AI)                  |

### 🧩 6. Step & Versioning [High Priority]
| Feature              | Description                                       |
|----------------------|---------------------------------------------------|
| Version Control      | Each test case and step is versioned              |
| Step ↔ Fixture Link  | Step can reference a fixture                      |
| Restore Version      | Support reverting to previous version             |

### 🔧 7. Fixture Management [High Priority]
| Field               | Description                                 |
|---------------------|---------------------------------------------|
| name                | Fixture name                                |
| type (`data`/`logic`) | Type of content                            |
| exportName          | Used in generated test file                 |
| versioning          | Supported                                    |

### 📈 8. Test History [Medium Priority]
| Feature             | Description                                                  |
|----------------------|--------------------------------------------------------------|
| Run Logs            | status, error logs, video link, duration, CLI details        |
| Filter              | By user, time, status, environment                           |

### 🔐 9. RBAC – Role-Based Access Control [Top Priority]
| Resource     | Permissions                             |
|--------------|------------------------------------------|
| `project`    | view, update, delete, run                |
| `testcase`   | view, update, delete, run                |
| `system`     | settings                                 |
| `user`       | manage                                   |

### 👥 10. User Management [Top Priority]
| Feature           | Description                                          |
|-------------------|------------------------------------------------------|
| Table View        | name, role, status, created, created by              |
| Create User       | name, email, username, password, role                |
| User Actions      | Edit (non-username), disable/enable                  |

### ⚙️ 11. System Settings [Medium Priority]
| Tab                  | Description                                                   |
|----------------------|----------------------------------------------------------------|
| General              | System display name                                           |
| AI Settings          | API key, model selection (Gemini, OpenAI...), active toggle   |
| RBAC Editor          | Permission config per role → resource                         |

## ✅ Summary
- Sleek and minimal UI for QA, PMs, and devs.
- AI-powered test case creation and auto-complete for steps.
- Full versioning of test cases, steps, and fixtures.
- Generate & run real Playwright test files from the interface.


defaultValues: {
      // Basic Configuration
      timeout: 30000,
      expectTimeout: 5000,
      retries: 2,
      workers: "50%",
      fullyParallel: true,
      
      // Browser/Device configuration
      use: {
        baseURL: "",
        headless: true,
        viewport: {
          width: 1280,
          height: 720,
        },
        locale: "en-US",
        timezoneId: "UTC",
        video: "retain-on-failure",
        screenshot: "only-on-failure",
        trace: "retain-on-failure",
      },
    },