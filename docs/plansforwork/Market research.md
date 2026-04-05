# Market research

## Subject
Source review of Telegram Android, Telegram X, and Telegram Desktop as of April 4, 2026, with emphasis on implementation ideas relevant to EmberChamber.

## Scope

This note is intentionally source-focused.

It does not treat Telegram as a product template for EmberChamber. Telegram and Telegram X are useful here as Android implementation references for:

- chat list performance
- conversation rendering
- media and attachment pipelines
- navigation structure
- separation of app state from UI surfaces

Telegram Desktop is useful mainly as a larger-screen and desktop workspace reference for:

- pane-based shell structure
- optional detail panes
- layered popups and detached tool surfaces
- denser context actions and search modes

They are not a fit for EmberChamber's product direction around:

- invite-only onboarding
- adults-only access
- local-first history
- private trusted-circle messaging
- small encrypted groups

## Repos reviewed

- Telegram Android: `https://github.com/DrKLO/Telegram`
- Telegram X: `https://github.com/TGX-Android/Telegram-X`
- Telegram Desktop: `https://github.com/telegramdesktop/tdesktop`

## Executive summary

- Telegram Android is the better reference for subsystem separation under heavy scale: storage, message state, notifications, image loading, file loading, and diffed chat-list updates all live in distinct modules.
- Telegram X is the better reference for controller boundaries and reusable Android screen infrastructure. Its codebase is still large, but the seams are easier to map onto a cleaner application architecture.
- Telegram Desktop is the better reference for pane-based workspace structure, optional detail panes, and detached tool surfaces like media viewer and call UI, but mostly for larger-screen work rather than the core phone shell.
- The most useful ideas for EmberChamber are architectural, not feature-based:
  - split chat, attachment, session, and navigation concerns into separate modules
  - virtualize and diff list updates instead of rendering whole lists eagerly
  - centralize attachment download, decrypt, cache, and open behavior
  - preserve scroll position and scroll anchors deliberately
  - build reusable screen infrastructure instead of letting the app root own every flow
  - keep larger-screen layouts ready for optional secondary panes instead of assuming one permanent full-screen stack everywhere
- The least useful ideas to copy directly are:
  - Java-style singleton-heavy event bus patterns
  - Telegram's cloud-history assumptions
  - Telegram's public discovery, large community, monetization, and bot surface area

## Telegram Android findings

### What stands out

- `MessagesStorage` is a dedicated storage layer with its own queue and lifecycle instead of UI components talking directly to persistence ad hoc.
- `MessagesController` is a long-lived domain controller for dialogs, unread state, typing state, and message lifecycle.
- `NotificationCenter` is a dedicated event hub with thread rules and observer management.
- `ImageLoader` and `FileLoader` are distinct media subsystems with caches, queues, progress tracking, and prioritization.
- `DialogsAdapter` and `RecyclerListView` are tuned for large lists through diffing and fast-scroll support.
- `ChatActivity` uses stable IDs and a dedicated adapter rather than mixing render logic with network and storage concerns.

### Why it matters

Telegram Android's codebase is very large and not something EmberChamber should emulate structurally. The useful lesson is that the app remains survivable because core responsibilities are isolated:

- storage is not owned by the chat screen
- file handling is not owned by the message bubble
- notification fan-out is not owned by the app entry point
- large lists are managed as list systems, not just mapped arrays

### Relevant source areas

- `MessagesStorage.java`
- `MessagesController.java`
- `NotificationCenter.java`
- `ImageLoader.java`
- `FileLoader.java`
- `DialogsAdapter.java`
- `RecyclerListView.java`
- `ChatActivity.java`

## Telegram X findings

### What stands out

