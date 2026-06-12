import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.username) redirect("/onboarding");

  return (
    <ProfileForm
      initial={{
        username: user.username,
        displayName: user.display_name ?? "",
        bio: user.bio,
        avatarUrl: user.avatar_url,
        product: user.spotify_product,
      }}
    />
  );
}
