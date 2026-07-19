import Link from "next/link";
import { ChatWindow } from "@/components/ChatWindow";
import { CustomCompanionChat } from "@/components/CustomCompanionChat";
import { getCharacter } from "@/lib/characters";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = getCharacter(id);

  // Custom companions live in localStorage — client loader
  if (!character) {
    return <CustomCompanionChat id={id} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 border-b border-card-border px-3 py-1.5 text-xs text-muted md:hidden">
        <Link
          href="/app/characters"
          className="inline-flex min-h-10 items-center font-medium text-accent-soft"
        >
          ← Companions
        </Link>
        <Link
          href={`/app/companions/${character.id}`}
          className="min-h-10 content-center text-muted"
        >
          Profile
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatWindow character={character} />
      </div>
    </div>
  );
}
