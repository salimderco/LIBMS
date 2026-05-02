# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.ts >> Can load login and submit demo data
- Location: e2e-tests\app.spec.ts:3:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
  navigated to "http://localhost:3000/"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e5]:
      - generic [ref=e7]:
        - img [ref=e9]
        - generic [ref=e11]:
          - paragraph [ref=e12]: Faculty Library
          - paragraph [ref=e13]: Management System
      - navigation [ref=e14]:
        - link "Dashboard" [ref=e15] [cursor=pointer]:
          - /url: /
          - img [ref=e16]
          - generic [ref=e21]: Dashboard
          - img [ref=e22]
        - link "Catalog" [ref=e24] [cursor=pointer]:
          - /url: /catalog
          - img [ref=e25]
          - generic [ref=e27]: Catalog
        - link "Catalog Management" [ref=e28] [cursor=pointer]:
          - /url: /catalog-management
          - img [ref=e29]
          - generic [ref=e31]: Catalog Management
        - link "All Loans" [ref=e32] [cursor=pointer]:
          - /url: /all-loans
          - img [ref=e33]
          - generic [ref=e36]: All Loans
        - link "Announcements" [ref=e37] [cursor=pointer]:
          - /url: /announcements-admin
          - img [ref=e38]
          - generic [ref=e41]: Announcements
        - link "Audit Log" [ref=e42] [cursor=pointer]:
          - /url: /audit-log
          - img [ref=e43]
          - generic [ref=e45]: Audit Log
        - link "Reports" [ref=e46] [cursor=pointer]:
          - /url: /reports
          - img [ref=e47]
          - generic [ref=e48]: Reports
        - link "Loan Policy" [ref=e49] [cursor=pointer]:
          - /url: /loan-policy
          - img [ref=e50]
          - generic [ref=e53]: Loan Policy
        - link "User Management" [ref=e54] [cursor=pointer]:
          - /url: /users
          - img [ref=e55]
          - generic [ref=e60]: User Management
        - link "My Profile" [ref=e61] [cursor=pointer]:
          - /url: /profile
          - img [ref=e62]
          - generic [ref=e65]: My Profile
      - generic [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e69]: SD
          - generic [ref=e70]:
            - paragraph [ref=e71]: Salim Derradj
            - text: ADMIN
        - button "Dark mode" [ref=e72]:
          - img
          - generic [ref=e73]: Dark mode
        - 'button "Language: English" [ref=e75]':
          - img
          - generic [ref=e76]: "Language: English"
        - button "Sign out" [ref=e77]:
          - img
          - text: Sign out
    - generic [ref=e78]:
      - button "Notifications" [ref=e81]:
        - img
      - main [ref=e82]:
        - generic [ref=e83]:
          - generic [ref=e84]:
            - heading "Good morning, Salim." [level=1] [ref=e85]
            - paragraph [ref=e86]: Here's what's happening in the library today.
          - generic [ref=e87]:
            - generic [ref=e90]:
              - generic [ref=e91]:
                - paragraph [ref=e92]: Total Books
                - paragraph [ref=e93]: "0"
              - img [ref=e94]
            - generic [ref=e98]:
              - generic [ref=e99]:
                - paragraph [ref=e100]: Total Users
                - paragraph [ref=e101]: "2"
              - img [ref=e102]
            - generic [ref=e109]:
              - generic [ref=e110]:
                - paragraph [ref=e111]: Active Loans
                - paragraph [ref=e112]: "0"
              - img [ref=e113]
            - generic [ref=e118]:
              - generic [ref=e119]:
                - paragraph [ref=e120]: Overdue
                - paragraph [ref=e121]: "0"
              - img [ref=e122]
          - generic [ref=e124]:
            - generic [ref=e126]:
              - img [ref=e127]
              - text: Most Borrowed Books
            - paragraph [ref=e132]: No borrowing data yet
          - generic [ref=e133]:
            - generic [ref=e134]:
              - generic [ref=e136]:
                - generic [ref=e137]:
                  - img [ref=e138]
                  - text: Popular Books
                - link "View all" [ref=e141] [cursor=pointer]:
                  - /url: /catalog
                  - text: View all
                  - img [ref=e142]
              - paragraph [ref=e145]: No data yet
            - generic [ref=e146]:
              - generic [ref=e149]:
                - img [ref=e150]
                - text: Recent Activity
              - paragraph [ref=e153]: No activity yet
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test("Can load login and submit demo data", async ({ page }) => {
  4  |   await page.goto("http://localhost:3000/login");
  5  | 
  6  |   // Verify the page loaded
  7  |   await expect(page).toHaveTitle(/Faculty Library Management System/i);
  8  | 
  9  |   // Use the correct seeded demo credentials
  10 |   await page.fill('input[type="email"]', "admin@university.edu");
  11 |   await page.fill('input[type="password"]', " password123");
  12 |   
  13 |   // Click submit and wait for the navigation to resolve
  14 |   await Promise.all([
> 15 |     page.waitForURL(/.*dashboard/, { timeout: 10000 }), // Increased timeout for backend response
     |          ^ TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
  16 |     page.click('button[type="submit"]'),
  17 |   ]);
  18 | 
  19 |   // Assert URL matches
  20 |   await expect(page).toHaveURL(/.*dashboard/);
  21 | });
```