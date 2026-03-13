# Student Dashboard -> Messages / Chat (deep)

**Module:** `student-dashboard`  
**Feature:** `messages-chat`  
**Route:** `/student-dashboard/chat`

This feature is the student chat interface for messaging instructors. It combines GraphQL message history, subscriptions, Redux unread state, and Socket.IO live behavior for typing and session updates.

## Purpose

- Let students chat directly with instructors they are connected to through bookings.
- Show message history and unread state.
- Provide real-time updates and typing indicators.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/student-dashboard/chat/index.tsx` | Main student chat page | Loads/coordinates selected conversation, message list, and send-message actions. |
| `Frontend/src/components/Chat/ChatList.tsx` | Conversation list | Displays available instructor conversations. |
| `Frontend/src/components/Chat/ChatWindow.tsx` | Message pane | Shows messages, composer, and typing state. |
| `Frontend/src/components/Chat/MessageItem.tsx` | Individual message row | Formats message bubble content and sender metadata. |
| `Frontend/src/store/slices/chatSlice.ts` | Redux chat state | Tracks unread counts, selected conversation, and related chat UI state. |
| `Frontend/src/utils/socket.ts` | Socket.IO client helper | Handles real-time message-related transport outside pure GraphQL. |
| `Frontend/src/hooks/useSockets.ts` | Socket bootstrap | Integrates authenticated socket behavior into the dashboard shell. |

## Frontend GraphQL

### Message history

- File: `Frontend/src/graphql/Queries/Chat.ts`
- Query field:
  - `GET_MESSAGES` → `getMessages(user1Id, user2Id)`

### Send message

- File: `Frontend/src/graphql/Queries/Chat.ts`
- Mutation field:
  - `SEND_MESSAGE` → `sendMessage(...)`

### Realtime GraphQL subscription

- File: `Frontend/src/graphql/Queries/Chat.ts`
- Subscription field:
  - `NEW_MESSAGE_SUBSCRIPTION` → `messageSent(user1Id, user2Id)`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/chat.typeDefs.js`
- Relevant fields:
  - `getMessages`
  - `sendMessage`
  - `messageSent`
  - declared conversation-related shapes used by the chat schema

### Resolvers

- File: `server/src/graphql/resolvers/chat.resolvers.js`
- Relevant resolvers:
  - `Query.getMessages`
  - `Mutation.sendMessage`
  - `Subscription.messageSent`
- The chat page also depends on booking-derived instructor lists built elsewhere in the frontend layout flow.

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/Message.js` | Persisted message history |
| `server/src/models/Conversation.js` | Conversation model |
| `server/src/socket/index.js` | Socket.IO server bootstrap and real-time transport |
| `server/src/models/studentBooking.model.js` | Booking relationships reused to infer valid student/instructor chat surfaces |

## Data flow

1. Student opens `/student-dashboard/chat`.
2. Layout/chat state determines which instructor conversations are available (derived from booked instructors and stored chat state).
3. `getMessages` loads message history for the selected conversation pair.
4. Sending a message calls `sendMessage`.
5. New messages appear through the GraphQL subscription and Socket.IO-driven realtime updates.
6. Redux unread state is cleared/updated as the student enters or leaves active conversations.

## Developer notes

- The student chat page does not rely on a fully mature dedicated “get all conversations” GraphQL path; conversation sourcing is partly derived from bookings and local chat state.
- Chat is one of the most shared modules across student and teacher dashboards, so UI or schema changes here usually affect both sides.
- Socket.IO and GraphQL subscriptions coexist in this feature; tracing live-message bugs often requires checking both.
