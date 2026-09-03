# Rule: Always Display Real Discord Usernames in the Web Interface

## Principle

The web dashboard and all API responses that surface user data **must always display
human-readable Discord usernames**. Raw numeric Discord IDs (e.g. `120295328162381825`)
must **never** be shown in any user-facing page or JSON response.

## How Username Resolution Works

All username resolution is handled exclusively by **`UserService`**
(`src/application/services/UserService.ts`). Do not inline Discord API calls
or username lookups anywhere else in the codebase.

### Resolution Order (strictly enforced)

1. **D1 Cache (primary)** — `users.username` column, populated on every bot interaction.
2. **Discord REST API (fallback)** — only called for users who have never interacted
   with the bot. Results are written back to D1 immediately.
3. **"Unknown User" placeholder** — returned if both sources fail. Never expose a
   raw numeric ID.

## Implementation Rules

### Writing usernames (write-through cache)
- **Every Discord interaction** must call `userService.upsertUsername(discordId, username)`
  using the username from `interaction.member.user.global_name ?? interaction.member.user.username`.
- This call must be **fire-and-forget** (`.catch(() => {})` suffix) to avoid adding latency
  to bot command responses.
- Never store a username separately outside of `UserService` / the `users` table.

### Reading usernames (batch-first)
- Always call `userService.resolveUsernames(ids[], discordToken)` to resolve multiple IDs
  in a **single batch DB query** before falling back to per-ID API calls.
- Never call `userService.resolveUsername` (singular) in a loop — use `resolveUsernames`.

### Fallback placeholder
- If a username cannot be resolved, display **"Unknown User"** — never a numeric ID.

## Anti-Patterns (Forbidden)

```typescript
// ❌ NEVER do this — exposes raw IDs in the UI
return discordId;

// ❌ NEVER inline a Discord API call for username resolution
const res = await fetch(`https://discord.com/api/v10/users/${id}`, ...);

// ❌ NEVER loop resolveUsername
for (const id of ids) { await userService.resolveUsername(id, token); }
```

```typescript
// ✅ CORRECT — batch resolve via UserService
const usernameMap = await userService.resolveUsernames(allIds, c.env.DISCORD_TOKEN);
const display = usernameMap.get(discordId) ?? 'Unknown User';
```
