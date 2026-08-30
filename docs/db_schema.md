# UOK Connect — Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram

    users {
        SERIAL      id             PK
        VARCHAR255  google_id      UK  "nullable — legacy"
        VARCHAR255  name               "NOT NULL"
        VARCHAR255  email          UK  "NOT NULL"
        VARCHAR500  profile_pic
        VARCHAR20   role               "NOT NULL | CHECK: student|recruiter|admin | DEFAULT: student"
        VARCHAR50   student_id     UK  "nullable — students only"
        BOOLEAN     admin_verified     "NOT NULL | DEFAULT: false"
        BOOLEAN     is_blocked         "NOT NULL | DEFAULT: false"
        BOOLEAN     is_email_verified  "NOT NULL | DEFAULT: false"
        VARCHAR64   verification_token
        TIMESTAMP   verification_token_expires_at
        VARCHAR255  oidc_subject   UK  "nullable — Asgardeo ID"
        TIMESTAMP   created_at         "NOT NULL | DEFAULT: NOW()"
        TIMESTAMP   updated_at         "NOT NULL | DEFAULT: NOW() | auto-updated by trigger"
    }

    projects {
        SERIAL      id            PK
        INTEGER     user_id       FK  "NOT NULL → users.id ON DELETE CASCADE"
        VARCHAR255  title             "NOT NULL"
        TEXT        description       "NOT NULL"
        VARCHAR500  thumbnail_url
        VARCHAR500  github_url
        VARCHAR500  demo_url
        JSONB       tech_stack        "NOT NULL | DEFAULT: []"
        VARCHAR20   status            "NOT NULL | CHECK: draft|published | DEFAULT: published"
        INTEGER     view_count        "NOT NULL | DEFAULT: 0"
        TIMESTAMP   created_at        "NOT NULL | DEFAULT: NOW()"
        TIMESTAMP   updated_at        "NOT NULL | DEFAULT: NOW() | auto-updated by trigger"
    }

    project_tags {
        SERIAL      id         PK
        INTEGER     project_id FK  "NOT NULL → projects.id ON DELETE CASCADE"
        VARCHAR100  tag            "NOT NULL | UNIQUE(project_id, tag)"
    }

    likes {
        SERIAL      id         PK
        INTEGER     user_id    FK  "NOT NULL → users.id ON DELETE CASCADE"
        INTEGER     project_id FK  "NOT NULL → projects.id ON DELETE CASCADE"
        TIMESTAMP   created_at     "NOT NULL | DEFAULT: NOW()"
    }

    followers {
        SERIAL      id           PK
        INTEGER     follower_id  FK  "NOT NULL → users.id ON DELETE CASCADE"
        INTEGER     following_id FK  "NOT NULL → users.id ON DELETE CASCADE"
        TIMESTAMP   created_at       "NOT NULL | DEFAULT: NOW()"
    }

    notifications {
        SERIAL      id           PK
        INTEGER     recipient_id FK  "NOT NULL → users.id ON DELETE CASCADE"
        INTEGER     actor_id     FK  "nullable → users.id ON DELETE SET NULL"
        INTEGER     project_id   FK  "nullable → projects.id ON DELETE SET NULL"
        VARCHAR50   type             "NOT NULL | CHECK: like|follow|project_created"
        TEXT        message          "NOT NULL"
        BOOLEAN     is_read          "NOT NULL | DEFAULT: false"
        TIMESTAMP   read_at          "nullable — set when is_read flips to true"
        TIMESTAMP   created_at       "NOT NULL | DEFAULT: NOW()"
    }

    session {
        VARCHAR     sid     PK  "connect-pg-simple managed"
        JSON        sess        "NOT NULL — serialised session payload"
        TIMESTAMP6  expire      "NOT NULL — indexed for TTL cleanup"
    }

    users          ||--o{ projects       : "owns (user_id)"
    users          ||--o{ likes          : "gives (user_id)"
    users          ||--o{ followers      : "follows (follower_id)"
    users          ||--o{ followers      : "is followed by (following_id)"
    users          ||--o{ notifications  : "receives (recipient_id)"
    users          ||--o{ notifications  : "triggers (actor_id)"
    projects       ||--o{ project_tags   : "tagged with (project_id)"
    projects       ||--o{ likes          : "receives (project_id)"
    projects       ||--o{ notifications  : "referenced in (project_id)"
```

---

## Table Notes

### `users`
| Column | Notes |
|--------|-------|
| `role` | `'student'` can add/edit/delete projects · `'recruiter'` can like/follow · `'admin'` has full moderation access |
| `student_id` | Set after OAuth by the student on the `/complete-profile` page; stored in `sessionStorage` during the OAuth redirect and auto-submitted on return |
| `admin_verified` | Set to `TRUE` when an admin account is created via the secret-key flow |

### `projects`
| Column | Notes |
|--------|-------|
| `status` | `'published'` is the default; `'draft'` hides the project from public browse |
| `tech_stack` | JSONB array of strings, e.g. `["React", "Node.js", "PostgreSQL"]` |
| `view_count` | Incremented server-side on each `GET /api/projects/:id` call |

### `project_tags`
Separate table (not inlined in `projects`) to allow efficient tag-based filtering queries.  
`UNIQUE(project_id, tag)` prevents duplicate tags on the same project.

### `likes`
`UNIQUE(user_id, project_id)` enforces one like per user per project at the DB level.  
The API toggles (like → unlike) using this constraint.

### `followers`
`UNIQUE(follower_id, following_id)` prevents duplicate follows.  
`CHECK(follower_id <> following_id)` prevents self-follow at the DB level.

### `notifications`
Created **only** through the event system (`EventEmitter`), never directly from controllers.  
`actor_id` is nullable to support future system-generated notifications.  
`project_id` is nullable because follow notifications are not project-specific.  
`'comment'` notifications are created when a user comments on another user's project (see `comments` table below and `notificationHandler.js`).

### `session`
Managed entirely by `connect-pg-simple` / `express-session`.  
Used only for the short OAuth flow state (10-minute TTL).  
**Not** used for user authentication — that is handled by a JWT in an HTTP-only cookie.  
Has no FK to `users` by design.

---

## Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_projects_status_created` | `projects` | `(status, created_at DESC)` | `GET /projects` filter + sort |
| `idx_projects_user_id` | `projects` | `(user_id)` | `GET /users/:id/projects` |
| `idx_likes_project_id` | `likes` | `(project_id)` | Like-count subquery aggregate |
| `idx_project_tags_project_id` | `project_tags` | `(project_id)` | Tag join in project queries |
| `idx_notifications_recipient_read` | `notifications` | `(recipient_id, is_read)` | Fetch + mark-read queries |
| `idx_followers_following_id` | `followers` | `(following_id)` | Follower-count in user profile |
| `IDX_session_expire` | `session` | `(expire)` | TTL cleanup by connect-pg-simple |

Unique constraints (`UNIQUE(user_id, project_id)` on `likes`, `UNIQUE(follower_id, following_id)` on `followers`, `UNIQUE(project_id, tag)` on `project_tags`) are automatically backed by unique indexes.

---

## Constraint Summary

| Table | Constraint | Type |
|-------|-----------|------|
| `users` | `role IN ('student','recruiter','admin')` | CHECK |
| `projects` | `status IN ('draft','published')` | CHECK |
| `notifications` | `type IN ('like','follow','project_created')` | CHECK |
| `followers` | `follower_id <> following_id` | CHECK |
| `likes` | `(user_id, project_id)` | UNIQUE |
| `followers` | `(follower_id, following_id)` | UNIQUE |
| `project_tags` | `(project_id, tag)` | UNIQUE |
