# Teacher Dashboard -> Messages / Chat (deep)

**Module:** `teacher-dashboard`  
**Feature:** `messages-chat`  
**Route:** `/teacher-dashboard/chat`

This module provides instructor-to-student chat with a conversation list, message window, Redux chat state, Apollo GraphQL messaging, and Socket.IO events.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/chat/index.tsx` | Chat route page | Connects Redux chat state to `ChatList` and `ChatWindow`; selects default conversation and clears unread state. |
| `Frontend/src/layouts/TeacherLayout.tsx` | Conversation seeding and socket setup | Builds teacher conversations from `GET_ALL_STUDENTS`; joins socket rooms and dispatches received messages. |
| `Frontend/src/components/Chat/ChatList.tsx` | Conversation list UI | Shows available chat threads. |
| `Frontend/src/components/Chat/ChatWindow.tsx` | Message thread UI | Uses GraphQL and socket integration for messages. |
| `Frontend/src/store/slices/chatSlice.ts` | Chat Redux slice | Stores conversations, selected conversation, unread state, and messages. |
| `Frontend/src/graphql/Queries/Chat.ts` | Chat GraphQL | Defines `GET_MESSAGES`, `SEND_MESSAGE`, `NEW_MESSAGE_SUBSCRIPTION`. |

## Frontend GraphQL

### Chat thread operations

- `GET_MESSAGES(user1Id: ID!, user2Id: ID!)`
- `SEND_MESSAGE(...)`
- `NEW_MESSAGE_SUBSCRIPTION`

These are consumed primarily by `ChatWindow.tsx`.

### Conversation source

- `GET_ALL_STUDENTS`
  - Used by `TeacherLayout.tsx`
  - Filters to students with lesson history and synthesizes conversation objects

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/chat.typeDefs.js`
- Relevant fields:
  - `getMessages`
  - `sendMessage`
  - `messageSent` subscription
- Also declared but not clearly wired in current app:
  - `getConversations`
  - `createConversation`

### Resolvers

- File: `server/src/graphql/resolvers/chat.resolvers.js`
- Relevant resolvers:
  - `Query.getMessages`
  - `Mutation.sendMessage`
  - `Subscription.messageSent`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/Message.js` | Message persistence |
| `server/src/models/Conversation.js` | Conversation storage |
| `server/src/socket/index.js` | Room joins, typing events, and real-time socket delivery |

## Data flow

1. Teacher layout loads students with bookings and converts them into chat conversations in Redux.
2. Chat page selects a default conversation if one is not already selected.
3. `ChatWindow` loads message history via `GET_MESSAGES`.
4. New messages are sent through `SEND_MESSAGE`.
5. Realtime updates arrive through Apollo subscription and socket events.
6. Redux state updates conversation/message lists and unread indicators.

## Developer notes

- Conversation list is not loaded from dedicated GraphQL conversation queries; it is built in `TeacherLayout.tsx` from students with lesson history.
- The schema declares some conversation operations that do not appear to be actively used by the current teacher chat UI.
