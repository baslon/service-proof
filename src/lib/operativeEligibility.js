// An operative with no client links is unrestricted — available for every
// client, matching how the app behaved before client scoping existed, so
// nobody becomes unassignable just because nobody got around to linking
// them yet. Only a non-empty list narrows them down to those clients.
export function isOperativeEligibleFor(operative, clientId) {
  return operative.active && (operative.clientIds.length === 0 || operative.clientIds.includes(clientId))
}
