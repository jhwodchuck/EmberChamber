# EmberChamber Operator Playbook

## Purpose

This playbook defines how the beta should be operated while EmberChamber is still focused on
invite-only intimate-media groups and trusted circles.

## Invite issuance

- Treat every group invite as deliberate access, not as a generic growth loop.
- Default invite settings:
  - `maxUses`: 12 or lower
  - `expiresInHours`: 72 or lower
  - `allowMemberInvites`: off unless the group owner explicitly opens it up
- Ask hosts to set a join rule before the first invite is shared.
- Revoke invites immediately if the group boundary changes or the invite link leaks.

## Compromised-device response

- Ask the user which device label is still trusted.
- Revoke any unfamiliar or stale sessions from the companion settings surface.
- If all devices are lost, force a fresh magic-link bootstrap and treat the account as a new
  device identity until a recovery flow ships.
- Tell affected group owners to review current invite links and rotate any sensitive group links.

## Leak-report escalation

- Require disclosure-based evidence only. Do not ask for unrelated history.
- Ask reporters to include:
  - the invite path they used
  - the group involved
  - the specific message or attachment ids they are disclosing
  - whether the issue is a leak, impersonation, coercion, or extortion
- Revoke the relevant invite immediately if the report suggests the boundary is compromised.
- Remove the reported account from affected groups if the evidence is credible and time-sensitive.

## Non-consensual-sharing response

- Prioritize reports with `non_consensual_intimate_media`, `coercion_or_extortion`, or
  `underage_risk`.
- Revoke all active sessions for the reported account when the evidence indicates immediate harm.
- Revoke outstanding group invites tied to the affected space.
- Preserve the disclosed evidence payload and report id for follow-up review.
- Do not market or describe the platform as a shield against lawful abuse response.

## Beta communication defaults

- Keep public language discreet and privacy-first.
- Keep in-product safety language explicit about consent, invite boundaries, and private-vault
  handling.
- Do not frame the product as anonymous, uncensorable, or law-proof.