- `TdlibManager` acts as a central runtime boundary for account, sync, notifications, and background task coordination.
- `MainActivity` boots the app, binds global listeners, and hands off quickly into controller-driven navigation.
- `NavigationController` and `MainController` provide a clearer navigation shell than the primary Telegram Android client.
- `ChatsController` and `MessagesController` separate list and conversation responsibilities at the screen level.
- `RecyclerViewController` gives many screens a shared recycler setup with insets, scroll-position restoration, and common layout behavior.
- `MessagesManager` sits between message UI and message loading logic, including preloading and scroll-state handling.

### Why it matters

Telegram X is still a large native Android codebase, but it is a better reference for layering:

- runtime/service layer
- navigation layer
- controller layer
- message/list manager layer
- view/adapters

That maps more cleanly to the kind of modular architecture EmberChamber needs than the more historically accreted primary Telegram Android app.

### Relevant source areas

- `MainActivity.java`
- `MainController.java`
- `NavigationController.java`
- `TdlibManager.java`
- `ChatsController.java`
- `RecyclerViewController.java`
- `MessagesController.java`
- `MessagesManager.java`
- `ChatsAdapter.java`
- `MessagesAdapter.java`

## Telegram X outside review synthesis

An additional outside review of Telegram X's current source helps clarify the screen map and why the codebase feels more structurally coherent than the main Telegram Android client.

### Screen-level picture

- `MainActivity` behaves as a router and launch shell, deciding between intro, phone auth, and the signed-in app shell.
- `MainController` is the signed-in shell, organized around a pager-style top-level surface instead of a stack of unrelated pages.
- the main signed-in sections are oriented around chats, calls, and people, with shared shell behavior around them
- the floating primary action changes by section instead of being one global static compose button
- `ChatsController` is a dedicated inbox surface with archive handling, pinned ordering, search, preview behavior, and scroll-to-top hooks
- `MessagesController` is the thread surface, but it is supported by surrounding managers and controller infrastructure rather than trying to own every messaging concern directly

### What this reinforces

- Telegram X's most useful lesson is that the signed-in app shell is a real subsystem, not just a couple of tab state variables in the root component.
- Reusable list-controller infrastructure matters as much as the individual chat and settings screens.
- Section-specific action surfaces are cleaner than one root screen owning every compose, attach, and management trigger.
- Mode-based reuse is stronger when screen controllers share scroll restore, inset handling, preview interactions, and action wiring.
- Telegram X's custom navigation framework is not something to port literally, but its layering is a good reference for how EmberChamber should separate bootstrap, shell, screen, and manager responsibilities.

## tg / telegram-cli findings

### What stands out

- `vysheng/tg` is not a screen-based Telegram client. It is `telegram-cli`, a command-line interface that uses `readline`.
- there is no mobile-style app shell, page stack, tab bar, or persistent screen hierarchy
- the closest equivalent to "screens" is a small set of terminal modes and printed output surfaces:
  - startup and authorization prompts
  - the main REPL prompt
  - `chat_with_peer` in-chat mode
  - one-shot printed outputs like `dialog_list`, `history`, `contact_list`, `user_info`, and `help`
- media handling is mostly command-driven with external viewer handoff rather than an inline gallery or native viewer surface
- secret chat and group management are exposed as explicit verbs, not as dedicated settings pages

### Why it matters

`tg` is not a UI architecture reference for EmberChamber mobile. It is still useful as a contrast case:

- it shows how much navigation, discoverability, and context modern mobile chat apps actually provide beyond raw messaging verbs
- it reinforces that explicit operational boundaries are good, but command-only interaction is the wrong fit for EmberChamber's Android-first beta
- it is a reminder that "feature complete" interaction can still feel structurally thin if state, history, and media are treated as one-shot outputs rather than durable surfaces

### Practical takeaway for EmberChamber

- borrow the idea of explicit actions and narrowly scoped operations
- reject the idea of replacing persistent list or thread surfaces with one-shot outputs
- keep media, history, profile, and group-management flows visible and stateful in the app shell rather than delegating them to generic external handling
- treat this repo as a contrast reference, not an implementation template

