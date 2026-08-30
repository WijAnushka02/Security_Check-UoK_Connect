# Student Project Showcase Portal

## Scenario

The Faculty of Computing requires a web application where students can showcase their academic and personal projects while recruiters can browse and discover talented students.

The system should support three types of users:

- **Students**
  - Login using WSO2 Asgardeo
  - Create, edit, and delete project posts
  - Upload a project thumbnail/image
  - View projects created by other students

- **Recruiters**
  - Browse projects
  - Like projects
  - Follow students

- **Admin**
  - View all users and projects
  - Remove inappropriate projects

---

# Functional Requirements

## 1. Authentication (WSO2 Asgardeo)

Users must authenticate using **WSO2 Asgardeo**.

### Required User Information
- Name
- Email
- Profile Picture

Store all user details in the database.

---

## 2. Project Management (Request / Response)

Students should be able to:

- Create a project
- Update a project
- Delete a project
- View all projects
- View a single project

### Example REST APIs

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/projects` | Create a new project |
| GET | `/projects` | Get all projects |
| GET | `/projects/:id` | Get project by ID |
| PUT | `/projects/:id` | Update a project |
| DELETE | `/projects/:id` | Delete a project |

---

## 3. Event-Driven Component

Generate events whenever:

- A project is created
- A project receives a like

### Example Events

- `ProjectCreated`
- `ProjectLiked`

These events should trigger one of the following:

- Notification creation
- Activity log entry

### Example Notification

```
John liked your project.
```

Students may implement this using:

- EventEmitter
- Simple Publish/Subscribe (Pub/Sub) Pattern

---

## 4. Notifications

Display notifications generated only through events.

### Examples

- Mary liked your project.
- Alex started following you.

Notifications **must not** be created directly from controllers. They should only be generated through the event system.

---

## 5. Database

Suggested database tables:

- users
- projects
- likes
- followers
- notifications

---

# Technical Requirements

## Frontend

Use one of the following:

- React
- Vue
- Angular
- Any other suitable frontend framework

The frontend must demonstrate:

- API Calls
- WSO2 Asgardeo Authentication Flow
- Form Validation
- State Management

---

## Backend

Use one of the following:

- Node.js + Express
- NestJS
- Java
- Any other suitable backend framework

The backend must demonstrate:

- REST APIs
- Middleware
- Authorization
- Event Handling

---

# Deliverables

- Source Code
- API Documentation
- Deployment URL
- Demo Presentation

---

# Marking Scheme (100 Marks)

| Area | Marks |
|------|------:|
| Requirement Gathering | 10 |
| Frontend UI | 10 |
| REST API Design | 10 |
| OIDC Implementation | 10 |
| Event-Driven Architecture | 15 |
| Database Design | 10 |
| Security & Authorization | 10 |
| Documentation | 5 |
| Additional Features | 10 |
| Deployment | 10 |

**Total: 100 Marks**

---

# Suggested Tech Stack

## Frontend
- React
- Axios
- React Router
- Context API / Redux
- Tailwind CSS or Bootstrap

## Backend
- Node.js
- Express.js
- WSO2 Asgardeo (OIDC)
- EventEmitter
- JWT Authentication

## Database
- PostgreSQL
- Prisma ORM or Sequelize

## Storage
- Cloudinary (Image Upload)
- Multer

## Deployment
- Frontend: Vercel / Netlify
- Backend: Render / Railway
- Database: Neon PostgreSQL / Supabase PostgreSQL