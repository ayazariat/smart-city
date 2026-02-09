# Smart City Database Schema

This document describes the complete MongoDB database schema for the Smart City application.

## Overview

- **Database**: MongoDB (using Mongoose ODM)
- **Collections**: 7 main collections
- **Relationships**: Referenced (ObjectId) with optional population

---

## Collections

### 1. Users Collection (`users`)

| Field       | Type     | Required    | Description                                                          |
| ----------- | -------- | ----------- | -------------------------------------------------------------------- |
| `_id`       | ObjectId | Auto        | Primary key                                                          |
| `fullName`  | String   | Yes         | User's full name                                                     |
| `email`     | String   | Yes, Unique | User's email address                                                 |
| `password`  | String   | Yes         | Hashed password                                                      |
| `role`      | String   | No          | User role (default: "CITIZEN")                                       |
|             |          |             | Options: `CITIZEN`, `MUNICIPAL_AGENT`, `DEPARTMENT_MANAGER`, `ADMIN` |
| `phone`     | String   | No          | Phone number                                                         |
| `isActive`  | Boolean  | No          | Account status (default: true)                                       |
| `createdAt` | Date     | Auto        | Creation timestamp                                                   |
| `updatedAt` | Date     | Auto        | Last update timestamp                                                |

**Indexes:**

- `email`: Unique index

---

### 2. Departments Collection (`departments`)

| Field         | Type     | Required    | Description            |
| ------------- | -------- | ----------- | ---------------------- |
| `_id`         | ObjectId | Auto        | Primary key            |
| `name`        | String   | Yes, Unique | Department name        |
| `description` | String   | No          | Department description |
| `email`       | String   | No          | Contact email          |
| `phone`       | String   | No          | Contact phone          |
| `createdAt`   | Date     | Auto        | Creation timestamp     |
| `updatedAt`   | Date     | Auto        | Last update timestamp  |

**Indexes:**

- `name`: Unique index

**Relationships:**

- Referenced by: `Complaint.assignedDepartment`, `RepairTeam.department`

---

### 3. RepairTeams Collection (`repairteams`)

| Field         | Type            | Required | Description                         |
| ------------- | --------------- | -------- | ----------------------------------- |
| `_id`         | ObjectId        | Auto     | Primary key                         |
| `name`        | String          | Yes      | Team name                           |
| `members`     | Array[ObjectId] | No       | Array of User references            |
| `department`  | ObjectId        | No       | Department reference                |
| `isAvailable` | Boolean         | No       | Availability status (default: true) |
| `createdAt`   | Date            | Auto     | Creation timestamp                  |
| `updatedAt`   | Date            | Auto     | Last update timestamp               |

**Relationships:**

- `members`: References `User` collection
- `department`: References `Department` collection
- Referenced by: `Complaint.assignedTeam`

---

### 4. Complaints Collection (`complaints`)

