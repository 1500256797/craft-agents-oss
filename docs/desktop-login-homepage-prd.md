# Desktop Login Homepage PRD

## 1. Problem

The desktop client currently does not have a real account login homepage.

Current behavior:

- app starts,
- checks `getSetupNeeds()`,
- if billing / LLM credentials are not configured, it immediately opens onboarding,
- onboarding becomes the effective homepage.

This is not the desired product flow.

Target behavior:

- desktop should behave like the Web app,
- user should first land on a login page,
- only after successful login should the app enter the product,
- onboarding for model/API-key setup should happen only after login and only when needed.

## 1.1 Design Constraint

This work must follow one product rule:

- functionally reference the Web app,
- visually and interaction-wise remain consistent with the desktop Client.

That means:

- use Web as the source of truth for login flow and page order,
- do not copy the Web login page styling directly into desktop,
- build the desktop login experience using Client-native layout, panel language, motion, spacing, and component patterns.

## 2. Root Cause

The desktop app currently treats “account access” and “LLM setup completeness” as the same thing.

### Current desktop startup logic

Desktop startup is driven by:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/App.tsx`

Today it does this:

1. call `window.electronAPI.getSetupNeeds()`
2. if `isFullyConfigured` → enter app
3. else → open onboarding

### Why this is wrong

`getSetupNeeds()` is not a user login check.

It is currently derived from:

- billing auth type,
- LLM credential presence,
- workspace existence.

It does **not** represent:

- logged-in backend user,
- backend access token validity,
- current user identity,
- session refresh state.

So the current app confuses:

- `Can this user access the product?`

with:

- `Has this user configured an LLM connection yet?`

## 3. Evidence

### Desktop current behavior

Startup check in:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/App.tsx`

The app directly decides between:

- `ready`
- `onboarding`

based on `getSetupNeeds()`.

### Desktop auth model today

`getAuthState()` / `getSetupNeeds()` are defined around billing configuration:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/packages/shared/src/auth/state.ts`

Current `getSetupNeeds()` only checks:

- `needsBillingConfig`
- `needsCredentials`
- `isFullyConfigured`

This is LLM setup state, not product account login state.

### Web correct behavior

Web has a real login page:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/login/page.tsx`

and route protection:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/app/(agent)/agent-module/layout.tsx`

Web uses real account endpoints:

- `/api/v1/login`
- `/api/v1/current/user`
- `/api/v1/current/logout`
- `/api/v1/current/refresh-token`

from:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-web/lib/api/rbac/auth.ts`

This is the correct product shape.

## 4. Product Goal

Desktop should follow this flow:

1. app launch
2. check account login state
3. if not logged in → show desktop login page
4. if logged in → fetch current user
5. then check product setup state
6. if LLM/model setup incomplete → show onboarding
7. otherwise → enter desktop app

In short:

- login is the homepage,
- onboarding is a post-login setup step,
- not the homepage.

## 5. Recommended State Model

### Add a new top-level account auth state

Current app state:

- `loading`
- `onboarding`
- `reauth`
- `ready`

Recommended app state:

- `loading`
- `login`
- `onboarding`
- `reauth`
- `ready`

### Separate two concerns explicitly

#### Concern A: Account auth state

Questions it answers:

- do we have a valid backend access token?
- can we fetch the current user?
- is this a logged-in product user?

#### Concern B: Product setup state

Questions it answers:

- does the user have a default LLM connection?
- are required credentials configured?
- is onboarding still needed?

These must no longer be derived from the same function.

## 6. Recommended Architecture

### 6.1 New desktop auth session layer

Introduce a dedicated desktop account session module.

Suggested responsibilities:

- persist backend access token / refresh token securely,
- expose `getCurrentUser()`,
- expose `login()`,
- expose `logout()`,
- expose `refreshToken()`,
- expose `hasValidSession()`.

### 6.2 Keep onboarding, but move it after login

Onboarding should stay for:

- first-time provider setup,
- API key entry,
- OAuth provider connection,
- local model setup.

But it should only run after account login succeeds.

### 6.3 Use Web backend auth contract

Desktop should align with Web auth APIs:

- `POST /api/v1/login`
- `GET /api/v1/current/user`
- `POST /api/v1/current/logout`
- `POST /api/v1/current/refresh-token`

Optional later:

- OAuth login
- captcha flow

## 7. Recommended UI Flow

### Launch flow

#### Case 1: not logged in

Show:

- desktop login page

