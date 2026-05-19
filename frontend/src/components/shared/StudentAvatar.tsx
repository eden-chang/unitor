/**
 * Avatar with image fallback to initials.
 *
 * Uses ``getProfileImageUrl`` to look up the static placeholder image
 * under ``public/profile_images/``. Real avatars from Cloudflare R2 will
 * land in stage 2+ alongside file uploads.
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials, getProfileImageUrl } from "@/lib/avatar";

interface StudentAvatarProps {
  name: string;
  size?: string;
  textSize?: string;
}

export function StudentAvatar({
  name,
  size = "size-9",
  textSize = "text-[11px]",
}: StudentAvatarProps) {
  const url = getProfileImageUrl(name);
  const init = getInitials(name);
  return (
    <Avatar className={size}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className={cn("bg-gray-200 text-gray-500 font-bold", textSize)}>
        {init}
      </AvatarFallback>
    </Avatar>
  );
}