| Field                | Type          | Required | Description                                                                                    |
| -------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `_id`                | ObjectId      | Auto     | Primary key                                                                                    |
| `title`              | String        | Yes      | Complaint title                                                                                |
| `description`        | String        | Yes      | Detailed description                                                                           |
| `category`           | String        | No       | Issue category (default: "OTHER")                                                              |
|                      |               |          | Options: `ROAD`, `LIGHTING`, `WASTE`, `WATER`, `OTHER`                                         |
| `status`             | String        | No       | Complaint status (default: "SUBMITTED")                                                        |
|                      |               |          | Options: `SUBMITTED`, `VALIDATED`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REJECTED` |
| `priorityScore`      | Number        | No       | Priority calculation (default: 0)                                                              |
| `location`           | Object        | No       | Geo-location data                                                                              |
|                      | `latitude`    | Number   | Geographic latitude                                                                            |
|                      | `longitude`   | Number   | Geographic longitude                                                                           |
|                      | `address`     | String   | Physical address                                                                               |
| `photos`             | Array[String] | No       | Array of photo URLs                                                                            |
| `videos`             | Array[String] | No       | Array of video URLs                                                                            |
| `createdBy`          | ObjectId      | No       | User reference (complaint author)                                                              |
| `assignedDepartment` | ObjectId      | No       | Department reference                                                                           |
| `assignedTeam`       | ObjectId      | No       | RepairTeam reference                                                                           |
| `createdAt`          | Date          | Auto     | Creation timestamp                                                                             |
| `updatedAt`          | Date          | Auto     | Last update timestamp                                                                          |

**Relationships:**

- `createdBy`: References `User` collection
- `assignedDepartment`: References `Department` collection
- `assignedTeam`: References `RepairTeam` collection
- Referenced by: `Comment.complaint`, `Notification.complaint`, `Confirmation.complaint`

---

### 5. Comments Collection (`comments`)

| Field       | Type     | Required | Description                        |
| ----------- | -------- | -------- | ---------------------------------- |
| `_id`       | ObjectId | Auto     | Primary key                        |
| `content`   | String   | Yes      | Comment text                       |
| `author`    | ObjectId | No       | User reference                     |
| `complaint` | ObjectId | No       | Complaint reference                |
| `moderated` | Boolean  | No       | Moderation status (default: false) |
| `createdAt` | Date     | Auto     | Creation timestamp                 |
| `updatedAt` | Date     | Auto     | Last update timestamp              |

**Relationships:**

- `author`: References `User` collection
- `complaint`: References `Complaint` collection

---

### 6. Notifications Collection (`notifications`)

| Field       | Type     | Required | Description                  |
| ----------- | -------- | -------- | ---------------------------- |
| `_id`       | ObjectId | Auto     | Primary key                  |
| `message`   | String   | Yes      | Notification message         |
| `isRead`    | Boolean  | No       | Read status (default: false) |
| `recipient` | ObjectId | No       | User reference               |
| `complaint` | ObjectId | No       | Complaint reference          |
| `createdAt` | Date     | Auto     | Creation timestamp           |
| `updatedAt` | Date     | Auto     | Last update timestamp        |

**Relationships:**

- `recipient`: References `User` collection
- `complaint`: References `Complaint` collection

---

### 7. Confirmations Collection (`confirmations`)

| Field         | Type     | Required | Description                 |
| ------------- | -------- | -------- | --------------------------- |
| `_id`         | ObjectId | Auto     | Primary key                 |
| `type`        | String   | Yes      | Confirmation type           |
|               |          |          | Options: `ME_TOO`, `UPVOTE` |
| `confirmedBy` | ObjectId | No       | User reference              |
| `complaint`   | ObjectId | No       | Complaint reference         |
| `createdAt`   | Date     | Auto     | Creation timestamp          |
| `updatedAt`   | Date     | Auto     | Last update timestamp       |

**Relationships:**

- `confirmedBy`: References `User` collection
- `complaint`: References `Complaint` collection

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ _id, fullName, email, password, role, phone, isActive               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                              │                                    │
│         │                              │                                    │
│         │ 1                    N      │ N                                  │
│    ┌────┴────┐               ┌────────┴────────┐                           │
│    │ COMPLAINT│               │    COMMENTS      │                           │
│    │         │               │                  │                           │
│    │ _id     │               │ _id              │                           │
│    │ title   │               │ content          │                           │
│    │ desc    │               │ author ──────────┼───────────┐               │
│    │ status  │               │ complaint ───────┼───────────┼──┐              │
│    │ category│               │ moderated        │           │  │              │
│    │ location│               └──────────────────┘           │  │              │
│    │ photos  │                                             N  │  │              │
│    │ videos  │    ┌──────────────┐                         ┌──┴──┴──┐          │
│    │ createdBy├───►│ NOTIFICATIONS│                         │CONFIRMATIONS│      │
│    │ assignedDept│ │              │                         │            │      │
│    │ assignedTeam│ │ _id          │                         │ _id        │      │
│    └─────────────┘ │ message      │                         │ type       │      │
│                    │ isRead       │                         │ confirmedBy├──►Users│
│  ┌─────────────────┤ recipient ──►│                         │ complaint ─┼─►Complaints│
│  │ REPAIR TEAMS    │ complaint ───┼──────────────┐            └─────────────┘    │
│  │ ┌─────────────┐ └──────────────┘              │                                  │
│  │ │ _id         │                               │ N                                │
│  │ │ name        │                               │                                  │
│  │ │ members ────┼──────────► Users             │ 1                                │
│  │ │ department ─┼────────────► Departments     │                                  │
│  │ │ isAvailable │                               │                                  │
│  │ └─────────────┘                               │                                  │
│  └───────────────────────────────────────────────┘                                  │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐            │
│  │ DEPARTMENTS                                                          │            │
│  │ ┌─────────────────────────────────────────────────────────────────┐  │            │
│  │ │ _id, name, description, email, phone                           │  │            │
│  │ └─────────────────────────────────────────────────────────────────┘  │            │
│  │         │                    N                                     │            │
│  │         │ 1        ┌──────────┴──────────┐                         │            │
│  │         └─────────►│   REPAIR TEAMS      │                         │            │
│  │                  │                      │                         │            │
│  │                  │ _id, name, members,  │                         │            │
│  │                  │ department, isAvail   │                         │            │
│  │                  └──────────────────────┘                         │            │
│  └─────────────────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Examples

### 1. Citizen Submits a Complaint

1. **User** creates a `Complaint` document with:
   - `createdBy`: User's ObjectId
   - `status`: "SUBMITTED"
   - `category`: Selected category (e.g., "ROAD")

2. **System** may create `Notification` for municipal agents

### 2. Complaint Assignment

1. **Department Manager** validates and assigns to department:
   - Update `Complaint.assignedDepartment`
   - Update `status` to "VALIDATED" → "ASSIGNED"

2. **Department Manager** assigns to repair team:
   - Update `Complaint.assignedTeam`

### 3. Confirmation/Voting

1. **User** confirms a complaint:
   - Create `Confirmation` document with:
     - `confirmedBy`: User's ObjectId
     - `complaint`: Complaint's ObjectId
     - `type`: "ME_TOO" or "UPVOTE"

### 4. Commenting

1. **User** adds comment to complaint:
   - Create `Comment` document with:
     - `author`: User's ObjectId
     - `complaint`: Complaint's ObjectId
     - `content`: Comment text

---

## Index Recommendations

For optimal query performance, consider adding:

```javascript
// Users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });

// Departments
db.departments.createIndex({ name: 1 }, { unique: true });

// RepairTeams
db.repairteams.createIndex({ department: 1 });
db.repairteams.createIndex({ isAvailable: 1 });

// Complaints
db.complaints.createIndex({ createdBy: 1 });
db.complaints.createIndex({ assignedDepartment: 1 });
db.complaints.createIndex({ assignedTeam: 1 });
db.complaints.createIndex({ status: 1 });
db.complaints.createIndex({ category: 1 });
db.complaints.createIndex({ 'location.latitude': 1, 'location.longitude': 1 });

// Comments
db.comments.createIndex({ complaint: 1 });
db.comments.createIndex({ author: 1 });

// Notifications
db.notifications.createIndex({ recipient: 1 });
db.notifications.createIndex({ isRead: 1 });

// Confirmations
db.confirmations.createIndex({ complaint: 1 });
db.confirmations.createIndex({ confirmedBy: 1 });
db.confirmations.createIndex(
  { complaint: 1, confirmedBy: 1 },
  { unique: true }
);
```
