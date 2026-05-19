/**
 * Helpers for displaying student / user avatars.
 *
 * The prototype ships a fixed set of placeholder images under
 * ``public/profile_images/``. Real avatars (Cloudflare R2) replace this
 * lookup once file uploads land (stage 2+).
 */

export function getInitials(name: string): string {
  if (!name) return "ME";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const PROFILE_IMAGES = new Set([
  "Jesse Nguyen",
  "Priya Sharma",
  "Marcus Lee",
  "Aisha Khan",
  "Tom Chen",
  "David Park",
  "Lisa Wang",
  "Omar Ali",
  "Sofia Rodriguez",
  "Wei Zhang",
  "Elena Popov",
  "Kai Tanaka",
  "Nina Okafor",
  "Liam Foster",
]);

export function getProfileImageUrl(name: string): string | null {
  if (PROFILE_IMAGES.has(name)) {
    return `/unitor-demo/profile_images/${name}.png`;
  }
  return null;
}
