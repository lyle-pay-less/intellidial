# Knowledge Base Template

This is a template for creating knowledge base documents that the Back Office Assistant will use.

## Structure

Each knowledge base document should follow this structure:

```markdown
# [Topic Name]

## Overview
Brief description of what this covers.

## Key Concepts
- Concept 1: Explanation
- Concept 2: Explanation

## How It Works
Step-by-step explanation.

## Common Questions
### Q: [Question]
A: [Answer]

### Q: [Question]
A: [Answer]

## Troubleshooting
### Issue: [Problem]
**Solution**: [How to fix]

## Best Practices
- Practice 1
- Practice 2

## Related Topics
- Link to other KB articles
```

## Example: Dashboard Page

```markdown
# Dashboard Overview

## Overview
The Dashboard is the main landing page after login. It shows high-level metrics and project overview.

## Key Metrics Shown
- Contacts uploaded
- Calls made
- Successful calls
- Unsuccessful calls
- Time saved
- Money saved

## How It Works
1. User logs in → redirected to Dashboard
2. Dashboard fetches stats from `/api/dashboard/stats`
3. Shows KPIs, charts, and project list
4. User can filter by time period (all, week-over-week, month-over-month)
5. User can filter by specific projects

## Common Questions
### Q: Why don't I see any data?
A: You need to create a project and upload contacts first. Go to Projects → Create Project.

### Q: How do I filter by project?
A: Use the project filter dropdown at the top of the Dashboard page.

## Troubleshooting
### Issue: Stats not updating
**Solution**: 
1. Check if calls are actually running
2. Go to Projects → [Your Project] → Overview tab
3. Click "Sync calls" if needed
4. Refresh the Dashboard

## Best Practices
- Check Dashboard daily to monitor progress
- Use filters to focus on specific projects
- Export data regularly for backup

## Related Topics
- [Projects Guide](./projects_guide.md)
- [Call Management](./call_management.md)
```

## Writing Guidelines

1. **Be Specific**: Use exact feature names, button labels, page names
2. **Include Examples**: Show actual UI elements, code snippets, or workflows
3. **Answer "Why"**: Don't just say what, explain why
4. **Use Simple Language**: Avoid jargon unless necessary
5. **Link Related Topics**: Help users discover related information
6. **Update Regularly**: Keep docs current with system changes

## Topics to Cover

### System Overview
- Architecture
- Data flow
- Key components

### Dashboard
- Overview page
- Metrics explained
- Filtering options

### Projects
- Creating projects
- Setting up instructions
- Managing contacts
- Running calls
- Viewing results

### Call Management
- Call queue
- Scheduling
- Status tracking
- Results analysis

### Team & Settings
- Team management
- User roles
- Settings configuration

### Troubleshooting
- Common errors
- Solutions
- Debugging steps

### Business Context
- Use cases
- Target personas
- Industry-specific guidance
