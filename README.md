## Seeding Global Tags

The application supports a global tag repository that makes standard tags available to all projects. To seed the default global tags:

```bash
npm run seed-tags
```

This will create a special "Global Tags Repository" project and populate it with default tags like priority levels (high, medium, low) and test types (smoke, regression, api, ui, etc.).

These global tags will automatically be available in all projects when adding tags to test cases. 