Do not show:

- onboarding
- provider selection
- API key entry

#### Case 2: logged in, but setup incomplete

Show:

- onboarding

Do not show:

- login page

#### Case 3: logged in and setup complete

Show:

- normal desktop app

### Reauth flow

When backend token expires:

- do not send user straight into provider onboarding,
- send user to `reauth/login`,
- after reauth succeeds, re-evaluate setup state,
- then either go to onboarding or ready.

## 8. UI Recommendation

### Homepage should be a real desktop login page

Desktop login page should be product-aligned with Web, but visually aligned with Client.

Recommended content:

- username/email
- password
- captcha if backend requires it
- OAuth login button if enabled
- error states
- loading states

Optional:

- register entry
- forgot password

### Important product rule

The login page authenticates the **user account**.

It must not ask for:

- Anthropic key
- OpenAI key
- model selection
- provider selection

Those belong to onboarding or settings after login.

UI rule:

- `Function follows Web`
- `UI/UX follows Client`

## 9. Storage Recommendation

### Do not use browser-style localStorage auth as the primary desktop mechanism

Desktop should store account session secrets using a secure desktop-capable mechanism.

Recommended:

- reuse secure credential storage patterns already present in the repo,
- store access token / refresh token in secure storage,
- keep only non-sensitive derived session state in renderer memory.

Avoid:

- raw auth tokens in plain config files,
- renderer-owned token lifecycle as the source of truth.

## 10. Implementation Options

### Option A: Minimal graft

Approach:

- add a login screen before onboarding,
- add a basic backend token check,
- keep current onboarding logic mostly unchanged.

Pros:

- fastest path,
- minimal changes to product flow,
- corrects the homepage problem quickly.

Cons:

- leaves auth/setup logic somewhat fragmented,
- may create more cleanup later.

### Option B: Proper bootstrap split

Approach:

- introduce explicit account session state,
- separate account auth from setup needs,
- add login page,
- make startup flow:
  - `loading -> login/onboarding/ready`

Pros:

- correct architecture,
- scales better,
- makes future desktop account features much easier.

Cons:

- larger initial refactor.

### Option C: Full Web-auth parity

Approach:

- port Web auth flow almost 1:1 into desktop,
- including login, register, captcha, OAuth callback handling, and account pages.

Pros:

- most consistent with Web.

Cons:

- more work than necessary for the first step.

## 11. Recommended Option

Recommend **Option B: Proper bootstrap split**.

Reason:

- the current issue is architectural, not only visual,
- patching the UI without separating auth/setup would reintroduce confusion later,
- this is a foundational change and should be done cleanly once.

## 12. Concrete Startup State Machine

Recommended startup pseudoflow:

```text
launch app
  -> loading
  -> check account session
       -> if no valid session: login
       -> if valid session: fetch current user
            -> if fetch fails: reauth/login
            -> if fetch succeeds: check setup needs
                 -> if setup incomplete: onboarding
                 -> else: ready
```

## 13. Required Code Changes

### Renderer

Change:

- `/Users/ouhuang/Desktop/agent_server/chain-agent-client/apps/electron/src/renderer/App.tsx`

Needed:

- add `login` app state,
- stop using `getSetupNeeds()` as the first gate,
- insert account-session bootstrap before onboarding.

Add:

- desktop `LoginPage` or `LoginScreen`

### Main / IPC / transport

Need new RPC or ElectronAPI methods for:

- `login`
- `logout`
- `refreshAuthToken`
- `getCurrentUser`
- `getAccountSessionState`

Potentially:

- `getCaptchaId`
- `getCaptchaImage`
- `getOAuthURL`
- `completeOAuthLogin`

### Shared auth layer

Do not overload current `AuthState` in place unless carefully migrated.

Preferred:

- keep current setup/billing state for onboarding,
- add a separate account-session state model for product login.

## 14. Delivery Phases

### Phase 1: Bootstrap correction

- add login page,
- add account session check,
- change startup flow,
- keep onboarding intact after login.

### Phase 2: Reauth correctness

- token expiry should go to login/reauth,
- not to onboarding.

### Phase 3: Web parity enhancement

- add captcha,
- add OAuth login,
- optionally add register flow.

## 15. Final Decision

The desktop app homepage should not be onboarding.

Correct product order is:

- `Login first`
- `Onboarding second if needed`
- `App third`

That is the right model if desktop is going to align with Web as a real product surface rather than only a local agent shell.