## Telegram Desktop findings

### What stands out

- Telegram Desktop is built as a pane-based workspace rather than a single-screen stack.
- the core session controller manages a left dialogs column, a center chat column, and an optional third details column
- the shell can also move some content into separate windows instead of forcing everything into one frame
- `history_widget` treats the conversation pane as a layered workspace with search-in-chat, rich composer tools, pinned bars, reply UI, voice record controls, and more
- the right-side info pane is a real secondary surface for profile, media, and members, not a static profile card
- calls, media viewing, Instant View, and some chats or topics can live in detached windows or popup-style surfaces
- desktop interaction relies heavily on context menus, selection actions, and pane-local modes rather than only top-level navigation

### Why it matters

Telegram Desktop is not a phone-navigation reference, but it is useful for EmberChamber in two ways:

- it reinforces that the product can be organized around a few durable primary surfaces with secondary detail surfaces layered around them
- it gives better reference material for future tablet, foldable, desktop, and web-secondary layouts than the Android apps do

### Practical takeaway for EmberChamber

- keep the current phone shell simple, but leave room for an optional detail pane on larger screens later
- treat rich media viewer, calls UI, and some management flows as candidates for dedicated surfaces when complexity justifies it
- use context actions and search modes deliberately, but do not let mobile flows become desktop-style menu mazes
- treat Telegram Desktop as a larger-screen layout and interaction reference, not as the main mobile architecture template

## Outside review synthesis

An additional outside review of the Telegram Android UI surfaced a useful screen-level interpretation of the same codebase:

- `LaunchActivity` behaves as a router and state-restoration shell, not just a splash screen.
- the signed-in app is organized around a tab shell rather than a flat page list
- the user lives mostly inside a small set of high-frequency surfaces:
  - chats or inbox
  - conversation thread
  - contacts or picker
  - calls
  - profile
  - settings
- many Telegram screens are mode-sensitive and reused for multiple jobs instead of being duplicated
- the app leans heavily on stacked fragments, overlays, drawers, and secondary panels instead of full hard page swaps

### What this reinforces

- Telegram's speed and continuity come partly from restoring navigation state aggressively.
- Telegram's main productivity surfaces are dense list screens backed by reusable cells and screen shells.
- Telegram's chat screen is only one part of the system. The navigation shell and state restore logic are just as important to the product feel.
- Reusing one screen in multiple modes, especially for contacts, lists, and pickers, reduces duplication while preserving native behavior.

## Telegram Desktop outside review synthesis

An additional outside review of Telegram Desktop's current source reinforces the pane-based nature of the desktop client:

- the signed-in app is a workspace with left chats, center conversation, and optional right details pane
- many important surfaces are detached or layered instead of inline:
  - media viewer
  - call UI
  - Instant View
  - popup boxes
  - separate chat or topic windows
- the desktop client leans heavily on context menus, search modes, and pane-local actions
- the settings hub is a category launcher rather than a flat preferences screen

### What this reinforces

- Telegram Desktop is strongest as a reference for larger-screen layout evolution, not for current phone-first shell decisions.
- A right-side details surface can be powerful when it stays subordinate to the main chat workflow.
- Detached media, call, and reader surfaces are useful patterns when a feature outgrows inline treatment.
- Dense context menus work on desktop because of pointer and keyboard affordances; mobile should borrow the action taxonomy, not the interaction model.

## EmberChamber mobile baseline

Current `apps/mobile` observations from this repo:

- `App.tsx` is currently the main orchestration point for session state, group state, thread state, device-link state, invite state, and relay calls.
- `src/lib/db.ts` already gives EmberChamber a useful local SQLite foundation for cached memberships, cached messages, conversation preferences, privacy defaults, and vault media records.
- `src/screens/ChatListScreen.tsx` currently renders the chat list with `ScrollView`, which is acceptable for a scaffold but not a good long-term choice for a growing encrypted inbox.
- `src/screens/ConversationScreen.tsx` currently auto-scrolls to the end whenever row count changes. That is simple, but it will get brittle as mailbox sync, unread jumps, and history paging get more complex.
- `src/components/MessageBubble.tsx` currently owns attachment open flow inline, including download, decrypt, file write, and viewer launch behavior.

