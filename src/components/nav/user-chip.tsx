import { LogOut } from "lucide-react";
import { getHousehold } from "@/lib/household";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { PersonDot } from "@/components/person-dot";

export async function UserChip() {
  const { me } = await getHousehold();
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 text-sm">
        <PersonDot profile={me} />
        <span className="font-medium">{me.name}</span>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
