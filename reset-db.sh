#!/bin/bash

# Reset Prisma Database Script
# This script can:
# 1. Reset the entire database
# 2. Delete a specific project by ID
# 3. Delete a specific test case by ID

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help                  Show this help message"
    echo "  -r, --reset                 Reset entire database and seed with initial data"
    echo "  -p, --project <project_id>  Delete a specific project by ID"
    echo "  -t, --test-case <test_id>   Delete a specific test case by ID"
    echo "  -l, --list                  List all projects and test cases"
    echo ""
    echo "Examples:"
    echo "  $0 --reset                  Reset the entire database"
    echo "  $0 --project abc-123        Delete project with ID abc-123"
    echo "  $0 --test-case xyz-456      Delete test case with ID xyz-456"
    echo "  $0 --list                   List all projects and test cases"
    exit 1
}

# Check if prisma is installed
if ! command -v npx &> /dev/null; then
    echo "Error: npx is not installed. Please install Node.js and npm."
    exit 1
fi

# Function to reset the entire database
reset_database() {
    echo "Starting Prisma database reset process..."
    
    # Delete contents of playwright-projects folder
    echo "Deleting contents of playwright-projects folder..."
    if [ -d "playwright-projects" ]; then
        rm -rf playwright-projects/*
        echo "Successfully cleared playwright-projects folder."
    else
        echo "Warning: playwright-projects folder not found."
    fi
    
    # Using prisma db push to sync schema directly
    echo "Executing: prisma db push --force-reset"
    echo "This will drop the database, recreate it, and apply the current schema"
    npx prisma db push --force-reset
    
    # Generate Prisma client
    echo "Generating Prisma client..."
    npx prisma generate
    
    echo "Seeding roles..."
    # Add a package.json script for seeding roles
    npm run seed:roles

    # Then seed the database
    echo "Seeding the database with initial data..."
    npm run seed:db
    
    # Seed default tags
    echo "Seeding default global tags..."
    npm run seed-tags
    
    echo "Database reset complete!"
    echo "You can now log in with:"
    echo "  - Admin user: username 'admin', password 'admin123'"
    echo "  - Regular user: username 'user', password 'user123'"
    echo "✅ Process completed successfully."
}

# Function to delete a specific project
delete_project() {
    local project_id=$1
    
    echo "Deleting project with ID: $project_id"
    
    # Create and execute a Node.js script to delete the project
    cat > delete_project.js << EOF
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteProject() {
  try {
    // First check if the project exists
    const project = await prisma.project.findUnique({
      where: { id: '$project_id' },
      include: { testCases: true }
    });
    
    if (!project) {
      console.error('Error: Project with ID $project_id not found');
      process.exit(1);
    }
    
    console.log(\`Found project: \${project.name} with \${project.testCases.length} test cases\`);
    
    // Delete the project (will cascade delete test cases and steps due to schema setup)
    const result = await prisma.project.delete({
      where: { id: '$project_id' },
    });
    
    console.log(\`Successfully deleted project: \${result.name}\`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

deleteProject();
EOF
    
    # Execute the Node.js script
    node delete_project.js
    
    # Clean up the temporary script
    rm delete_project.js
}

# Function to delete a specific test case
delete_test_case() {
    local test_id=$1
    
    echo "Deleting test case with ID: $test_id"
    
    # Create and execute a Node.js script to delete the test case
    cat > delete_test_case.js << EOF
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestCase() {
  try {
    // First check if the test case exists
    const testCase = await prisma.testCase.findUnique({
      where: { id: '$test_id' },
      include: { testSteps: true, project: true }
    });
    
    if (!testCase) {
      console.error('Error: Test case with ID $test_id not found');
      process.exit(1);
    }
    
    console.log(\`Found test case: \${testCase.name} with \${testCase.testSteps.length} steps\`);
    console.log(\`Belongs to project: \${testCase.project.name}\`);
    
    // Delete the test case (will cascade delete test steps due to schema setup)
    const result = await prisma.testCase.delete({
      where: { id: '$test_id' },
    });
    
    console.log(\`Successfully deleted test case: \${result.name}\`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

deleteTestCase();
EOF
    
    # Execute the Node.js script
    node delete_test_case.js
    
    # Clean up the temporary script
    rm delete_test_case.js
}

# Function to list all projects and test cases
list_items() {
    echo "Listing all projects and test cases..."
    
    # Create and execute a Node.js script to list projects and test cases
    cat > list_items.js << EOF
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listItems() {
  try {
    // Get all projects with their test cases
    const projects = await prisma.project.findMany({
      include: { 
        testCases: {
          include: {
            testSteps: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (projects.length === 0) {
      console.log('No projects found in the database.');
      return;
    }
    
    console.log('=== PROJECTS ===');
    projects.forEach((project, index) => {
      console.log(\`\${index + 1}. Project ID: \${project.id}\`);
      console.log(\`   Name: \${project.name}\`);
      console.log(\`   URL: \${project.url}\`);
      console.log(\`   Environment: \${project.environment}\`);
      console.log(\`   Test Cases: \${project.testCases.length}\`);
      
      if (project.testCases.length > 0) {
        console.log('   --- Test Cases ---');
        project.testCases.forEach((testCase, idx) => {
          console.log(\`   \${idx + 1}. Test Case ID: \${testCase.id}\`);
          console.log(\`      Name: \${testCase.name}\`);
          console.log(\`      Status: \${testCase.status}\`);
          console.log(\`      Steps: \${testCase.testSteps.length}\`);
        });
      }
      console.log('-------------------');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

listItems();
EOF
    
    # Execute the Node.js script
    node list_items.js
    
    # Clean up the temporary script
    rm list_items.js
}

# Check if no arguments were provided
if [ $# -eq 0 ]; then
    show_usage
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_usage
            ;;
        -r|--reset)
            reset_database
            exit 0
            ;;
        -p|--project)
            if [ -z "$2" ]; then
                echo "Error: Project ID is required"
                show_usage
            fi
            delete_project "$2"
            exit 0
            ;;
        -t|--test-case)
            if [ -z "$2" ]; then
                echo "Error: Test case ID is required"
                show_usage
            fi
            delete_test_case "$2"
            exit 0
            ;;
        -l|--list)
            list_items
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            ;;
    esac
    shift
done 