## Research takeaways for EmberChamber

### Ideas worth adopting

- Split the mobile app into explicit state or service boundaries:
  - session and auth
  - conversations and unread state
  - thread or mailbox sync
  - attachments and media cache
  - navigation and screen state
- Replace eager list rendering with virtualized list infrastructure.
- Add deliberate scroll-position preservation and anchor handling.
- Move attachment lifecycle into a dedicated module instead of handling it in message UI.
- Make local persistence the primary source for chat previews and cached thread rendering.
- Build reusable mobile screen infrastructure so settings, chat list, thread, and future device-management surfaces do not each re-solve insets, scroll restore, and loading states differently.
- Treat navigation as a real subsystem with restoration rules, not just screen toggles inside the root app component.
- Prefer mode-driven reusable surfaces over one-off screens when flows are structurally similar.
- Give each top-level signed-in surface a clear primary action model instead of routing every action back through the root screen.
- Treat list screens as first-class infrastructure with shared scroll-to-top and restoration behavior, not as one-off `FlatList` wrappers.
- Keep explicit operational actions available, but attach them to durable mobile surfaces rather than command-only interaction.
- Leave room for larger-screen split-view evolution without forcing the phone shell to mimic desktop panes today.
- Use dedicated surfaces for media viewing and other dense flows when inline UI starts carrying too much state.

### Ideas worth rejecting

- Do not import Telegram's product assumptions:
  - phone-number identity
  - public discovery
  - cloud-first history
  - very large groups or channels
  - monetization and bot ecosystems
- Do not port Java singleton and event-bus patterns literally into Expo or React Native.
- Do not copy Telegram's UI density or feature sprawl. EmberChamber needs clearer flows and stronger boundaries.

## Bottom line

The best inspiration from these repos is not "build a smaller Telegram."

The better direction is:

- borrow Telegram Android's subsystem discipline
- borrow Telegram X's cleaner controller layering
- use `tg` only as a reminder of what a command-complete but low-context messaging surface looks like
- use Telegram Desktop as a larger-screen layout and detached-surface reference, not a phone-shell reference
- adapt those lessons to EmberChamber's much smaller, more private, local-first beta surface

## Sources

- Telegram Android repo:
  - `https://github.com/DrKLO/Telegram`
- Telegram Android source areas reviewed:
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/MessagesStorage.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/MessagesController.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/NotificationCenter.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/ImageLoader.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/messenger/FileLoader.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/ui/Adapters/DialogsAdapter.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/ui/Components/RecyclerListView.java`
  - `https://github.com/DrKLO/Telegram/blob/master/TMessagesProj/src/main/java/org/telegram/ui/ChatActivity.java`
- Telegram X repo:
  - `https://github.com/TGX-Android/Telegram-X`
- Telegram X source areas reviewed:
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/MainActivity.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/ui/MainController.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/navigation/NavigationController.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/telegram/TdlibManager.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/ui/ChatsController.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/ui/RecyclerViewController.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/ui/MessagesController.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/component/chat/MessagesManager.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/component/dialogs/ChatsAdapter.java`
  - `https://github.com/TGX-Android/Telegram-X/blob/main/app/src/main/java/org/thunderdog/challegram/component/chat/MessagesAdapter.java`
- tg / telegram-cli repo:
  - `https://github.com/vysheng/tg`
- tg / telegram-cli source areas reviewed:
  - `https://github.com/vysheng/tg/blob/master/README.md`
- Telegram Desktop repo:
  - `https://github.com/telegramdesktop/tdesktop`
