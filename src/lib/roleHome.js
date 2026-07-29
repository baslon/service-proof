// Where each role lands when there's no more specific destination in mind.
// This lived in three places at once - the login redirect, the role guard,
// and password setup - and the password-setup copy was the one that forgot
// admins existed, sending every newly invited admin to the field view.
export const ROLE_HOME = { admin: '/dashboard', operative: '/submit' }

export function homeFor(role) {
  return ROLE_HOME[role] || '/'
}
